import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ghost, XCircle, ShieldAlert, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clearSession } from '../utils/sessionGuard';
import { toast } from 'react-toastify';

const SESSION_LIMIT_MS = 20 * 60 * 1000; // 20 Minutes hard limit

const GhostBanner: React.FC = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(SESSION_LIMIT_MS);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initial load of userData from localStorage
  useEffect(() => {
    const data = localStorage.getItem('userData');
    if (data) {
      setUserData(JSON.parse(data));
    }
    setIsInitializing(false);
  }, []);

  const handleExit = useCallback(() => {
    clearSession();
    toast.info('Ghost Session Terminated. Returning to Admin Panel.', {
      autoClose: 3000
    });
    navigate('/admin/users');
  }, [navigate]);

  useEffect(() => {
    if (isInitializing || !userData || !userData.impersonated || !userData.startTime) return;

    const tick = () => {
      const startTime = new Date(userData.startTime).getTime();
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, SESSION_LIMIT_MS - elapsed);
      
      setTimeLeft(remaining);

      if (remaining <= 0) {
        handleExit();
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [userData, handleExit, isInitializing]);

  if (isInitializing || !userData || !userData.impersonated) return null;

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const isUrgent = timeLeft < 5 * 60 * 1000;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-[9999] bg-white border-b-2 border-red-500 shadow-xl"
      >
        <div className="max-w-[1920px] mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isUrgent ? 'bg-red-500 text-white animate-bounce' : 'bg-red-50 text-red-600'}`}>
              <Ghost className="w-5 h-5" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="text-slate-900 font-extrabold text-xs sm:text-sm tracking-tight flex items-center gap-1.5 uppercase">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                ADMIN GHOST MODE
              </span>
              <span className="text-slate-500 text-xs sm:text-sm font-medium border-l border-slate-200 pl-2">
                Viewing as <span className="text-slate-900 font-semibold">{userData.displayName || userData.email}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            {/* Timer Display - Pinned in the 'White Space' */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 ${
              isUrgent ? 'bg-red-500 border-red-500 text-white animate-pulse' : 'bg-slate-50 border-slate-100 text-slate-900'
            }`}>
              <Clock className={`w-4 h-4 ${isUrgent ? 'text-white' : 'text-red-500'}`} />
              <span className="font-mono font-black text-sm sm:text-base tabular-nums">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
            </div>

            <button
              onClick={handleExit}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-xs hover:bg-red-700 transition-all shadow-md active:scale-95 group"
            >
              <XCircle className="w-4 h-4 group-hover:rotate-90 transition-transform" />
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
