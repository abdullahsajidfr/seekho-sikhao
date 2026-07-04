import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * When the Firebase env vars are absent (e.g. no `.env.local` during local
 * UI preview) the app still boots. We initialise Firebase with a placeholder
 * databaseURL/storageBucket so `getDatabase()`/`getStorage()` don't throw at
 * import time, and expose `firebaseEnabled` so the data layer can no-op every
 * read/write gracefully. When the env IS present, behaviour is unchanged.
 */
export const firebaseEnabled = Boolean(firebaseConfig.databaseURL);

const app = initializeApp(
  firebaseEnabled
    ? firebaseConfig
    : {
        ...firebaseConfig,
        apiKey:        firebaseConfig.apiKey ?? 'demo',
        databaseURL:   'https://seekho-sikhao-demo.firebaseio.com',
        projectId:     firebaseConfig.projectId ?? 'seekho-sikhao-demo',
        storageBucket: firebaseConfig.storageBucket ?? 'seekho-sikhao-demo.appspot.com',
        appId:         firebaseConfig.appId ?? 'demo',
      }
);

export const db      = getDatabase(app);
export const storage = getStorage(app);
