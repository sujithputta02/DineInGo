import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Zap } from 'lucide-react';

interface SecurityScoreDialProps {
  stats: any | null;
  logs: any[];
}

const SecurityScoreDial: React.FC<SecurityScoreDialProps> = ({ stats, logs }) => {
  const score = useMemo(() => {
    if (!stats) return 100;
    
    let baseScore = 100;
    
    // Penalize for critical threats
    baseScore -= (stats.criticalThreats || 0) * 15;
    
    // Penalize for recent events (last 24h)
    baseScore -= (stats.last24h || 0) * 0.5;
    
    // Small penalty for each log entry (volume stress)
    baseScore -= (logs.length || 0) * 0.1;
    
    // Boost for active defenses (simulated)
    baseScore += 5; // Rate limiting bonus
    baseScore += 5; // Encryption bonus
    
    return Math.max(0, Math.min(100, Math.round(baseScore)));
  }, [stats, logs]);

  const getColor = (s: number) => {
    if (s > 80) return '#10b981'; // Emerald
    if (s > 50) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const getStatus = (s: number) => {
    if (s > 80) return 'SECURE';
    if (s > 50) return 'VULNERABLE';
    return 'CRITICAL';
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center bg-slate-900/40 p-6 rounded-2xl border border-slate-800/50 backdrop-blur-sm relative overflow-hidden">
      <div className="relative w-40 h-40 flex items-center justify-center">
        {/* Background Circle */}
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="80"
            cy="80"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-slate-800"
          />
          {/* Animated Score Progress */}
          <motion.circle
            cx="80"
            cy="80"
            r="45"
            stroke={getColor(score)}
            strokeWidth="8"
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
        </svg>

        {/* Score Display */}
        <div className="absolute flex flex-col items-center">
          <motion.span 
            className="text-3xl font-bold text-white font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {score}
          </motion.span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Integrity Score</span>
        </div>

        {/* Glow Effect */}
        <div className="absolute inset-0 bg-slate-400 opacity-[0.03] blur-3xl pointer-events-none"></div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-2">
         <div className={`flex items-center gap-2 px-3 py-1 rounded-full border border-opacity-20 ${
           score > 80 ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' :
           score > 50 ? 'bg-amber-500/10 border-amber-500 text-amber-500' :
           'bg-red-500/10 border-red-500 text-red-500'
         }`}>
            {score > 80 ? <ShieldCheck size={14} /> : score > 50 ? <Zap size={14} /> : <ShieldAlert size={14} />}
            <span className="text-[10px] font-bold uppercase tracking-tighter">{getStatus(score)}</span>
         </div>
         <p className="text-[10px] text-slate-500 font-medium text-center px-4">
           {score > 80 ? 'Optimal system performance detected.' : score > 50 ? 'Minor anomalies under investigation.' : 'Immediate attention required.'}
         </p>
      </div>

      {/* Decorative Matrix Text */}
      <div className="absolute top-2 right-2 opacity-10 pointer-events-none">
        <p className="text-[6px] font-mono leading-none">SYS_CHECK_01_PASS</p>
        <p className="text-[6px] font-mono leading-none">AUTH_SYNC_OK</p>
        <p className="text-[6px] font-mono leading-none">DEFN_ACTIVE</p>
      </div>
    </div>
  );
};

export default SecurityScoreDial;
