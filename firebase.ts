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
  browserPopupRedirectResolver,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
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

// Extract firestoreDatabaseId from the configuration safely
const firestoreDbId = 
  firebaseAppletConfig.firestoreDatabaseId || 
  (firebaseAppletConfig as any).default?.firestoreDatabaseId || 
  (firebaseConfig as any).firestoreDatabaseId || 
  '(default)';

console.log("Firestore initialization: Using database ID", firestoreDbId);

// CRITICAL: Initialize Firestore with forced longPolling and disabled fetch streams 
// to ensure connectivity in locked-down or proxied environments like iframes.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: false,
  useFetchStreams: false,
  ignoreUndefinedProperties: true
} as any, firestoreDbId);

// Recaptcha and Other Providers
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();

export const signUpWithEmail = async (email: string, pass: string, name: string) => {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  if (result.user) {
    await updateProfile(result.user, { displayName: name });
  }
  return result.user;
};

export const signInWithEmail = async (email: string, pass: string) => {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  return result.user;
};

export const signInWithGoogle = async () => {
  console.log("Google Sign-In sequence initiated via signInWithPopup");
  try {
    // Explicitly use the resolver in the call for better iframe support
    const result = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
    console.log("Google Sign-In success! Raw Firebase Auth UserCredential result:", result);
    
    // Access Google OAuth Access Token if available
    const credential = GoogleAuthProvider.credentialFromResult(result);
    console.log("Extracted Google Auth Credential Object:", credential);
    if (credential) {
      console.log("Google OAuth 2.0 Access Token:", credential.accessToken);
      console.log("Google OAuth 2.0 ID Token:", credential.idToken);
    }
    
    // Log authenticated user property details
    if (result.user) {
      console.log("Authenticated User Details:", {
        uid: result.user.uid,
        email: result.user.email,
        emailVerified: result.user.emailVerified,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        isAnonymous: result.user.isAnonymous,
        providerId: result.user.providerId
      });
      
      try {
        const idTokenResult = await result.user.getIdTokenResult();
        console.log("Firebase Auth User Token Claims and Details:", idTokenResult);
      } catch (tokenErr) {
        console.warn("Failed to retrieve extra IdTokenResult:", tokenErr);
      }
    }

    return result.user;
  } catch (error: any) {
    console.error("Google Sign-In failure caught in firebase.ts. Complete Error Object:", error);
    console.error("Error Code:", error?.code);
    console.error("Error Message:", error?.message);
    console.error("Error Email (if available from Google connection):", error?.email);
    console.error("Error Credential or Context (if available):", error?.credential);
    
    if (error.code === 'auth/popup-closed-by-user') {
      console.error("Google Sign-In: Popup closed by user. This can happen if the window is closed manually, blocked by a browser extension, or due to iframe restrictions.");
    } else if (error.code === 'auth/popup-blocked') {
      console.error("Google Sign-In: Popup was blocked by the browser. Please allow popups for this site.");
    } else {
      console.error("Google Sign-In Error details:", error);
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
  if ((window as any).recaptchaVerifier) {
    try {
      (window as any).recaptchaVerifier.clear();
    } catch (e) {
      console.warn("Error clearing old recaptcha verifier", e);
    }
    (window as any).recaptchaVerifier = null;
  }

  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = '';
  }

  (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    'size': 'invisible',
    'callback': () => {
      // reCAPTCHA solved
    }
  });
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
