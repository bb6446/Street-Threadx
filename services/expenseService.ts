import { collection, query, onSnapshot, doc, setDoc, deleteDoc, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Expense } from '../types';

const COLLECTION_NAME = 'expenses';

export const expenseService = {
  async saveExpense(expense: Expense): Promise<Expense> {
    const id = expense.id || doc(collection(db, COLLECTION_NAME)).id;
    const docRef = doc(db, COLLECTION_NAME, id);
    const updatedExpense = {
      ...expense,
      id,
      updatedAt: new Date().toISOString()
    };
    await setDoc(docRef, updatedExpense);
    return updatedExpense;
  },

  async deleteExpense(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  },

  subscribeToExpenses(callback: (expenses: Expense[]) => void, isAdmin: boolean = false) {
    if (!isAdmin) {
      callback([]);
      return () => {};
    }
    const q = query(collection(db, COLLECTION_NAME), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const expenses = snapshot.docs.map(doc => ({
        ...doc.data() as Expense,
        id: doc.id
      }));
      callback(expenses);
    });
  },

  async getAllExpenses(): Promise<Expense[]> {
    const q = query(collection(db, COLLECTION_NAME), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data() as Expense,
      id: doc.id
    }));
  }
};
