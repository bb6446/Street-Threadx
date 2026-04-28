
import { collection, onSnapshot, doc, updateDoc, setDoc, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Product } from '../types';
import { MOCK_PRODUCTS } from '../constants';

/**
 * Real-time Product Service
 * Handles Firestore synchronization for products and inventory.
 */

export const subscribeToProducts = (callback: (products: Product[]) => void) => {
  const q = query(collection(db, 'products'));
  
  return onSnapshot(q, (snapshot) => {
    const products: Product[] = [];
    snapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() } as Product);
    });
    
    if (products.length > 0) {
      callback(products);
    } else {
      // If Firestore is empty, we might want to seed it or just return empty
      // For this app, let's auto-seed if empty to ensure a good initial experience
      seedProductsIfEmpty();
    }
  }, (error) => {
    console.error("Firestore Product Sync Error:", error);
  });
};

export const updateProductStock = async (productId: string, newStock: number) => {
  try {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      stock: newStock,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error updating product stock:", error);
    throw error;
  }
};

export const updateProductPrice = async (productId: string, newPrice: number) => {
  try {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, {
      price: newPrice,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error updating product price:", error);
    throw error;
  }
};

export const saveProductToFirestore = async (product: Product) => {
  try {
    const productRef = doc(db, 'products', product.id);
    await setDoc(productRef, {
      ...product,
      updatedAt: new Date().toISOString()
    });
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
    await updateDoc(productRef, { status: 'Draft' }); // Soft delete/unpublish for safety if you prefer
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
    const querySnapshot = await getDocs(collection(db, 'products'));
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
