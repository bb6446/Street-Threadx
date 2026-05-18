import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  where, 
  serverTimestamp, 
  Timestamp,
  updateDoc,
  getDoc,
  limit
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../firebase';
import { ChatMessage, ChatSession } from '../types';

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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let authPromise: Promise<any> | null = null;
async function ensureAuth(retries = 3) {
  if (auth.currentUser) return auth.currentUser;
  if (authPromise) return authPromise;

  authPromise = (async () => {
    for (let i = 0; i < retries; i++) {
      try {
        const result = await signInAnonymously(auth);
        return result.user;
      } catch (error: any) {
        const isNetworkError = error?.code === 'auth/network-request-failed';
        if (isNetworkError && i < retries - 1) {
          const delay = Math.pow(2, i) * 1000;
          console.warn(`StreetThreadX: Auth Network error. Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        if (error.code === 'auth/admin-restricted-operation') {
          console.warn("StreetThreadX: Anonymous auth restricted by project policy.");
        } else if (error.code === 'auth/operation-not-allowed') {
          console.warn("StreetThreadX: Anonymous auth disabled in Firebase console.");
        } else {
          console.error("Auth Error:", error);
        }
        return null;
      }
    }
    return null;
  })();
  
  const finalUser = await authPromise;
  authPromise = null;
  return finalUser;
}

export const chatService = {
  // Start or get a session by email
  async getOrCreateSession(email: string, name: string): Promise<string> {
    const user = await ensureAuth();
    const sessionId = email.replace(/[.@]/g, '_');
    const sessionRef = doc(db, 'chatSessions', sessionId);
    
    try {
      let docSnap;
      let retries = 3;
      while (retries > 0) {
        try {
          docSnap = await getDoc(sessionRef);
          break;
        } catch (error: any) {
          const isOffline = error?.message?.includes('offline') || error?.code === 'unavailable';
          if (isOffline && retries > 1) {
            console.warn(`StreetThreadX: Firestore offline/unavailable. Retrying... (${retries-1} left)`);
            retries--;
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
          handleFirestoreError(error, OperationType.GET, `chatSessions/${sessionId}`);
          return sessionId;
        }
      }

      if (!docSnap || !docSnap.exists()) {
        await setDoc(sessionRef, {
          id: sessionId,
          customerName: name,
          customerEmail: email,
          userId: user?.uid || null,
          status: 'ACTIVE',
          lastMessage: '',
          lastTimestamp: new Date().toISOString(),
          isPresenceActive: true,
          lastPresenceUpdate: new Date().toISOString()
        });
      } else {
        // Update presence when re-joining
        await updateDoc(sessionRef, {
          isPresenceActive: true,
          lastPresenceUpdate: new Date().toISOString()
        });
      }
      return sessionId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chatSessions/${sessionId}`);
      return sessionId;
    }
  },

  async sendMessage(sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) {
    const user = await ensureAuth();
    if (!user && !message.isAdmin) {
      console.warn("Cannot send message: Not authenticated");
      return;
    }

    const messagesRef = collection(db, 'chatSessions', sessionId, 'messages');
    const sessionRef = doc(db, 'chatSessions', sessionId);
    
    const timestamp = new Date().toISOString();
    const newMessage: any = {
      senderId: message.senderId,
      senderName: message.senderName,
      text: message.text || "...",
      isAdmin: message.isAdmin,
      timestamp
    };

    if (message.image) {
      newMessage.image = message.image;
    }

    try {
      await addDoc(messagesRef, newMessage);
      await updateDoc(sessionRef, {
        lastMessage: message.text || "...",
        lastTimestamp: timestamp,
        isPresenceActive: true,
        lastPresenceUpdate: timestamp
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chatSessions/${sessionId}/messages`);
    }
  },

  subscribeToSession(sessionId: string, callback: (session: ChatSession | null) => void) {
    let unsubscribe = () => {};
    ensureAuth().then((user) => {
      if (!user) {
        console.warn("Cannot subscribe to session: Not authenticated");
        return;
      }
      const sessionRef = doc(db, 'chatSessions', sessionId);
      unsubscribe = onSnapshot(sessionRef, (docSnap) => {
        if (docSnap.exists()) {
          callback({ id: docSnap.id, ...docSnap.data(), messages: [] } as ChatSession);
        } else {
          callback(null);
        }
      }, (error) => {
        // Don't throw for guests who haven't initialized yet
        console.warn("Session subscription warning:", error.message);
      });
    });
    return () => unsubscribe();
  },

  subscribeToMessages(sessionId: string, callback: (messages: ChatMessage[]) => void) {
    let unsubscribe = () => {};
    ensureAuth().then((user) => {
      if (!user) {
        console.warn("Cannot subscribe to messages: Not authenticated");
        return;
      }
      const messagesRef = collection(db, 'chatSessions', sessionId, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'));

      unsubscribe = onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
        callback(messages);
      }, (error) => {
        // If the parent session doesn't exist yet, we'll get a permission error in strict rules.
        // We should handle this more gracefully to avoid console noise for uninitialized chats.
        if (error.message.includes('insufficient permissions')) {
          console.warn("Chat Messages sync: insufficient permissions (likely session not yet created)");
          callback([]);
          return;
        }
        handleFirestoreError(error, OperationType.LIST, `chatSessions/${sessionId}/messages`);
      });
    });
    return () => unsubscribe();
  },

  subscribeToSessions(callback: (sessions: ChatSession[]) => void) {
    let unsubscribe = () => {};
    ensureAuth().then(() => {
      const adminEmails = ['biplobnbc04@gmail.com', 'parvesvai00@gmail.com'];
      const userEmail = auth.currentUser?.email;
      
      // In a real app, we would use custom claims or a database check.
      // For this app, we check against the known admin emails or if NOT anonymous.
      // However, Firestore rules will ultimately decide.
      const isClearlyNotAdmin = !auth.currentUser || 
                                (auth.currentUser.isAnonymous) || 
                                (userEmail && !adminEmails.includes(userEmail));

      if (isClearlyNotAdmin) {
        console.warn("StreetThreadX: Admin list attempt by non-admin. Showing empty.");
        callback([]);
        return;
      }
      
      const sessionsRef = collection(db, 'chatSessions');
      const q = query(sessionsRef, orderBy('lastTimestamp', 'desc'));

      unsubscribe = onSnapshot(q, (snapshot) => {
        const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), messages: [] } as ChatSession));
        callback(sessions);
      }, (error) => {
        if (error.message.includes('insufficient permissions')) {
          console.warn("Admin Chat Sessions sync: insufficient permissions");
          callback([]);
          return;
        }
        handleFirestoreError(error, OperationType.LIST, 'chatSessions');
      });
    });
    return () => unsubscribe();
  },

  async updatePresence(sessionId: string, isActive: boolean) {
    const sessionRef = doc(db, 'chatSessions', sessionId);
    try {
      await updateDoc(sessionRef, {
        isPresenceActive: isActive,
        lastPresenceUpdate: new Date().toISOString()
      });
    } catch (error) {
      // Ignore presence update errors to prevent crashing
      console.warn("Presence update failed", error);
    }
  },

  async closeSession(sessionId: string) {
    const sessionRef = doc(db, 'chatSessions', sessionId);
    try {
      await updateDoc(sessionRef, {
        status: 'CLOSED',
        isPresenceActive: false
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `chatSessions/${sessionId}`);
    }
  }
};
