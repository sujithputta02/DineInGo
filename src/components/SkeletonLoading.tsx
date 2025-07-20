import React from 'react';
import { Menu } from 'lucide-react';

interface SkeletonLoadingProps {
  isDarkMode: boolean;
}

const SkeletonLoading: React.FC<SkeletonLoadingProps> = ({ isDarkMode }) => {
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar Skeleton */}
      <aside className={`fixed top-0 left-0 h-full w-[280px] transform transition-transform duration-300 ease-in-out z-50 ${
        isDarkMode ? 'bg-gray-800' : 'bg-white'
      } border-r border-gray-200 shadow-lg overflow-y-auto`}>
        <div className="p-6 flex flex-col h-full">
          {/* Logo Skeleton */}
          <div className="flex items-center justify-between mb-8">
            <div className={`h-8 w-32 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg animate-pulse`}></div>
          </div>

          {/* Profile Section Skeleton */}
          <div className="flex items-center space-x-4 mb-8">
            <div className={`w-12 h-12 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full animate-pulse`}></div>
            <div className="flex-1 min-w-0">
              <div className={`h-4 w-24 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg animate-pulse mb-2`}></div>
              <div className={`h-3 w-32 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg animate-pulse`}></div>
            </div>
          </div>

          {/* Navigation Links Skeleton */}
          <div className="space-y-4">
            {[...Array(7)].map((_, index) => (
              <div key={index} className={`h-10 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-xl animate-pulse`}></div>
            ))}
          </div>
        </div>
      </aside>

      {/* Mobile Menu Button Skeleton */}
      <button className={`fixed top-4 left-4 z-50 p-2 rounded-full ${
        isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      } shadow-lg md:hidden`}>
        <Menu className={`w-7 h-7 ${isDarkMode ? 'text-white' : 'text-black'}`} />
      </button>

      {/* Main Content Area */}
      <div className="min-h-screen lg:ml-[280px] transition-all duration-300">
        {/* Header Skeleton */}
        <header className="px-4 py-3">
          <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-emerald-400'} rounded-2xl px-4 py-3 flex items-center justify-between shadow-lg`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-xl animate-pulse`}></div>
              <div className={`h-8 w-32 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg animate-pulse`}></div>
            </div>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full animate-pulse`}></div>
              <div className={`w-10 h-10 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full animate-pulse`}></div>
            </div>
          </div>
        </header>

        {/* Main Content Skeleton */}
        <main className="px-4 py-6">
          <div className="max-w-7xl mx-auto">
            {/* Welcome Section Skeleton */}
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className={`h-12 w-64 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded-lg animate-pulse`}></div>
                <div className={`h-10 w-48 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded-full animate-pulse`}></div>
              </div>

              {/* Section Selector Skeleton */}
              <div className="flex gap-4 mb-8">
                <div className={`h-10 w-32 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded-xl animate-pulse`}></div>
                <div className={`h-10 w-32 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded-xl animate-pulse`}></div>
              </div>

              {/* Content Grid Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-3xl overflow-hidden shadow-lg`}>
                    <div className={`h-48 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} animate-pulse`}></div>
                    <div className="p-4">
                      <div className={`h-6 w-3/4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg animate-pulse mb-2`}></div>
                      <div className={`h-4 w-1/2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg animate-pulse mb-4`}></div>
                      <div className="flex flex-wrap gap-2">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className={`h-6 w-20 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full animate-pulse`}></div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Footer Skeleton */}
        <footer className={`mt-12 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} pb-6`}>
          <div className={`h-4 w-48 mx-auto ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded-lg animate-pulse`}></div>
        </footer>
      </div>
    </div>
  );
};

export default SkeletonLoading; 