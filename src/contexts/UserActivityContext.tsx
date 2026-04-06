import React, { createContext, useState, useContext, useEffect } from 'react';
import socketService from '../utils/socketService';

// Define the shape of user activity
export interface UserActivity {
  type: 'login' | 'logout';
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
  };
  timestamp: Date;
}

// Context type
interface UserActivityContextType {
  activities: UserActivity[];
  addActivity: (activity: UserActivity) => void;
  clearActivities: () => void;
}

// Create the context
const UserActivityContext = createContext<UserActivityContextType>({
  activities: [],
  addActivity: () => {},
  clearActivities: () => {}
});

// Provider component
export function UserActivityProvider({ children }: { children: React.ReactNode }) {
  const [activities, setActivities] = useState<UserActivity[]>([]);

  useEffect(() => {
    // Connect to socket (only if not already connected)
    socketService.connect();

    // Listen for user activities
    const handleUserActivity = (data: UserActivity) => {
      setActivities(prev => [
        { ...data, timestamp: new Date(data.timestamp) },
        ...prev
      ]);
    };

    socketService.onUserActivity(handleUserActivity);

    // Cleanup on unmount - only remove listener, don't disconnect
    return () => {
      socketService.removeUserActivityListener();
      // Don't disconnect socket here - it should persist across component remounts
    };
  }, []);

  function addActivity(activity: UserActivity) {
    setActivities(prev => [activity, ...prev]);
  }

  function clearActivities() {
    setActivities([]);
  }

  return (
    <UserActivityContext.Provider value={{ activities, addActivity, clearActivities }}>
      {children}
    </UserActivityContext.Provider>
  );
}

// Custom hook to use the context
export function useUserActivity() {
  const context = useContext(UserActivityContext);
  if (!context) {
    throw new Error('useUserActivity must be used within a UserActivityProvider');
  }
  return context;
}; 