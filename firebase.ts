// firebase.ts
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  GoogleAuthProvider, 
  FacebookAuthProvider, 
  signInWithPopup, 
  signOut, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  setPersistence, 
  browserSessionPersistence, 
  ConfirmationResult,
  browserPopupRedirectResolver
} from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseAppletConfig from './firebase-applet-config.json';

// Use the provisioned config directly.
const firebaseConfig = {
  ...firebaseAppletConfig
};

const app = initializeApp(firebaseConfig);

// CRITICAL: Initialize Auth with explicit persistence and resolver for iframe support
export const auth = initializeAuth(app, {
  persistence: [browserLocalPersistence, indexedDBLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver
});

// CRITICAL: Initialize Firestore with forced longPolling and disabled fetch streams 
// to ensure connectivity in locked-down or proxied environments like iframes.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: false,
  ignoreUndefinedProperties: true
}, (firebaseConfig as any).firestoreDatabaseId || '(default)');

// Recaptcha and Other Providers
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

export const signInWithGoogle = async () => {
  try {
    // Explicitly use the resolver in the call for better iframe support
    const result = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      console.error("Google Sign-In: Popup closed by user. This can happen if the window is closed manually, blocked by a browser extension, or due to iframe restrictions.");
    } else if (error.code === 'auth/popup-blocked') {
      console.error("Google Sign-In: Popup was blocked by the browser. Please allow popups for this site.");
    } else {
      console.error("Google Sign-In Error", error);
    }
    throw error;
  }
};

export const signInWithFacebook = async () => {
  try {
    // Explicitly use the resolver in the call for better iframe support
    const result = await signInWithPopup(auth, facebookProvider, browserPopupRedirectResolver);
    return result.user;
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
       console.error("Facebook Sign-In: Popup closed by user.");
    } else {
      console.error("Facebook Sign-In Error Details:", {
        code: error.code,
        message: error.message,
        customData: error.customData
      });
    }
    throw error;
  }
};

export const setupRecaptcha = (containerId: string) => {
  if (!(window as any).recaptchaVerifier) {
    (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      'size': 'invisible',
      'callback': () => {
        // reCAPTCHA solved
      }
    });
  }
  return (window as any).recaptchaVerifier;
};

export const signInWithPhone = async (phoneNumber: string, appVerifier: any): Promise<ConfirmationResult> => {
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    return confirmationResult;
  } catch (error) {
    console.error("Phone Sign-In Error", error);
    throw error;
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error", error);
    throw error;
  }
};
