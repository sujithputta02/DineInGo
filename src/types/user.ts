export interface UserAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationSettings {
  type: string;
  coordinates?: Coordinates | null;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  searchRadius?: number;
}

export interface UserPreferences {
  cuisine?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  notifications?: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

// Base user interface with all the properties
interface BaseUser {
  _id: string;
  uid: string;
  displayName: string;
  name: string;
  email: string;
  phoneNumber?: string;
  photoURL?: string | null;
  currentAvatar?: string;
  avatars?: string[];
  language?: string;
  address?: UserAddress;
  locationSettings?: LocationSettings;
  preferences?: UserPreferences;
  role?: 'user' | 'admin' | 'restaurant_owner';
  isActive?: boolean;
  lastLogin?: Date | string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// Firebase Auth user properties
export interface FirebaseUser extends BaseUser {
  /**
   * Gets the Firebase ID token for the user.
   * @param forceRefresh Force refresh regardless of token expiration.
   * @returns A promise that resolves with the token.
   */
  getIdToken(forceRefresh?: boolean): Promise<string>;
  
  /**
   * Refreshes the current user, if signed in.
   */
  reload(): Promise<void>;
  
  // Add other Firebase Auth user methods as needed
}

// Our application's user type
export type User = BaseUser & {
  // Make Firebase Auth methods optional since they might not always be available
  getIdToken?: (forceRefresh?: boolean) => Promise<string>;
  reload?: () => Promise<void>;
}

// NextAuth type extensions
declare module 'next-auth' {
  interface User {
    id: string;
    role?: string;
    uid?: string;
    phoneNumber?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role?: string;
    uid?: string;
  }
}
