import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { notificationsApi } from '../services/api';
import { useAuth } from './AuthContext';
import { NotificationService } from '../services/NotificationService';

interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
  target?: string;
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
    if (!auth.currentUser?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await notificationsApi.getAll(auth.currentUser.uid);
      // Show desktop notifications for unread notifications
      if (NotificationService.getPermission() === 'granted') {
        const unread = data.filter((n: Notification) => 
          !n.isRead && !shownNotifications.current.has(n._id)
        );

        unread.forEach((n: Notification) => {
          NotificationService.show(n.title, { body: n.message });
          shownNotifications.current.add(n._id);
        });
      }

      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };
  
  const markAsRead = async (id: string) => {
    if (!auth.currentUser?.uid) {
      console.error('No user ID available to mark notification as read');
      return;
    }
    
    // Immediately update UI (optimistic update)
    setNotifications(prev => {
      const updated = prev.map(n => 
        n._id === id ? { ...n, isRead: true } : n
      );
      return updated;
    });
    
    try {
      // Then update on server
      await notificationsApi.markAsRead(id, auth.currentUser.uid);
    } catch (error) {
      console.error('Error marking notification as read on server:', error);
      // Revert the optimistic update on error
      await refreshNotifications();
    }
  };
  
  const markAllAsRead = async () => {
    if (!auth.currentUser?.uid) {
      console.error('No user ID available to mark all notifications as read');
      return;
    }
    
    // Immediately update UI (optimistic update)
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, isRead: true }));
      return updated;
    });
    
    try {
      // Then update on server
      await notificationsApi.markAllAsRead(auth.currentUser.uid);
    } catch (error) {
      console.error('Error marking all notifications as read on server:', error);
      // Revert the optimistic update on error
      await refreshNotifications();
    }
  };
  
  const isRead = (id: string): boolean => {
    const notification = notifications.find(n => n._id === id);
    if (!notification) {
      return false;
    }
    
    return notification.isRead || false;
  };
  
  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  useEffect(() => {
    if (auth.currentUser) {
      refreshNotifications();
      
      // Refresh notifications every minute
      const interval = setInterval(refreshNotifications, 60000);
      
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