import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query 
} from 'firebase/firestore';
import { db } from '../firebase';
import { AdminUser } from '../types';

export const adminService = {
  subscribeToAdmins: (callback: (admins: AdminUser[]) => void) => {
    const q = query(collection(db, 'admins'));
    return onSnapshot(q, (snapshot) => {
      const admins = snapshot.docs.map(doc => ({
        ...doc.data()
      })) as AdminUser[];
      callback(admins);
    }, (error) => {
      console.error("Admins Subscription Error:", error);
    });
  },

  saveAdmin: async (admin: AdminUser) => {
    await setDoc(doc(db, 'admins', admin.id), admin);
  },

  deleteAdmin: async (adminId: string) => {
    await deleteDoc(doc(db, 'admins', adminId));
  }
};
