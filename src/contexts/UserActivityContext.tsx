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
export const UserActivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activities, setActivities] = useState<UserActivity[]>([]);

  useEffect(() => {
    // Connect to socket
    const socket = socketService.connect();

    // Listen for user activities
    const handleUserActivity = (data: UserActivity) => {
      setActivities(prev => [
        { ...data, timestamp: new Date(data.timestamp) },
        ...prev
      ]);
    };

    socketService.onUserActivity(handleUserActivity);

    // Cleanup on unmount
    return () => {
      socketService.removeUserActivityListener();
      socketService.disconnect();
    };
  }, []);

  const addActivity = (activity: UserActivity) => {
    setActivities(prev => [activity, ...prev]);
  };

  const clearActivities = () => {
    setActivities([]);
  };

  return (
    <UserActivityContext.Provider value={{ activities, addActivity, clearActivities }}>
      {children}
    </UserActivityContext.Provider>
  );
};

// Custom hook to use the context
export const useUserActivity = () => {
  const context = useContext(UserActivityContext);
  if (!context) {
    throw new Error('useUserActivity must be used within a UserActivityProvider');
  }
  return context;
}; 