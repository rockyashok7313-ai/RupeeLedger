import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCdpRRtTI3ivyMfHQ6_eS5-wjoVdAVkLpk",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-7661204116-6f191.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-7661204116-6f191",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "studio-7661204116-6f191.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "789623803260",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:789623803260:web:faf55833f91539ada5a8f9"
};

// Initialize Firebase client app (supporting hot reloads / SSR check)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
});

export { app, auth, db };
