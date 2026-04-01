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

    const sessionLimit = userData.sessionLimitMs || SESSION_LIMIT_MS;

    const tick = () => {
      const startTime = new Date(userData.startTime).getTime();
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, sessionLimit - elapsed);
      
      setTimeLeft(remaining);

      if (remaining <= 0) {
        toast.error("Ghost Session Expired. Session Ends Automatically.");
        // Short delay to allow user to see the alert
        setTimeout(handleExit, 2500);
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
        className="fixed top-0 left-0 right-0 z-[9999] bg-white/80 backdrop-blur-md border-b border-slate-200/50 shadow-[0_4px_30px_rgba(0,0,0,0.1)]"
      >
        <div className="max-w-[1920px] mx-auto px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`p-2 rounded-xl transition-all duration-500 ${
                isUrgent ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-slate-900 text-white shadow-xl'
              }`}>
                <Ghost className={`w-5 h-5 ${isUrgent ? 'animate-pulse' : ''}`} />
              </div>
              <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-sm"
              />
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-black tracking-[0.25em] text-slate-400 uppercase leading-none">
                  Secure Admin Session
                </span>
                <div className="h-px w-8 bg-slate-200" />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-slate-900 font-black text-sm sm:text-base tracking-tight uppercase flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  Ghost Mode
                </span>
                <span className="text-slate-300 mx-1">/</span>
                <span className="text-slate-500 text-xs sm:text-sm font-bold">
                  Surveilling: <span className="text-slate-900">{userData.displayName || userData.email}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-8">
            {/* Premium Timer Pill */}
            <div className={`group flex items-center gap-3 px-4 py-1.5 rounded-full border transition-all duration-500 ${
              isUrgent 
                ? 'bg-red-50 border-red-200 text-red-600 shadow-[0_0_20px_rgba(239,68,68,0.1)]' 
                : 'bg-slate-50 border-slate-200/60 text-slate-900 shadow-inner'
            }`}>
              <div className={`flex items-center gap-1.5 ${isUrgent ? 'animate-pulse' : ''}`}>
                <Clock className={`w-4 h-4 ${isUrgent ? 'text-red-600' : 'text-slate-400'}`} />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 hidden sm:inline">
                  Time Remaining
                </span>
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <span className="font-mono font-black text-sm sm:text-lg tabular-nums tracking-tight">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </span>
            </div>

            <button
              onClick={handleExit}
              className="relative overflow-hidden group flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-full font-black text-xs tracking-widest uppercase transition-all duration-300 hover:bg-red-600 hover:shadow-[0_0_25px_rgba(220,38,38,0.4)] active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <XCircle className="relative z-10 w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
              <span className="relative z-10 hidden xs:inline">Terminate Session</span>
              <span className="relative z-10 xs:hidden">Exit</span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GhostBanner;
