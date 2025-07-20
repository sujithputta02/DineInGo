import React, { useState } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';

const Notifications: React.FC = () => {
  const { notifications, loading, markAsRead, isRead, unreadCount, markAllAsRead, refreshNotifications } = useNotifications();
  const auth = useAuth();
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleNotificationClick = async (id: string) => {
    if (!isRead(id) && auth.currentUser) {
      await markAsRead(id);
    }
  };
  
  const handleMarkAllAsRead = async () => {
    if (unreadCount > 0 && auth.currentUser) {
      setMarkingAllAsRead(true);
      try {
        await markAllAsRead();
      } finally {
        setMarkingAllAsRead(false);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshNotifications();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading && !refreshing) return <div className="p-4 text-center">Loading notifications...</div>;
  if (!notifications.length) return <div className="p-4 text-center">No notifications at this time.</div>;

  return (
    <div className="notifications-list bg-white rounded-xl shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-bold">Notifications</h2>
          <button 
            onClick={handleRefresh} 
            disabled={refreshing}
            className="text-gray-500 hover:text-emerald-600" 
            title="Refresh notifications"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        <div className="flex items-center space-x-3">
          {unreadCount > 0 && (
            <>
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {unreadCount} unread
              </span>
              <button
                onClick={handleMarkAllAsRead}
                disabled={markingAllAsRead}
                className="text-sm text-emerald-600 hover:text-emerald-800 font-medium"
              >
                {markingAllAsRead ? 'Marking...' : 'Mark all as read'}
              </button>
            </>
          )}
        </div>
      </div>
      <div className={`space-y-4 ${refreshing ? 'opacity-50' : ''}`}>
        {notifications.map((n) => {
          const notificationRead = isRead(n._id);
          
          return (
            <div 
              key={n._id} 
              className={`p-4 border rounded-lg transition cursor-pointer ${
                notificationRead 
                  ? 'border-gray-200 bg-gray-50' 
                  : 'border-blue-200 bg-blue-50 hover:bg-blue-100'
              }`}
              onClick={() => handleNotificationClick(n._id)}
            >
              <div className="flex items-start justify-between">
                <h3 className={`text-lg ${notificationRead ? 'font-medium' : 'font-bold'}`}>
                  {n.title}
                </h3>
                {!notificationRead && (
                  <span className="bg-blue-500 h-2 w-2 rounded-full mt-2" title="Unread notification"></span>
                )}
              </div>
              <div className="mt-2 whitespace-pre-line">{n.message}</div>
              <div className="mt-2 text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Notifications; 