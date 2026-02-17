import React, { useState } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { useAuth } from '../contexts/AuthContext';
import { X, Check, Bell, RefreshCw, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
}

const BusinessNotifications: React.FC = () => {
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="text-green-600" size={20} />;
      case 'warning': return <AlertCircle className="text-yellow-600" size={20} />;
      case 'error': return <AlertCircle className="text-red-600" size={20} />;
      default: return <Info className="text-blue-600" size={20} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'border-green-200 bg-green-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'error': return 'border-red-200 bg-red-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  if (loading && !refreshing) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="animate-spin text-emerald-600" size={24} />
          <span className="ml-2 text-gray-600">Loading notifications...</span>
        </div>
      </div>
    );
  }

  if (!notifications.length) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <Bell className="mx-auto text-gray-400 mb-3" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No Notifications</h3>
          <p className="text-gray-600">You're all caught up! No new notifications at this time.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Bell className="text-emerald-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
              <p className="text-sm text-gray-600">Stay updated with important messages</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={handleRefresh} 
              disabled={refreshing}
              className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" 
              title="Refresh notifications"
            >
              <RefreshCw className={refreshing ? 'animate-spin' : ''} size={20} />
            </button>
            {unreadCount > 0 && (
              <>
                <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {unreadCount} unread
                </span>
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markingAllAsRead}
                  className="px-4 py-2 text-sm text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg font-medium transition-colors"
                >
                  {markingAllAsRead ? 'Marking...' : 'Mark all as read'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className={`divide-y divide-gray-200 max-h-[600px] overflow-y-auto ${refreshing ? 'opacity-50' : ''}`}>
          {notifications.map((n: any) => {
            const notificationRead = n.isRead === true;
            
            return (
              <motion.div
                key={n._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 transition cursor-pointer hover:bg-gray-50 ${
                  notificationRead ? 'bg-white' : 'bg-blue-50'
                }`}
                onClick={() => handleNotificationClick(n)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getTypeIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-base ${notificationRead ? 'font-medium text-gray-900' : 'font-bold text-gray-900'}`}>
                        {n.title}
                      </h3>
                      {!notificationRead && (
                        <span className="flex-shrink-0 bg-blue-500 h-2 w-2 rounded-full mt-2" title="Unread notification"></span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">{n.message}</p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      <span>{new Date(n.createdAt).toLocaleString()}</span>
                      {notificationRead && (
                        <span className="flex items-center gap-1 text-green-600">
                          <Check size={12} />
                          Read
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Notification Detail Modal */}
      <AnimatePresence>
        {selectedNotification && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className={`flex items-start justify-between p-6 border-b ${getTypeColor(selectedNotification.type)}`}>
                <div className="flex items-start gap-3 flex-1 pr-4">
                  {getTypeIcon(selectedNotification.type)}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedNotification.title}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(selectedNotification.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-white rounded-lg"
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
                  className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                >
                  Close
                </button>
                {!isRead(selectedNotification._id) && (
                  <button
                    onClick={handleMarkAsRead}
                    disabled={markingAsRead}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    <Check size={18} />
                    {markingAsRead ? 'Marking...' : 'Mark as Read'}
                  </button>
                )}
                {isRead(selectedNotification._id) && (
                  <div className="flex items-center gap-2 text-emerald-600 font-medium px-4 py-2 bg-emerald-50 rounded-lg">
                    <Check size={18} />
                    Already Read
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BusinessNotifications;
