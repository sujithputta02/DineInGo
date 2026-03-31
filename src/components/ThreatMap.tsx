import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ThreatMapProps {
  logs: any[];
}

const ThreatMap: React.FC<ThreatMapProps> = ({ logs }) => {
  // Deterministic mapping of IP to coordinates (x: 0-100, y: 0-100)
  // This ensures the same IP always pings the same spot on our SVG
  const getCoordinates = (ip: string) => {
    let hash = 0;
    for (let i = 0; i < ip.length; i++) {
      hash = ip.charCodeAt(i) + ((hash << 5) - hash);
    }
    const x = Math.abs((hash % 85) + 5); // Cluster mostly in the center
    const y = Math.abs(((hash >> 8) % 45) + 20); // Avoiding extremes
    return { x: `${x}%`, y: `${y}%` };
  };

  const pings = useMemo(() => {
    return logs.slice(0, 8).map(log => ({
      id: log._id,
      ...getCoordinates(log.ip),
      severity: log.severity
    }));
  }, [logs]);

  return (
    <div className="relative w-full aspect-[2/1] bg-slate-900/30 rounded-2xl border border-slate-800/50 overflow-hidden flex items-center justify-center p-4">
      {/* World Map SVG Background (Simplified/Stylized) */}
      <svg
        viewBox="0 0 1000 500"
        className="w-full h-full opacity-20 fill-slate-500 stroke-slate-700 stroke-[0.5]"
      >
        <path d="M150,150 Q200,100 250,150 T350,150 Q450,150 500,200 T650,250 Q750,250 850,200 T950,150" fill="none" />
        {/* Stylized Landmasses */}
        <path d="M250,100 Q300,80 350,120 T400,180 Q350,250 280,220 T220,150 Z" />
        <path d="M600,150 Q650,120 750,180 T800,280 Q700,350 620,300 T580,200 Z" />
        <path d="M100,300 Q150,280 200,320 T250,380 Q180,450 120,400 T80,320 Z" />
        <path d="M700,350 Q800,320 900,380 T850,450 Q750,480 650,420 T680,380 Z" />
      </svg>

      {/* Grid Lines Overlay */}
      <div className="absolute inset-0 grid grid-cols-12 grid-rows-6 pointer-events-none opacity-5">
        {[...Array(72)].map((_, i) => (
          <div key={i} className="border-[0.5px] border-white/20"></div>
        ))}
      </div>

      {/* Threat Pings */}
      <AnimatePresence>
        {pings.map((ping) => (
          <motion.div
            key={ping.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute z-10"
            style={{ left: ping.x, top: ping.y }}
          >
            {/* Core Point */}
            <div className={`w-1.5 h-1.5 rounded-full ${ping.severity === 'critical' ? 'bg-red-500' : 'bg-orange-500 shadow-md shadow-orange-500/50'}`}></div>
            
            {/* Expanding Ping Rings */}
            <motion.div
              animate={{ scale: [1, 4], opacity: [0.6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
              className={`absolute inset-0 rounded-full border ${ping.severity === 'critical' ? 'border-red-500' : 'border-orange-500'}`}
            ></motion.div>
            <motion.div
              animate={{ scale: [1, 2.5], opacity: [0.4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
              className={`absolute inset-0 rounded-full border ${ping.severity === 'critical' ? 'border-red-500' : 'border-orange-500'}`}
            ></motion.div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* HUD Elements */}
      <div className="absolute top-3 left-4 flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">Global Watchtower Active</span>
      </div>

      <div className="absolute bottom-3 right-4 text-right">
        <p className="text-[8px] font-mono text-slate-500 uppercase tracking-tighter">Live Audit Stream</p>
        <p className="text-[10px] font-mono text-blue-400 font-bold">MODE: REAL-TIME_TRACKING</p>
      </div>
    </div>
  );
};

export default ThreatMap;
