import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import NotificationBell from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  handleLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ handleLogout }) => {
  const auth = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const onLogout = () => {
    if (handleLogout) {
      handleLogout();
    }
    auth.signOut();
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Main Navbar */}
      <nav className="bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-700 dark:to-teal-700 shadow-lg">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8">
          {/* Mobile & Tablet Navbar */}
          <div className="flex items-center justify-between h-20 sm:h-24 md:h-20 lg:h-20">
            {/* Left Section: Hamburger + Logo */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
              {/* Hamburger Menu */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 sm:p-2.5 text-white hover:bg-white/20 rounded-lg transition flex-shrink-0"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              {/* Logo */}
              <Link to="/dashboard" className="flex-shrink-0 flex items-center gap-2">
                <span className="text-xl sm:text-2xl md:text-2xl lg:text-3xl font-bold text-white whitespace-nowrap">
                  DineInGo
                </span>
                <span className="px-2 py-0.5 text-[10px] font-black bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-lg uppercase tracking-widest shadow-sm">
                  Beta Dev
                </span>
              </Link>
            </div>

            {/* Center Section: Search Bar - Hidden on Mobile */}
            <div className="hidden md:flex flex-1 max-w-md mx-4 lg:mx-6">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search restaurants..."
                  className="w-full px-4 py-2.5 rounded-full bg-white/20 text-white placeholder-white/70 focus:outline-none focus:bg-white/30 transition text-sm md:text-base"
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition flex-shrink-0">
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Right Section: Icons */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
              {/* Search Icon (Mobile Only) */}
              <button className="md:hidden p-2 sm:p-2.5 text-white hover:bg-white/20 rounded-lg transition">
                <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {/* Notification Bell */}
              <button className="p-2 sm:p-2.5 text-white hover:bg-white/20 rounded-lg transition">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>

              {/* Settings Icon (Desktop) */}
              <button className="hidden md:block p-2 text-white hover:bg-white/20 rounded-lg transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Profile Avatar */}
              <button className="p-1.5 sm:p-2 rounded-full bg-white/20 hover:bg-white/30 transition flex-shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-8 md:h-8 rounded-full bg-white/40 flex items-center justify-center text-white font-semibold text-sm sm:text-base">
                  {auth.currentUser?.email?.[0].toUpperCase() || 'U'}
                </div>
              </button>

              {/* Theme Toggle */}
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-emerald-600 dark:bg-emerald-800 border-t border-white/20">
          <div className="px-3 sm:px-4 py-3 sm:py-4 space-y-2">
            {/* Mobile Search */}
            <div className="pb-2 sm:pb-3">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search restaurants..."
                  className="w-full px-4 py-2.5 sm:py-3 rounded-full bg-white/20 text-white placeholder-white/70 focus:outline-none focus:bg-white/30 transition text-sm sm:text-base"
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <Link
              to="/dashboard"
              className="block px-4 py-2.5 sm:py-3 text-white hover:bg-white/20 rounded-lg transition text-base sm:text-lg font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <button className="w-full text-left px-4 py-2.5 sm:py-3 text-white hover:bg-white/20 rounded-lg transition text-base sm:text-lg font-medium">
              Settings
            </button>
            <button className="w-full text-left px-4 py-2.5 sm:py-3 text-white hover:bg-white/20 rounded-lg transition text-base sm:text-lg font-medium">
              Theme
            </button>
            {auth.currentUser && (
              <button
                onClick={onLogout}
                className="w-full text-left px-4 py-2.5 sm:py-3 text-white hover:bg-red-500/30 rounded-lg transition text-base sm:text-lg font-medium"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header; 