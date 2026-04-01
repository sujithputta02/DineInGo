import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ghost, XCircle, ShieldAlert, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clearSession } from '../utils/sessionGuard';
import { toast } from 'react-toastify';

const SESSION_LIMIT_MS = 20 * 60 * 1000; // 20 Minutes hard limit

const GhostBanner: React.FC = () => {
  const navigate = useNavigate();
  const userDataRaw = localStorage.getItem('userData');
  const userData = userDataRaw ? JSON.parse(userDataRaw) : null;
  const [timeLeft, setTimeLeft] = useState<number>(SESSION_LIMIT_MS);

  const handleExit = useCallback(() => {
    // Clear the impersonation session
    clearSession();
    toast.info('Ghost Session Terminated. Returning to Admin Panel.', {
      autoClose: 3000
    });
    // Redirect back to Admin Users management
    navigate('/admin/users');
  }, [navigate]);

  useEffect(() => {
    if (!userData || !userData.impersonated || !userData.startTime) return;

    const tick = () => {
      const startTime = new Date(userData.startTime).getTime();
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, SESSION_LIMIT_MS - elapsed);
      
      setTimeLeft(remaining);

      if (remaining <= 0) {
        handleExit();
      }
    };

    // Initial tick
    tick();
    
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [userData?.startTime, userData?.impersonated, handleExit]);

  if (!userData || !userData.impersonated) return null;

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const isUrgent = timeLeft < 5 * 60 * 1000; // < 5 minutes

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 left-0 right-0 z-[9999] border-b border-white/20 shadow-2xl transition-colors duration-500 ${
          isUrgent ? 'bg-black' : 'bg-gradient-to-r from-red-600 via-orange-600 to-red-600'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={`p-1.5 bg-white/20 rounded-lg hidden sm:block ${isUrgent ? 'animate-bounce text-red-500' : 'animate-pulse text-white'}`}>
              <Ghost className="w-5 h-5" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="text-white font-bold text-sm tracking-wide flex items-center gap-1.5 whitespace-nowrap uppercase">
                <ShieldAlert className="w-4 h-4" />
                Admin Ghost Mode:
              </span>
              <span className="text-white/90 text-sm font-medium truncate italic text-xs sm:text-sm">
                Viewing as {userData.displayName || userData.email}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Timer Display */}
            <div className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 rounded-full border ${
              isUrgent ? 'bg-red-600 border-white animate-pulse' : 'bg-white/10 border-white/20'
            }`}>
              <Clock className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-white" />
              <span className="text-white font-mono font-bold text-xs sm:text-sm">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
            </div>

            <button
              onClick={handleExit}
              className="group flex items-center gap-2 px-3 sm:px-4 py-1.5 bg-white text-red-600 rounded-full font-bold text-[10px] sm:text-xs hover:bg-red-50 transition-all shadow-lg active:scale-95 whitespace-nowrap"
            >
              <XCircle className="w-4 h-4 transition-transform group-hover:rotate-90" />
              <span className="hidden xs:inline">EXIT SESSION</span>
              <span className="xs:hidden">EXIT</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GhostBanner;
