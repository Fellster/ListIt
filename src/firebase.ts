import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  setLogLevel 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Silence transient retry and offline notices in sandboxed iframe environment
try {
  setLogLevel('silent');
} catch {
  // Ignore
}

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

// Pass custom database ID only if present and non-default
const configAny = firebaseConfig as any;
const customDbId = configAny.firestoreDatabaseId && configAny.firestoreDatabaseId !== '(default)'
  ? configAny.firestoreDatabaseId
  : undefined;

let firestoreInstance;
try {
  const firestoreSettings = {
    experimentalForceLongPolling: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  };

  firestoreInstance = customDbId 
    ? initializeFirestore(app, firestoreSettings, customDbId)
    : initializeFirestore(app, firestoreSettings);
} catch {
  try {
    const fallbackSettings = {
      experimentalForceLongPolling: true
    };
    firestoreInstance = customDbId
      ? initializeFirestore(app, fallbackSettings, customDbId)
      : initializeFirestore(app, fallbackSettings);
  } catch {
    firestoreInstance = customDbId ? getFirestore(app, customDbId) : getFirestore(app);
  }
}

export const db = firestoreInstance;

export default app;
