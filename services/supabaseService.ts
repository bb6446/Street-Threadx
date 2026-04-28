/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only initialize if we have a valid URL
export const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http'))
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any;

// ==========================================
// Product Functions
// ==========================================

/**
 * Fetch all published products.
 */
export const fetchProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('status', 'Published');

  if (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
  return data;
};

// ==========================================
// Order Functions
// ==========================================

/**
 * Fetch the order history for a specific customer.
 * Includes the nested order items and product details.
 */
export const fetchCustomerOrders = async (customerId: string) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items (
        *,
        products (*)
      )
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching customer orders:', error);
    throw error;
  }
  return data;
};

export interface OrderItemInput {
  product_id: string;
  quantity: number;
  price: number;
}

/**
 * Create a new order and its corresponding order items.
 * Uses a Supabase RPC (Remote Procedure Call) to execute the inserts
 * and stock updates in a single database transaction.
 */
export const createOrder = async (
  customerId: string,
  subtotal: number,
  discount: number,
  totalAmount: number,
  shippingAddress: string,
  items: OrderItemInput[]
) => {
  // Using the RPC function for a transactional insert
  const { data, error } = await supabase.rpc('create_order', {
    p_customer_id: customerId,
    p_subtotal: subtotal,
    p_discount: discount,
    p_total_amount: totalAmount,
    p_shipping_address: shippingAddress,
    p_items: items
  });

  if (error) {
    console.error('Error creating order via RPC:', error);
    
    // Fallback to sequential inserts if RPC is not available
    console.log('Falling back to sequential inserts...');
    return createOrderSequential(customerId, subtotal, discount, totalAmount, shippingAddress, items);
  }

  return data; // Returns the new order ID
};

/**
 * Fallback method to insert an order and items sequentially.
 * Note: This is not transactional. If items fail to insert, the order will still exist.
 */
const createOrderSequential = async (
  customerId: string,
  subtotal: number,
  discount: number,
  totalAmount: number,
  shippingAddress: string,
  items: OrderItemInput[]
) => {
  // 1. Insert Order
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      subtotal,
      discount,
      total_amount: totalAmount,
      shipping_address: shippingAddress,
      status: 'pending'
    })
    .select()
    .single();

  if (orderError) {
    console.error('Error inserting order:', orderError);
    throw orderError;
  }

  const orderId = orderData.id;

  // 2. Insert Order Items
  const orderItemsToInsert = items.map(item => ({
    order_id: orderId,
    product_id: item.product_id,
    quantity: item.quantity,
    price_at_purchase: item.price
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItemsToInsert);

  if (itemsError) {
    console.error('Error inserting order items:', itemsError);
    throw itemsError;
  }

  return orderId;
};

// ==========================================
// Customer Functions
// ==========================================

/**
 * Fetch a customer's extended profile data.
 */
export const fetchCustomerProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching customer profile:', error);
    throw error;
  }
  return data;
};

/**
 * Update a customer's extended profile data.
 */
export const updateCustomerProfile = async (userId: string, updates: any) => {
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating customer profile:', error);
    throw error;
  }
  return data;
};
