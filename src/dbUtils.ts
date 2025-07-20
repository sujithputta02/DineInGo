import { doc, setDoc, getDoc, collection, Timestamp, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from './firebase';

// Interface for user data
export interface UserData {
  uid: string;
  email: string;
  displayName: string;
  name: string;
  photoURL?: string | null;
  lastLogin: Date;
  createdAt: Date;
  location?: {
    city: string;
    state: string;
    country: string;
  };
}

// Function to store user data in Firestore
export const storeUserData = async (user: User | UserData, location?: { city: string; state: string; country: string }) => {
  try {
    if (!user.uid) {
      throw new Error('User ID is required');
    }

    const userRef = doc(db, 'users', user.uid);
    const existingDoc = await getDoc(userRef);
    
    // Create a clean user data object with no undefined values
    const userData: Partial<UserData> = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      name: user.displayName || '',
      photoURL: user.photoURL || null,
      lastLogin: new Date(),
      // Preserve the original creation date if it exists
      createdAt: existingDoc.exists() 
        ? existingDoc.data().createdAt?.toDate() || new Date()
        : 'createdAt' in user ? user.createdAt : new Date()
    };

    // Only add location if it's provided and has all required fields
    if (location && location.city && location.state && location.country) {
      userData.location = location;
    } else if ('location' in user && user.location && 
               user.location.city && user.location.state && user.location.country) {
      userData.location = user.location;
    } else if (existingDoc.exists() && existingDoc.data().location) {
      // Preserve existing location if no new location is provided
      userData.location = existingDoc.data().location;
    }

    // Merge with existing data to preserve any additional fields
    await setDoc(userRef, {
      ...existingDoc.exists() ? existingDoc.data() : {},
      ...userData,
      lastLogin: serverTimestamp(),
      createdAt: userData.createdAt || serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error storing user data:', error);
    throw error;
  }
};

// Fetch user data from Firestore
export async function fetchUserData(userId: string) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        ...data,
        lastLogin: data.lastLogin?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date()
      } as UserData;
    } else {
      throw new Error('User data not found');
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
} 
