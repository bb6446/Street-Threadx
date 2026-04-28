import { supabase } from '../supabase';
import { db } from '../firebase';
import { doc, runTransaction } from 'firebase/firestore';

/**
 * Senior Developer Persona Note:
 * When dealing with Point of Sale (POS) inventory, atomicity is non-negotiable.
 * Standard increments/decrements in parallel can lead to race conditions (overselling).
 * We use Transactions (Firestore) or RPC/Stored Procedures (Supabase/Postgres)
 * to ensure that stock levels are checked AND updated in a single atomic block.
 */

interface TransactionItem {
  productId: string;
  quantity: number;
}

/**
 * Deduct stock safely using Supabase RPC (Postgres)
 * This calls the 'create_order' function defined in our schema.sql
 */
export const deductStockSupabase = async (items: TransactionItem[]) => {
  try {
    const { data, error } = await supabase.rpc('deduct_inventory_atomic', {
      p_items: items
    });
    
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.error('Supabase Inventory Error:', err);
    throw err;
  }
};

/**
 * Deduct stock safely using Firebase Firestore Transactions
 */
export const deductStockFirebase = async (items: TransactionItem[]) => {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. Read all product docs first (Rule: Reads must come before Writes)
      const itemRefs = items.map(item => ({
        ref: doc(db, 'products', item.productId),
        quantity: item.quantity
      }));

      const itemSnapshots = await Promise.all(
        itemRefs.map(item => transaction.get(item.ref))
      );

      // 2. Validate availability and filter out missing ones
      const validItemRefs:any[] = [];
      itemSnapshots.forEach((snap, idx) => {
        if (!snap.exists()) {
          console.warn(`Product ${items[idx].productId} not found in Firestore. Skipping atomic deduction (using mock product?).`);
          return; // Skip this product
        }
        
        const currentStock = snap.data().stock || 0;
        const requested = items[idx].quantity;
        
        if (currentStock < requested) {
          throw new Error(`Insufficient stock for ${snap.data().name}. Current: ${currentStock}, Requested: ${requested}`);
        }

        validItemRefs.push({
          ref: itemRefs[idx].ref,
          newStock: currentStock - requested
        });
      });

      // 3. Perform the updates
      validItemRefs.forEach(({ ref, newStock }) => {
        transaction.update(ref, { 
          stock: newStock,
          updatedAt: new Date().toISOString()
        });
      });
    });

    return { success: true };
  } catch (err) {
    console.error('Firestore Inventory Transaction Failed:', err);
    throw err;
  }
};
