import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, Target, Zap } from 'lucide-react';

interface ThreatMapProps {
  logs: any[];
}

const ThreatMap: React.FC<ThreatMapProps> = ({ logs }) => {
  // Geolocation simulation
  const getCoordinates = (ip: string) => {
    let hash = 0;
    for (let i = 0; i < ip.length; i++) {
        hash = ip.charCodeAt(i) + ((hash << 5) - hash);
    }
    const x = Math.abs((hash % 80) + 10);
    const y = Math.abs(((hash >> 8) % 40) + 20);
    return { x: `${x}%`, y: `${y}%` };
  };

  const currentThreats = useMemo(() => {
    return logs.slice(0, 12).map(log => ({
      id: log._id,
      ...getCoordinates(log.ip),
      severity: log.severity,
      ip: log.ip
    }));
  }, [logs]);

  return (
    <div className="relative w-full aspect-[21/9] lg:aspect-[2/1] bg-slate-950 rounded-3xl border border-white/5 shadow-2xl overflow-hidden group min-h-[300px]">
      
      {/* 1. Technical Grid Overlay */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }}></div>

      {/* 2. Tactical World Map SVG (Dotted Style) */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <svg viewBox="0 0 1000 500" className="w-full h-full opacity-[0.08] fill-emerald-500/20">
          {/* North America */}
          <circle cx="200" cy="180" r="40" /><circle cx="250" cy="160" r="30" />
          {/* Europe */}
          <circle cx="500" cy="150" r="25" /><circle cx="530" cy="140" r="20" />
          {/* Asia */}
          <circle cx="650" cy="200" r="50" /><circle cx="750" cy="220" r="40" />
          {/* South America */}
          <circle cx="300" cy="350" r="35" /><circle cx="330" cy="380" r="25" />
          {/* Africa */}
          <circle cx="500" cy="300" r="45" /><circle cx="530" cy="340" r="30" />
          {/* Oceania */}
          <circle cx="850" cy="350" r="30" />
        </svg>
      </div>

      {/* 3. Rotating Radar Sweep */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'conic-gradient(from 0deg, transparent 60%, rgba(16, 185, 129, 0.1) 100%)'
        }}
      />

      {/* 4. Coordinate Crosshair (Moves with mouse) */}
      <div className="absolute inset-0 opacity-10 group-hover:opacity-30 transition-opacity">
        <div className="absolute top-1/2 left-0 w-full h-[0.5px] bg-emerald-500/50"></div>
        <div className="absolute left-1/2 top-0 w-[0.5px] h-full bg-emerald-500/50"></div>
      </div>

      {/* 5. Threat Crosshairs */}
      <AnimatePresence>
        {currentThreats.map((threat) => (
          <motion.div
            key={threat.id}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            className="absolute z-20 flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
            style={{ left: threat.x, top: threat.y }}
          >
            <div className={`relative ${threat.severity === 'critical' ? 'text-red-500' : 'text-emerald-500'}`}>
               <Target size={14} className="animate-pulse" />
               
               {/* Metadata Label */}
               <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-2 py-1 rounded border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[7px] font-mono font-bold leading-none uppercase">ID_{threat.id.substr(0,4)}</p>
                  <p className="text-[9px] font-mono leading-none mt-1">{threat.ip}</p>
               </div>
            </div>
            
            {/* Ping Wave */}
            <motion.div
              animate={{ scale: [1, 3], opacity: [0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`absolute w-4 h-4 rounded-full border ${threat.severity === 'critical' ? 'border-red-500' : 'border-emerald-500'}`}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 6. Dashboard HUD Elements */}
      <div className="absolute top-5 left-6 flex items-center gap-3">
        <div className="flex gap-1.5">
           <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></motion.div>
           <div className="w-2.5 h-2.5 bg-emerald-500/20 rounded-full"></div>
           <div className="w-2.5 h-2.5 bg-emerald-500/20 rounded-full"></div>
        </div>
        <div className="flex flex-col">
           <span className="text-[10px] font-black text-white tracking-widest uppercase mb-0.5">Global Watchtower V2</span>
           <span className="text-[7px] font-mono text-emerald-500/60 font-bold">Scanning Active Portals...</span>
        </div>
      </div>

      <div className="absolute bottom-5 right-6 text-right">
         <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
            <Zap size={10} className="text-emerald-500 animate-bounce" />
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Mode: Tactical_HUD</span>
         </div>
         <p className="mt-2 text-[7px] font-mono text-white/30 uppercase tracking-[0.3em]">Lat_Long_Sync: OK</p>
      </div>

      <div className="absolute top-5 right-6 flex flex-col items-end opacity-40">
         <span className="text-[8px] font-mono text-gray-500 uppercase leading-none mb-1">Audit_Traffic</span>
         <div className="flex gap-0.5">
            {[...Array(12)].map((_, i) => (
              <motion.div 
                key={i}
                animate={{ height: [4, Math.random() * 12 + 4, 4] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                className="w-1 bg-emerald-500"
              />
            ))}
         </div>
      </div>
    </div>
  );
};

export default ThreatMap;
