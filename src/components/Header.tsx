import React from 'react';
import { Link } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  handleLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ handleLogout }) => {
  const auth = useAuth();
  
  const onLogout = () => {
    if (handleLogout) {
      handleLogout();
    }
    auth.signOut();
  };
  
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex-shrink-0">
              <span className="text-xl font-bold text-emerald-600">DineInGo</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <NotificationBell />
            <Link to="/dashboard" className="text-gray-700 hover:text-gray-900">
              Dashboard
            </Link>
            {auth.currentUser && (
              <button 
                onClick={onLogout}
                className="text-gray-700 hover:text-red-600 transition"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 