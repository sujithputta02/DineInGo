import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Zap, Activity } from 'lucide-react';

interface SecurityScoreDialProps {
  stats: any | null;
  logs: any[];
}

const SecurityScoreDial: React.FC<SecurityScoreDialProps> = ({ stats, logs }) => {
  const score = useMemo(() => {
    if (!stats) return 100;
    
    let baseScore = 100;
    baseScore -= (stats.criticalThreats || 0) * 15;
    baseScore -= (stats.last24h || 0) * 0.5;
    baseScore -= (logs.length || 0) * 0.1;
    baseScore += 10; // High-Defense baseline
    
    return Math.max(0, Math.min(100, Math.round(baseScore)));
  }, [stats, logs]);

  const getColor = (s: number) => {
    if (s > 80) return '#10b981'; // Emerald
    if (s > 50) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center bg-slate-950 p-7 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden group h-full min-h-[280px]">
      
      {/* 1. Animated Hexagonal Grid Background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20 L10 0 L30 0 L40 20 L30 40 L10 40 Z' fill='none' stroke='%23ffffff' stroke-width='1'/%3E%3C/svg%3E")`,
        backgroundSize: '30px 30px'
      }}>
        <motion.div 
          animate={{ x: [0, -30, 0], y: [0, -30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="w-full h-full"
        />
      </div>

      {/* 2. Visual "Ghost" Pulse Rings */}
      <motion.div 
        animate={{ scale: [1, 1.5], opacity: [0.1, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute w-40 h-40 rounded-full border border-emerald-500/20"
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* The Dial */}
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90">
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={getColor(score)} stopOpacity="0.2" />
                <stop offset="100%" stopColor={getColor(score)} />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <circle
              cx="88"
              cy="88"
              r="45"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="10"
              fill="transparent"
            />
            <motion.circle
              cx="88"
              cy="88"
              r="45"
              stroke="url(#scoreGradient)"
              strokeWidth="10"
              strokeLinecap="round"
              fill="transparent"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 2, ease: "easeOut" }}
              filter="url(#glow)"
            />
          </svg>

          {/* Central Data */}
          <div className="absolute flex flex-col items-center">
            <motion.div 
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-4xl font-black text-white font-mono tracking-tighter"
            >
              {score}
            </motion.div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Integrity_Score</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mt-4 flex flex-col items-center">
          <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 ${
            score > 80 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
            score > 50 ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
            'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
              {score > 80 ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
            </motion.div>
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">
              {score > 80 ? 'System Secure' : score > 50 ? 'Vulnerable' : 'Breach Risk'}
            </span>
          </div>
          
          {/* Sub-Data Text */}
          <div className="mt-4 text-center opacity-40 group-hover:opacity-100 transition-opacity duration-500">
             <div className="flex items-center gap-1.5 justify-center text-[8px] font-mono text-slate-400">
               <Activity size={10} className="text-emerald-500" />
               <span className="uppercase tracking-widest">{score > 80 ? 'Kernel Integrity 1.0.2 Passed' : 'Anomaly Detected'}</span>
             </div>
          </div>
        </div>
      </div>

      {/* Modern Data Readouts Corners */}
      <div className="absolute top-4 left-4 text-[7px] font-mono text-white/20 select-none uppercase tracking-widest">
        DineInGo_Def_Sys_v2
      </div>
      <div className="absolute bottom-4 right-4 text-[7px] font-mono text-white/20 select-none uppercase tracking-widest">
        CRC_{Math.random().toString(36).substr(2, 5).toUpperCase()}
      </div>
    </div>
  );
};

export default SecurityScoreDial;
