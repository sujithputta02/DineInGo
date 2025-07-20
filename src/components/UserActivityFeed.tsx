import React from 'react';
import { useUserActivity } from '../contexts/UserActivityContext';
import { LogIn, LogOut } from 'lucide-react';

const UserActivityFeed: React.FC = () => {
  const { activities } = useUserActivity();

  const getActivityIcon = (type: 'login' | 'logout') => {
    return type === 'login' ? (
      <LogIn className="text-emerald-500 w-5 h-5" />
    ) : (
      <LogOut className="text-red-500 w-5 h-5" />
    );
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds} sec ago`;
    if (minutes < 60) return `${minutes} min ago`;
    return `${hours} hr ago`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 max-h-96 overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Recent User Activities</h3>
      {activities.length === 0 ? (
        <p className="text-gray-500 text-sm text-center">No recent activities</p>
      ) : (
        <ul className="space-y-2">
          {activities.map((activity, index) => (
            <li 
              key={index} 
              className="flex items-center space-x-3 bg-gray-50 p-2 rounded-md"
            >
              <div className="flex-shrink-0">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-grow">
                <p className="text-sm font-medium text-gray-700">
                  {activity.user.displayName || activity.user.email || 'Unknown User'}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {activity.type} {activity.type === 'login' ? 'to' : 'from'} DineInGo
                </p>
              </div>
              <span className="text-xs text-gray-400">
                {formatTimestamp(activity.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default UserActivityFeed; 