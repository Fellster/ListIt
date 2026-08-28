import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/calendar');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');
googleProvider.setCustomParameters({ prompt: 'consent select_account' });

// Ensure persistence
try {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    // Ignore in unsupported environments
  });
} catch (e) {
  console.warn('Auth persistence init note:', e);
}

// Pass custom database ID if present in config
const configAny = firebaseConfig as any;
export const db = configAny.firestoreDatabaseId && configAny.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, configAny.firestoreDatabaseId)
  : getFirestore(app);

// Enable offline persistence where supported
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time.
    } else if (err.code === 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence
    }
  });
} catch {
  // Ignore
}

export default app;
