
import { collection, onSnapshot, doc, setDoc, query, orderBy, deleteDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Order } from '../types';
import { supabase } from '../supabase';

export const subscribeToOrders = (callback: (orders: Order[]) => void, isAdmin: boolean = false, customerEmail: string = '') => {
  if (!isAdmin && !customerEmail) {
    callback([]);
    return () => {};
  }
  // If Supabase is available, we check it for orders
  if (supabase) {
    fetchOrdersSupabase(isAdmin, customerEmail).then(callback);
    
    const channel = supabase
      .channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
        const updatedOrders = await fetchOrdersSupabase(isAdmin, customerEmail);
        callback(updatedOrders);
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }

  let q;
  if (!isAdmin && customerEmail) {
    q = query(collection(db, 'orders'), where('customerEmail', '==', customerEmail));
  } else {
    q = query(collection(db, 'orders'), orderBy('date', 'desc'), orderBy('time', 'desc'));
  }
  
  let isSeeding = false;
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty && !isSeeding) {
      isSeeding = true;
      seedOrdersIfEmpty();
      return;
    }
    
    const orders: Order[] = [];
    snapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() } as Order);
    });
    
    callback(orders);
  }, (error) => {
     if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
       // Catch expected errors if permissions fail
     }
     console.error("Firestore Order Sync Error:", error);
  });
};

const fetchOrdersSupabase = async (isAdmin: boolean, customerEmail: string) => {
  if (!supabase) return [];
  if (!isAdmin && !customerEmail) return [];
  
  let q = supabase.from('orders').select('*, order_items(*)');
  if (!isAdmin && customerEmail) {
    // Only fetch for this customer if RLS isn't set up on supabase
    // q = q.eq('customerEmail', customerEmail);
  }
  const { data, error } = await q;
    
  if (error) {
    console.error('Supabase orders fetch error:', error);
    return [];
  }
  
  // Map SQL schema to Order type
  return data.map((o: any) => ({
    id: o.id,
    customerName: 'Customer', // Would fetch from customers table joined
    customerEmail: 'customer@example.com',
    total: Number(o.total_amount),
    subtotal: Number(o.subtotal),
    discount: Number(o.discount),
    date: o.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    time: o.created_at?.split('T')[1]?.substring(0, 5) || '00:00',
    status: o.status.toUpperCase(),
    items: o.order_items?.length || 0,
    orderItems: o.order_items || [],
    shippingAddress: o.shipping_address
  })) as Order[];
};

export const saveOrderToFirestore = async (order: Order) => {
  if (supabase) {
    // Preparing items for Supabase RPC
    const items = order.orderItems.map(item => ({
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price
    }));

    const { error } = await supabase.rpc('create_order', {
      p_customer_id: order.id, // Placeholder
      p_subtotal: order.subtotal,
      p_discount: order.discount,
      p_total_amount: order.total,
      p_shipping_address: order.shippingAddress,
      p_items: items
    });
    if (error) throw error;
    return;
  }

  try {
    const orderRef = doc(db, 'orders', order.id);
    await setDoc(orderRef, order);
  } catch (error) {
    console.error("Error saving order:", error);
    throw error;
  }
};

export const updateOrder = async (orderId: string, data: Partial<Order>) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await setDoc(orderRef, data, { merge: true });
  } catch (error) {
    console.error("Error updating order:", error);
    throw error;
  }
};

export const deleteOrderFromFirestore = async (orderId: string) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await deleteDoc(orderRef);
  } catch (error) {
    console.error("Error deleting order:", error);
    throw error;
  }
};

export const updateOrderStatus = async (orderId: string, status: string) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await setDoc(orderRef, { status }, { merge: true });
  } catch (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
};

export const seedOrdersIfEmpty = async () => {
    const mockOrders: Order[] = [
      { id: '1', customerName: 'Jordan D.', customerEmail: 'jordan@example.com', total: 45000, subtotal: 45000, discount: 0, date: new Date().toISOString().split('T')[0], time: '14:30', status: 'DELIVERED', items: 4, orderItems: [], shippingAddress: '123 Main St' },
      { id: '2', customerName: 'Sarah K.', customerEmail: 'sarah@example.com', total: 12000, subtotal: 12000, discount: 0, date: new Date().toISOString().split('T')[0], time: '10:15', status: 'SHIPPED', items: 2, orderItems: [], shippingAddress: '456 Oak Ave' },
      { id: '3', customerName: 'Mike R.', customerEmail: 'mike@example.com', total: 8500, subtotal: 8500, discount: 0, date: new Date().toISOString().split('T')[0], time: '16:45', status: 'PENDING', items: 1, orderItems: [], shippingAddress: '789 Pine Rd' }
    ];
    for (const order of mockOrders) {
      await saveOrderToFirestore(order);
    }
};
