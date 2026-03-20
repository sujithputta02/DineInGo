import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  X, 
  MessageSquare, 
  Zap, 
  ChevronRight, 
  Compass, 
  HelpCircle,
  TrendingUp,
  Award
} from 'lucide-react';
import DinoDailyMorsels from './DinoDailyMorsels';
import { useNotifications } from '../contexts/NotificationContext';
import socketService from '../utils/socketService';

interface DinoFloatingAssistantProps {
  userId: string;
  isDarkMode: boolean;
  dinoLevel?: number;
  dinoTier?: string;
}

const DinoFloatingAssistant: React.FC<DinoFloatingAssistantProps> = ({ 
  userId, 
  isDarkMode, 
  dinoLevel = 1, 
  dinoTier = 'Early Hatcher' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  useEffect(() => {
    // Listen for real-time updates to trigger mascot reactions
    const handleStatsUpdate = (data: any) => {
      setLastMessage("RAWR! Your stats just moved! You're getting stronger! 🦖✨");
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 5000);
    };

    const handleLevelUp = (data: any) => {
      setLastMessage(`WOW! Level ${data.level}! You're becoming a legend! 🏆`);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 8000);
    };

    socketService.on('stats-updated', handleStatsUpdate);
    socketService.on('level-up', handleLevelUp);

    return () => {
      socketService.off('stats-updated', handleStatsUpdate);
      socketService.off('level-up', handleLevelUp);
    };
  }, []);

  const toggleAssistant = () => setIsOpen(!isOpen);

  return (
    <div className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-4">
      {/* Notification Bubble */}
      <AnimatePresence>
        {showNotification && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`max-w-[240px] p-4 rounded-2xl shadow-2xl border ${
              isDarkMode ? 'bg-zinc-900 border-emerald-500/30' : 'bg-white border-emerald-500/20'
            } mb-2`}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                <Zap size={14} />
              </div>
              <p className={`text-xs font-bold leading-relaxed ${isDarkMode ? 'text-emerald-50' : 'text-gray-800'}`}>
                {lastMessage}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Assistant Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className={`w-[380px] md:w-[420px] max-h-[80vh] overflow-hidden rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border ${
              isDarkMode ? 'bg-zinc-900/95 border-white/10' : 'bg-white/95 border-gray-200'
            } backdrop-blur-2xl flex flex-col`}
          >
            {/* Header */}
            <div className="p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white relative">
              <button 
                onClick={toggleAssistant}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X size={18} />
              </button>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl shadow-inner border border-white/10">
                  🦖
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full border border-white/10">
                      Level {dinoLevel}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-yellow-400 text-emerald-900 px-2 py-0.5 rounded-full">
                      {dinoTier}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black tracking-tight leading-none italic">Dino Assistant</h3>
                </div>
              </div>
              
              <p className="text-emerald-50 text-sm font-medium opacity-90 leading-relaxed">
                "RAWR! I've been busy scouting the best spots in town just for you. Ready to explore?"
              </p>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              {/* Daily Morsels Integration */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-yellow-400 flex items-center justify-center text-emerald-900 shadow-lg shadow-yellow-400/20">
                      <Sparkles size={16} />
                    </div>
                    <h4 className={`font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Daily Morsels
                    </h4>
                  </div>
                </div>
                
                {/* Simplified Morsels List */}
                <DinoDailyMorsels userId={userId} isDarkMode={isDarkMode} />
              </section>

              {/* Quick Actions */}
              <section>
                <h4 className={`text-xs font-black uppercase tracking-widest mb-4 opacity-50 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Quick Actions
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Compass, label: 'Explore Map', color: 'emerald' },
                    { icon: MessageSquare, label: 'Ask Dino', color: 'blue' },
                    { icon: TrendingUp, label: 'Waitlist Info', color: 'purple' },
                    { icon: HelpCircle, label: 'Help Center', color: 'orange' }
                  ].map((action, i) => (
                    <button
                      key={i}
                      className={`flex flex-col items-start p-4 rounded-2xl border transition-all hover:-translate-y-1 ${
                        isDarkMode 
                          ? 'bg-zinc-800/50 border-white/5 hover:bg-zinc-800 hover:border-emerald-500/30' 
                          : 'bg-gray-50 border-gray-100 hover:bg-white hover:shadow-xl hover:border-emerald-500/20'
                      }`}
                    >
                      <action.icon size={20} className={`mb-3 text-${action.color}-500`} />
                      <span className={`text-xs font-black uppercase tracking-tighter ${isDarkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
                        {action.label}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className={`p-4 border-t ${isDarkMode ? 'bg-zinc-950/50 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-500">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Online & Ready
                </div>
                <button className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} hover:text-emerald-500 transition-colors`}>
                  Settings
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.05, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleAssistant}
        className={`relative w-20 h-20 rounded-[2rem] flex items-center justify-center text-4xl shadow-2xl transition-all ${
          isOpen 
            ? 'bg-zinc-900 text-white' 
            : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white hover:shadow-emerald-500/40'
        }`}
      >
        <div className="absolute -top-1 -right-1 flex h-6 w-6">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-6 w-6 bg-yellow-400 border-2 border-emerald-500 flex items-center justify-center text-[10px] font-black text-emerald-900">
            !
          </span>
        </div>
        {isOpen ? <X size={32} /> : "🦖"}
      </motion.button>
    </div>
  );
};

export default DinoFloatingAssistant;
