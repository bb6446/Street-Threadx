
import { collection, onSnapshot, doc, updateDoc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from '../types';
import { MOCK_PRODUCTS } from '../constants';
import { supabase } from '../supabase';

/**
 * Real-time Product Service
 * Handles Firestore or Supabase synchronization for products and inventory.
 */

export const subscribeToProducts = (callback: (products: Product[]) => void, isAdmin: boolean = false) => {
  // If Supabase is available and configured, we can use it for SQL storage
  // Note: Supabase JS library doesn't have a direct 'onSnapshot' equivalent for simple entire table sync in the same way,
  // but we can use real-time listeners. For simplicity, we'll implement a fetch + listener or stick to Firestore as primary 
  // until the user fully migrates. 
  
  // Checking if user wants to use SQL (Supabase)
  const useSQL = !!supabase;

  if (useSQL) {
    // Initial fetch
    fetchProductsSupabase(isAdmin).then(callback);
    
    // Subscribe to changes
    const channel = supabase
      .channel('public:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
        const updatedProducts = await fetchProductsSupabase(isAdmin);
        callback(updatedProducts);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Fallback to Firestore
  const q = isAdmin 
    ? query(collection(db, 'products'))
    : query(collection(db, 'products'), where('status', '==', 'Published'));
  
  let isSeeding = false;
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty && !isSeeding && !isAdmin) {
      isSeeding = true;
      seedProductsIfEmpty();
      return;
    }
    
    const products: Product[] = [];
    snapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() } as Product);
    });
    
    callback(products);
  }, (error) => {
    if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
       // Ignore expected errors until verified
    }
    console.error("Firestore Product Sync Error:", error);
  });
};

const fetchProductsSupabase = async (isAdmin: boolean = false) => {
  if (!supabase) return [];
  
  let query = supabase.from('products').select('*');
  if (!isAdmin) {
    query = query.eq('status', 'Published');
  }
  
  const { data, error } = await query;
  if (error) {
    console.error('Supabase fetch error:', error);
    return [];
  }
  
  return data.map((p: any) => ({
    ...p,
    id: p.id,
    price: Number(p.base_price),
    stock: p.stock_level,
    images: p.images || [],
    sizes: p.size ? [p.size] : ['M'],
    colors: p.color ? [p.color] : ['Black'],
    category: p.category || 'T-Shirts',
    status: p.status || 'Published'
  })) as Product[];
};

export const updateProductStock = async (productId: string, newStock: number) => {
  if (supabase) {
    const { error } = await supabase
      .from('products')
      .update({ stock_level: newStock, updated_at: new Date().toISOString() })
      .eq('id', productId);
    if (error) throw error;
    return;
  }

  try {
    const productRef = doc(db, 'products', productId);
    await setDoc(productRef, {
      stock: newStock,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Error updating product stock:", error);
    throw error;
  }
};

export const updateProductPrice = async (productId: string, newPrice: number) => {
  try {
    const productRef = doc(db, 'products', productId);
    await setDoc(productRef, {
      price: newPrice,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error("Error updating product price:", error);
    throw error;
  }
};

export const saveProductToFirestore = async (product: Product) => {
  try {
    const productRef = doc(db, 'products', product.id);
    const now = new Date().toISOString();
    await setDoc(productRef, {
      ...product,
      createdAt: product.createdAt || now,
      updatedAt: now
    }, { merge: true });
  } catch (error) {
    console.error("Error saving product to Firestore:", error);
    throw error;
  }
};

export const deleteProductFromFirestore = async (productId: string) => {
  try {
    const productRef = doc(db, 'products', productId);
    // Note: In some apps, you might want a soft delete. 
    // Here we'll do real delete for simplicity or set status to deleted.
    await setDoc(productRef, { status: 'Draft', updatedAt: new Date().toISOString() }, { merge: true }); // Soft delete/unpublish for safety if you prefer
    // await deleteDoc(productRef); // Hard delete
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
};

export const updateProductsBulk = async (productIds: string[], updates: Partial<Product>) => {
  // Firestore doesn't have a bulk update by query in the client SDK like SQL.
  // We should use a writeBatch for atomicity and efficiency.
  try {
    const { writeBatch } = await import('firebase/firestore');
    const batch = writeBatch(db);
    
    productIds.forEach(id => {
      const ref = doc(db, 'products', id);
      batch.update(ref, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    });
    
    await batch.commit();
  } catch (error) {
    console.error("Bulk update failed:", error);
    throw error;
  }
};

export const seedProductsIfEmpty = async () => {
  try {
    const querySnapshot = await getDocs(query(collection(db, 'products')));
    if (querySnapshot.empty) {
      console.log("Seeding Firestore with MOCK_PRODUCTS...");
      for (const product of MOCK_PRODUCTS) {
        await setDoc(doc(db, 'products', product.id), product);
      }
    }
  } catch (error) {
    console.error("Error seeding products:", error);
  }
};
