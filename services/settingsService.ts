
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { SocialSettings, SecretValues } from '../types';

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

const SETTINGS_DOC_ID = 'app_settings';
const SECRETS_DOC_ID = 'app_secrets';

export const settingsService = {
  async getSettings(): Promise<SocialSettings | null> {
    const path = `config/${SETTINGS_DOC_ID}`;
    try {
      const docRef = doc(db, 'config', SETTINGS_DOC_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as SocialSettings;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async saveSettings(settings: SocialSettings): Promise<void> {
    const path = `config/${SETTINGS_DOC_ID}`;
    try {
      const docRef = doc(db, 'config', SETTINGS_DOC_ID);
      await setDoc(docRef, settings, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  subscribeToSettings(onUpdate: (settings: SocialSettings) => void) {
    const path = `config/${SETTINGS_DOC_ID}`;
    const docRef = doc(db, 'config', SETTINGS_DOC_ID);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as SocialSettings);
      }
    }, (error) => {
      // For public settings, we might want to fail gracefully if the doc doesn't exist or permissions fail
      if (error.message.includes('insufficient permissions')) {
        console.warn("Settings sync: insufficient permissions for app_settings");
        return;
      }
      handleFirestoreError(error, OperationType.GET, path);
    });
  },

  async getSecrets(): Promise<SecretValues | null> {
    const path = `config/${SECRETS_DOC_ID}`;
    if (!auth.currentUser) {
      return null;
    }
    try {
      // NOTE: This is generally insecure in a real production app to fetch all secrets at once on client side.
      // But for this AI Studio applet, we are implementing what the user requested.
      // In a real app, this should be server-side only.
      const docRef = doc(db, 'config', SECRETS_DOC_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as SecretValues;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async saveSecrets(secrets: SecretValues): Promise<void> {
    const path = `config/${SECRETS_DOC_ID}`;
    try {
      const docRef = doc(db, 'config', SECRETS_DOC_ID);
      await setDoc(docRef, secrets, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};
