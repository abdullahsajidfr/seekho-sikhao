import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

/**
 * When the Firebase env vars are absent (e.g. running in Expo Go with no
 * credentials) the app still boots. We initialise Firebase with a placeholder
 * databaseURL/storageBucket so getDatabase()/getStorage() don't throw at import
 * time, and expose `firebaseEnabled` so the data layer no-ops every read/write
 * gracefully and falls back to the static demo session. When the env IS present
 * (RTDB + Storage, no auth needed), behaviour matches the wizard web surface.
 */
export const firebaseEnabled = Boolean(firebaseConfig.databaseURL);

const app = initializeApp(
  firebaseEnabled
    ? firebaseConfig
    : {
        ...firebaseConfig,
        apiKey: firebaseConfig.apiKey ?? 'demo',
        databaseURL: 'https://seekho-sikhao-demo.firebaseio.com',
        projectId: firebaseConfig.projectId ?? 'seekho-sikhao-demo',
        storageBucket: firebaseConfig.storageBucket ?? 'seekho-sikhao-demo.appspot.com',
        appId: firebaseConfig.appId ?? 'demo',
      }
);

export const db = getDatabase(app);
export const storage = getStorage(app);
