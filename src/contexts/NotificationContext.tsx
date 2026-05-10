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

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const auth = useAuth();
  
  // Use persistent storage for seen notifications to avoid duplicates across reloads
  const [shownIds, setShownIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('seen_notification_ids');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Save to localStorage when shownIds change
  useEffect(() => {
    localStorage.setItem('seen_notification_ids', JSON.stringify(Array.from(shownIds)));
  }, [shownIds]);
  
  async function refreshNotifications() {
    if (!auth.currentUser?.uid) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await notificationsApi.getAll(auth.currentUser.uid);
      
      // Filter for unread AND not already shown in this session or stored in localStorage
      const unreadAndNew = data.filter((n: Notification) => 
        !n.isRead && !shownIds.has(n._id)
      );

      if (unreadAndNew.length > 0) {
        // Show desktop notifications
        if (NotificationService.getPermission() === 'granted') {
          unreadAndNew.forEach((n: Notification) => {
            NotificationService.show(n.title, { body: n.message });
          });
        }
        
        // Add to shownIds set
        setShownIds(prev => {
          const next = new Set(prev);
          unreadAndNew.forEach((n: Notification) => next.add(n._id));
          return next;
        });
      }

      setNotifications(data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }
  
  async function markAsRead(id: string) {
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
  }
  
  async function markAllAsRead() {
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
  }
  
  function isRead(id: string): boolean {
    const notification = notifications.find(n => n._id === id);
    if (!notification) {
      return false;
    }
    
    return notification.isRead || false;
  }
  
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
}

export { NotificationContext }; 