import { collection, onSnapshot, doc, setDoc, query, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Customer } from '../types';

export const subscribeToCustomers = (callback: (customers: Customer[]) => void, isAdmin: boolean = false) => {
  if (!isAdmin) {
    callback([]);
    return () => {};
  }
  const q = query(collection(db, 'customers'), orderBy('lastSeen', 'desc'));
  
  let isSeeding = false;
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty && !isSeeding) {
      isSeeding = true;
      seedCustomersIfEmpty();
      return;
    }
    
    const customers: Customer[] = [];
    snapshot.forEach((doc) => {
      customers.push({ id: doc.id, ...doc.data() } as Customer);
    });
    
    callback(customers);
  }, (error) => {
     console.error("Firestore Customer Sync Error:", error);
  });
};

export const saveCustomerToFirestore = async (customer: Customer) => {
  try {
    const customerRef = doc(db, 'customers', customer.id);
    await setDoc(customerRef, customer);
  } catch (error) {
    console.error("Error saving customer:", error);
    throw error;
  }
};

export const updateCustomer = async (customerId: string, data: Partial<Customer>) => {
  try {
    const customerRef = doc(db, 'customers', customerId);
    // Use setDoc with merge: true for robust upsert
    await setDoc(customerRef, data, { merge: true });
  } catch (error) {
    console.error("Error updating customer:", error);
    throw error;
  }
};

export const seedCustomersIfEmpty = async () => {
    const mockCustomers: Customer[] = [
      { id: '1', name: 'Jordan D.', email: 'jordan@example.com', totalSpent: 45000, orders: 4, lastSeen: new Date().toISOString() },
      { id: '2', name: 'Sarah K.', email: 'sarah@example.com', totalSpent: 12000, orders: 2, lastSeen: new Date().toISOString() },
      { id: '3', name: 'Mike R.', email: 'mike@example.com', totalSpent: 8500, orders: 1, lastSeen: new Date().toISOString() }
    ];
    for (const customer of mockCustomers) {
      await saveCustomerToFirestore(customer);
    }
};
