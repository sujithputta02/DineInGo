import React from 'react';
import { Menu, Search, Bell, MapPin, Users, Heart, ArrowRight } from 'lucide-react';

interface SkeletonLoadingProps {
  isDarkMode: boolean;
}

const SkeletonLoading: React.FC<SkeletonLoadingProps> = ({ isDarkMode }) => {
  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#0a0a0b]' : 'bg-gray-50'} transition-colors duration-500 overflow-hidden`}>
      {/* Sidebar Skeleton - Matching Premium Dashboard */}
      <aside className={`fixed top-0 left-0 h-full w-[280px] hidden lg:block z-50 ${
        isDarkMode ? 'bg-zinc-900/40' : 'bg-white/70'
      } backdrop-blur-2xl border-r ${isDarkMode ? 'border-zinc-800/50' : 'border-gray-200/50'} shadow-2xl`}>
        <div className="p-8 flex flex-col h-full">
          {/* Logo Placeholder */}
          <div className="flex items-center gap-3 mb-12">
            <div className={`w-10 h-10 rounded-xl ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-200'} animate-pulse`}></div>
            <div className={`h-8 w-32 rounded-lg ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-200'} animate-pulse`}></div>
          </div>

          {/* Nav Items */}
          <div className="space-y-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`w-6 h-6 rounded-lg ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-200'} animate-pulse`}></div>
                <div className={`h-4 w-32 rounded-md ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-200'} animate-pulse`}></div>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-8 border-t border-zinc-800/50">
             <div className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-500/5">
                <div className={`w-10 h-10 rounded-full ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-200'} animate-pulse`}></div>
                <div className="flex-1">
                  <div className={`h-3 w-20 rounded ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-200'} animate-pulse mb-2`}></div>
                  <div className={`h-2 w-24 rounded ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-200'} animate-pulse`}></div>
                </div>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-[280px] min-h-screen relative">
        {/* Header Placeholder - Glassmorphism */}
        <header className="sticky top-0 z-40 px-6 py-6">
          <div className={`max-w-7xl mx-auto rounded-3xl p-4 flex items-center justify-between border ${
            isDarkMode ? 'bg-zinc-900/60 border-zinc-800/50' : 'bg-white/80 border-gray-100'
          } backdrop-blur-xl shadow-xl`}>
            {/* Search Bar Placeholder */}
            <div className="flex-1 max-w-lg relative group overflow-hidden">
               <div className={`h-12 w-full rounded-2xl ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-100'} animate-pulse flex items-center px-4`}>
                 <Search className={`w-5 h-5 ${isDarkMode ? 'text-zinc-700' : 'text-gray-300'}`} />
               </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4 ml-6">
              <div className={`w-12 h-12 rounded-2xl ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-100'} animate-pulse`}></div>
              <div className={`w-12 h-12 rounded-2xl ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-100'} animate-pulse`}></div>
            </div>
          </div>
        </header>

        <main className="px-6 py-8">
          <div className="max-w-7xl mx-auto">
             {/* Welcome Hero Placeholder */}
             <div className="mb-12">
               <div className={`h-12 w-64 rounded-2xl ${isDarkMode ? 'bg-zinc-900' : 'bg-gray-200'} animate-pulse mb-4`}></div>
               <div className={`h-4 w-96 rounded-lg ${isDarkMode ? 'bg-zinc-900' : 'bg-gray-200'} animate-pulse`}></div>
             </div>

             {/* Grid Placeholders matching PremiumCard layout */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {[...Array(6)].map((_, index) => (
                 <div key={index} className={`rounded-[2.5rem] overflow-hidden border-2 ${
                   isDarkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-gray-50'
                 } shadow-2xl h-[520px]`}>
                   {/* Image Placeholder */}
                   <div className={`h-64 relative ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-200'} animate-pulse`}>
                      <div className="absolute top-5 inset-x-5 flex justify-between">
                         <div className={`w-16 h-8 rounded-2xl ${isDarkMode ? 'bg-zinc-700' : 'bg-gray-300'}`}></div>
                         <div className={`w-10 h-10 rounded-2xl ${isDarkMode ? 'bg-zinc-700' : 'bg-gray-300'}`}></div>
                      </div>
                   </div>

                   {/* Content Placeholder */}
                   <div className="p-8">
                     <div className={`h-4 w-24 rounded-full ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-200'} animate-pulse mb-3`}></div>
                     <div className={`h-8 w-3/4 rounded-xl ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-200'} animate-pulse mb-8`}></div>
                     
                     <div className="flex gap-4 mb-8">
                        <div className={`h-10 w-24 rounded-xl ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-200'} animate-pulse`}></div>
                        <div className={`h-10 w-24 rounded-xl ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-200'} animate-pulse`}></div>
                     </div>

                     <div className="pt-6 border-t border-dashed border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                        <div className={`h-4 w-24 rounded ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-200'} animate-pulse`}></div>
                        <div className={`w-10 h-10 rounded-full ${isDarkMode ? 'bg-zinc-800' : 'bg-gray-200'} animate-pulse`}></div>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SkeletonLoading;
 