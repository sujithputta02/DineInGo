import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../firebase';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAdmin?: boolean;
}

interface AuthContextType {
  currentUser: User | null;
  backendUser: any | null;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
  isWaitlisted: boolean | null;
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
  const [backendUser, setBackendUser] = useState<any | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [isWaitlisted, setIsWaitlisted] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setLoading(true);
      if (user) {
        setCurrentUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        });
        setIsAuthenticated(true);

        // SYSTEMATIC SYNC: Fetch backend user data immediately
        try {
          const { userAPI, waitlistApi } = await import('../services/api');
          const data = await userAPI.fetchUserData(user.uid);
          if (data) {
            setBackendUser(data);
          } else {
            // If no backend user, check waitlist status
            const accessCheck = await waitlistApi.checkAccess(user.email || '');
            setIsWaitlisted(accessCheck.hasAccess);
          }
        } catch (error) {
          console.error('[DineInGo] Backend sync failed:', error);
        }
      } else {
        setCurrentUser(null);
        setBackendUser(null);
        setIsAuthenticated(false);
        setIsWaitlisted(null);
      }
      setLoading(false);
    }, (error) => {
      console.error('[DineInGo] Auth State Change Error:', error);
      if (error.message?.includes('400') || error.message?.includes('identitytoolkit')) {
        import('../firebase').then(m => m.clearAuthSession());
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signOut = async () => {
    await auth.signOut();
    setCurrentUser(null);
    setBackendUser(null);
    setIsAuthenticated(false);
    setIsWaitlisted(null);
    sessionStorage.clear();
    localStorage.removeItem('sessionToken');
  };

  const value = {
    currentUser,
    backendUser,
    signOut,
    isAuthenticated,
    loading,
    isWaitlisted
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext; 