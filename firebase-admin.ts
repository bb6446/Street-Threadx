import { initializeApp, getApps, getApp, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import path from 'path';

export const getConfig = () => {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  return JSON.parse(readFileSync(configPath, 'utf8'));
};

let isInitialized = false;
let app: App | undefined;

try {
  if (!getApps().length) {
    const config = getConfig();

    // Attempt to initialize using default credentials (works nicely in GCP/Cloud Run if properly authorized)
    const bucketName = (config.storageBucket || `${config.projectId}.appspot.com`).replace('.firebasestorage.app', '.appspot.com');
    console.log("Initializing Firebase Admin with bucket:", bucketName);
    
    app = initializeApp({
      projectId: config.projectId,
      storageBucket: bucketName,
    });
    isInitialized = true;
    console.log("Firebase Admin initialized");
  } else {
    app = getApp();
    isInitialized = true;
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

export const adminDb = (isInitialized && app) ? getFirestore(app, getConfig().firestoreDatabaseId || '(default)') : null;
export const adminStorage = (isInitialized && app) ? getStorage(app) : null;
export const adminAuth = (isInitialized && app) ? getAuth(app) : null;
