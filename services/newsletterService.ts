import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { NewsletterSubscription } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const isNetworkOrOffline = 
    errMsg.includes('offline') || 
    errMsg.includes('Could not reach Cloud Firestore backend') || 
    errMsg.includes('unavailable') || 
    error?.code === 'unavailable' || 
    error?.code === 'failed-precondition';

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error details:', JSON.stringify(errInfo));

  if (isNetworkOrOffline) {
    console.warn(`Firestore network or offline state bypassed safely in ${operationType} on ${path}.`);
    return;
  }
  
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Service to handle customer newsletter subscriptions
 */
export const newsletterService = {
  /**
   * Subscribes an email to the 'newsletters' collection.
   */
  async subscribeEmail(email: string): Promise<{ success: boolean; message: string; alreadySubscribed?: boolean }> {
    const trimmedEmail = email.trim().toLowerCase();
    
    // Basic email regex pattern matching
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { success: false, message: 'Please enter a valid e-mail address.' };
    }

    try {
      // Step 1: Check existing subscription
      let querySnapshot;
      try {
        const q = query(collection(db, 'newsletters'), where('email', '==', trimmedEmail));
        querySnapshot = await getDocs(q);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'newsletters');
        throw err;
      }

      if (!querySnapshot.empty) {
        const foundDoc = querySnapshot.docs[0];
        const subscriptionData = foundDoc.data();
        
        if (subscriptionData.status === 'active') {
          return { 
            success: true, 
            message: 'You are already subscribed to our marketing newsletter list!', 
            alreadySubscribed: true 
          };
        } else {
          // Re-subscribe if unsubscribed
          try {
            await updateDoc(doc(db, 'newsletters', foundDoc.id), {
              status: 'active',
              subscribedAt: new Date().toISOString()
            });
            return {
              success: true,
              message: 'Welcome back! Your subscription has been active again.',
              alreadySubscribed: false
            };
          } catch (err) {
            handleFirestoreError(err, OperationType.UPDATE, `newsletters/${foundDoc.id}`);
            throw err;
          }
        }
      }

      // Step 2: Create new subscription
      try {
        await addDoc(collection(db, 'newsletters'), {
          email: trimmedEmail,
          subscribedAt: new Date().toISOString(),
          status: 'active'
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'newsletters');
        throw err;
      }

      return { 
        success: true, 
        message: 'Successfully subscribed! Thank you for joining STREET THREADX.' 
      };

    } catch (error: any) {
      console.error('Error in subscribeEmail:', error);
      return { 
        success: false, 
        message: 'Error handling your subscription. Please try again later.' 
      };
    }
  },

  /**
   * Retrieves all newsletter subscribers for marketing dashboard usage.
   */
  async getAllSubscribers(): Promise<NewsletterSubscription[]> {
    try {
      const querySnapshot = await getDocs(collection(db, 'newsletters'));
      const list: NewsletterSubscription[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          email: data.email || '',
          subscribedAt: data.subscribedAt || '',
          status: data.status || 'active'
        });
      });
      return list;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'newsletters');
      return [];
    }
  }
};
