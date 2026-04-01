import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';
import { clearSession } from '../utils/sessionGuard';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAdmin?: boolean;
}

interface AuthContextType {
  currentUser: User | null;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        });
        setIsAuthenticated(true);
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
        // Clear session if firebase user is gone and not an admin
        if (!localStorage.getItem('adminToken')) {
          clearSession();
        }
      }
      setLoading(false);
    }, (error) => {
      console.error('[DineInGo] Auth State Change Error:', error);
      if (error.message?.includes('400') || error.message?.includes('identitytoolkit')) {
        auth.signOut();
        if (!localStorage.getItem('adminToken')) {
          clearSession();
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    try {
      await auth.signOut();
      clearSession();
      setCurrentUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('[AuthProvider] Error during sign out:', error);
    }
  };

  const value = {
    currentUser,
    signOut,
    isAuthenticated
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 