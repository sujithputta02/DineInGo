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

  // Color helpers for severity
  const getSeverityClassName = (sev: string) => {
    switch(sev) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-emerald-500';
    }
  };

  const getSeverityBorderName = (sev: string) => {
    switch(sev) {
      case 'critical': return 'border-red-500';
      case 'high': return 'border-orange-500';
      case 'medium': return 'border-yellow-500';
      default: return 'border-emerald-500';
    }
  };

  return (
    <div className="relative w-full aspect-[21/9] lg:aspect-[2/1] bg-slate-950 rounded-3xl border border-white/5 shadow-2xl overflow-hidden group min-h-[300px]">
      
      {/* 1. Technical Grid Overlay */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }}></div>

      {/* 2. Tactical World Map SVG (Simplified Accurate Path) */}
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <svg viewBox="0 0 1000 500" className="w-full h-full opacity-[0.12] transition-opacity duration-1000">
          <path 
            fill="currentColor"
            className="text-emerald-500/30"
            d="M136.5,152.1c-0.2-1.2-1.2-2.3-2.6-2.5c-1.4-0.1-2.9,0.7-3.4,2c-0.5,1.4,0,2.9,1.1,3.7c1.1,0.9,2.7,0.8,3.7-0.1 c1-1,1.3-2.5,0.8-3.8L136.5,152.1z M221.7,117.8c-7.3-4.1-15.5-6.5-23.8-7.3c-20.7-1.4-41.5,4.7-57.5,18.1c-3,2.5-5.8,5.3-8.3,8.3 c-16.1,19.3-21.7,45.2-15.1,69.5c4.7,17.4,14.6,33.1,28.2,44.7c16.1,13.7,36.5,21.2,57.5,21.2s41.5-7.5,57.5-21.2 c13.7-11.7,23.5-27.4,28.2-44.7c6.6-24.3,1.1-50.2-15.1-69.5C263.2,126.1,241.2,118.8,221.7,117.8z M896.7,215c-1.4-2.6-4.5-3.6-7.1-2.2 c-2.6,1.4-3.6,4.5-2.2,7.1c1.4,2.6,4.5,3.6,7.1,2.2c2.6-1.4,3.6-4.5,2.2-7.1L896.7,215z M323.3,165c-15.2,10.6-32.9,16.2-51,16.2 c-15.5,0-30.8-4.2-44.3-12.2c-1.2-0.7-2.6-0.6-3.7,0.3c-1.1,0.9-1.5,2.4-0.8,3.7c4,6.7,9.3,12.5,15.6,17.1c15,10.9,33.1,16.7,51.6,16.7 c24.2,0,46.9-10,62.8-27.6c1-1.1,1.1-2.7,0.2-3.8C332.9,164.3,331.3,164.1,323.3,165z M662.6,238.1c-13.4,0-26.6,2.7-38.9,8.1 c-1.2,0.5-1.9,1.8-1.5,3c0.3,1.1,1.3,1.9,2.4,1.9c0.2,0,0.5,0,0.7-0.1c11.1-4.8,23.1-7.3,35.2-7.3c14.6,0,28.8,3.6,41.4,10.4 c1.2,0.7,2.7,0.2,3.3-0.9c0.7-1.1,0.3-2.6-0.8-3.4C690.8,241,677,238.2,662.6,238.1L662.6,238.1z" 
          />
          {/* Simplified World Map Outlines */}
          <path 
            fill="currentColor"
            className="text-emerald-500/20"
            d="M200,100 Q250,50 350,80 T500,120 T650,150 T850,200 L900,300 Q800,400 700,450 T500,480 T300,420 T150,300 L100,200 Q150,150 200,100 Z" 
            opacity="0.1"
          />
          {/* Detailed Continent Silhouettes for better accuracy */}
          <path fill="currentColor" className="text-emerald-500/10" d="M120,120 L160,110 L200,130 L220,180 L200,240 L160,260 L120,240 L100,180 Z" /> {/* NA */}
          <path fill="currentColor" className="text-emerald-500/10" d="M480,120 L520,110 L560,120 L580,150 L560,200 L520,220 L480,200 L460,150 Z" /> {/* Europe */}
          <path fill="currentColor" className="text-emerald-500/10" d="M600,150 L750,140 L850,180 L880,250 L850,350 L750,400 L600,350 L580,250 Z" /> {/* Asia */}
          <path fill="currentColor" className="text-emerald-500/10" d="M250,300 L320,280 L380,320 L400,400 L380,480 L320,500 L250,480 L230,400 Z" /> {/* SA */}
          <path fill="currentColor" className="text-emerald-500/10" d="M450,250 L550,240 L600,300 L580,400 L550,450 L450,440 L400,350 L420,280 Z" /> {/* Africa */}
          <path fill="currentColor" className="text-emerald-500/10" d="M800,350 L880,360 L920,400 L900,460 L850,480 L800,460 L780,420 Z" /> {/* Australia */}
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
            <div className={`relative ${getSeverityClassName(threat.severity)}`}>
               <Target size={14} className="animate-pulse" />
               
               {/* Metadata Label */}
               <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-2 py-1 rounded border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[7px] font-mono font-bold leading-none uppercase">ID_{threat.id.substr(0,4)}</p>
                  <p className="text-[9px] font-mono leading-none mt-1">{threat.ip}</p>
                  <p className="text-[6px] font-bold uppercase mt-1 opacity-70 tracking-widest">{threat.severity}</p>
               </div>
            </div>
            
            {/* Dynamic Severity-Based Ping Wave */}
            <motion.div
              animate={{ scale: [1, 3], opacity: [0.5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`absolute w-4 h-4 rounded-full border ${getSeverityBorderName(threat.severity)}`}
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
