import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  signInWithEmailAndPassword,
  onAuthStateChanged,
  updatePassword,
  sendPasswordResetEmail,
  type User,
  signOut,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  EmailAuthProvider
} from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDrlZ28wxDI3U8jDm8WJzfIGR9Gqh3-cbc",
  authDomain: "dineingo.firebaseapp.com",
  projectId: "dineingo",
  storageBucket: "dineingo.firebasestorage.app",
  messagingSenderId: "434559391214",
  appId: "1:434559391214:web:3e3c54d5ef351d1371eaff",
  measurementId: "G-J08CQW2HYG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
const auth = getAuth(app);
auth.useDeviceLanguage();

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

// Initialize Functions
const functions = getFunctions(app);

// Configure Google Auth Provider
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account'
});

// Add scopes for Google Sign-In
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

// Initialize Analytics (only in production)
let analytics = null;
if (process.env.NODE_ENV === 'production') {
  analytics = getAnalytics(app);
}

// Export everything
export { 
  auth,
  db,
  analytics,
  provider,
  functions,
  httpsCallable,
  createUserWithEmailAndPassword, 
  sendEmailVerification, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
  updatePassword,
  sendPasswordResetEmail,
  signOut,
  storage,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  EmailAuthProvider
};

export type { User };

// Export auth functions with error handling
export const signInWithGoogle = async () => {
  try {
    console.log('Starting Google sign-in...');
    const result = await signInWithPopup(auth, provider);
    console.log('Google sign-in successful');
    return result;
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    if (error.code === 'auth/popup-blocked') {
      console.log('Popup blocked, trying redirect...');
      return await signInWithRedirect(auth, provider);
    }
    throw error;
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    console.log('Starting email sign-in...');
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log('Email sign-in successful');
    return result;
  } catch (error: any) {
    console.error('Email sign-in error:', error);
    throw error;
  }
};

export const createUser = async (email: string, password: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result;
  } catch (error: any) {
    console.error('User creation error:', error);
    throw error;
  }
};
