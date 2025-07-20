import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { notificationsApi } from '../services/api';
import { useAuth } from './AuthContext';
import { NotificationService } from '../services/NotificationService';

interface Notification {
  _id: string;
  title: string;
  message: string;
  createdAt: string;
  readBy: string[];
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  isRead: (id: string) => boolean;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = useAuth();
  const shownNotifications = useRef(new Set<string>());
  
  const refreshNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationsApi.getAll();
      console.log('Fetched notifications from API:', data);

      if (NotificationService.getPermission() === 'granted') {
        const unread = data.filter(n => 
          !n.readBy?.includes(auth.currentUser!.uid) && !shownNotifications.current.has(n._id)
        );

        unread.forEach(n => {
          NotificationService.show(n.title, { body: n.message });
          shownNotifications.current.add(n._id);
        });
      }

      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const markAsRead = async (id: string) => {
    if (!auth.currentUser?.uid) {
      console.error('No user ID available to mark notification as read');
      return;
    }
    
    try {
      await notificationsApi.markAsRead(id, auth.currentUser.uid);
      
      // Update local state to reflect the change
      setNotifications(prev => 
        prev.map(n => {
          if (n._id === id) {
            // Make a copy of readBy array or initialize it if undefined
            const readBy = [...(n.readBy || [])];
            
            // Add user ID if it's not already in the array
            if (!readBy.includes(auth.currentUser!.uid)) {
              readBy.push(auth.currentUser!.uid);
            }
            
            return { ...n, readBy };
          }
          return n;
        })
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  const markAllAsRead = async () => {
    if (!auth.currentUser?.uid) {
      console.error('No user ID available to mark all notifications as read');
      return;
    }
    
    try {
      await notificationsApi.markAllAsRead(auth.currentUser.uid);
      
      // Update local state to reflect all notifications as read
      setNotifications(prev => 
        prev.map(n => {
          // Make a copy of readBy array or initialize it if undefined
          const readBy = [...(n.readBy || [])];
          
          // Add user ID if it's not already in the array
          if (!readBy.includes(auth.currentUser!.uid)) {
            readBy.push(auth.currentUser!.uid);
          }
          
          return { ...n, readBy };
        })
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };
  
  const isRead = (id: string): boolean => {
    if (!auth.currentUser?.uid) return false;
    
    const notification = notifications.find(n => n._id === id);
    if (!notification) return false;
    
    return notification.readBy?.includes(auth.currentUser.uid) || false;
  };
  
  // Calculate unread count
  const unreadCount = notifications.filter(n => !isRead(n._id)).length;
  
  useEffect(() => {
    if (auth.currentUser) {
      refreshNotifications();
      
      const interval = setInterval(refreshNotifications, 60000); // Check every minute
      
      return () => clearInterval(interval);
    }
  }, [auth.currentUser]);
  
  return (
    <NotificationContext.Provider 
      value={{ 
        notifications, 
        unreadCount, 
        loading, 
        refreshNotifications, 
        markAsRead,
        markAllAsRead,
        isRead
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export { NotificationContext }; 