import React, { useState } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { X, Check } from 'lucide-react';

interface Notification {
  _id: string;
  title: string;
  message: string;
  createdAt: string;
}

const Notifications: React.FC = () => {
  const { notifications, loading, markAsRead, isRead, unreadCount, markAllAsRead, refreshNotifications } = useNotifications();
  const auth = useAuth();
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [markingAsRead, setMarkingAsRead] = useState(false);

  const handleNotificationClick = (notification: Notification) => {
    setSelectedNotification(notification);
  };

  const handleMarkAsRead = async () => {
    if (selectedNotification && !isRead(selectedNotification._id) && auth.currentUser) {
      setMarkingAsRead(true);
      try {
        await markAsRead(selectedNotification._id);
        setSelectedNotification(null);
      } finally {
        setMarkingAsRead(false);
      }
    } else {
      setSelectedNotification(null);
    }
  };

  const handleCloseModal = () => {
    setSelectedNotification(null);
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
    <>
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
                onClick={() => handleNotificationClick(n)}
              >
                <div className="flex items-start justify-between">
                  <h3 className={`text-lg ${notificationRead ? 'font-medium' : 'font-bold'}`}>
                    {n.title}
                  </h3>
                  {!notificationRead && (
                    <span className="bg-blue-500 h-2 w-2 rounded-full mt-2" title="Unread notification"></span>
                  )}
                </div>
                <div className="mt-2 whitespace-pre-line line-clamp-2">{n.message}</div>
                <div className="mt-2 text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notification Modal */}
      {selectedNotification && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-200">
              <div className="flex-1 pr-4">
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedNotification.title}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(selectedNotification.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Close"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <div className="text-gray-700 whitespace-pre-line leading-relaxed">
                {selectedNotification.message}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleCloseModal}
                className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
              {!isRead(selectedNotification._id) && (
                <button
                  onClick={handleMarkAsRead}
                  disabled={markingAsRead}
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check size={18} />
                  {markingAsRead ? 'Marking...' : 'Mark as Read'}
                </button>
              )}
              {isRead(selectedNotification._id) && (
                <div className="flex items-center gap-2 text-emerald-600 font-medium">
                  <Check size={18} />
                  Already Read
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Notifications; 