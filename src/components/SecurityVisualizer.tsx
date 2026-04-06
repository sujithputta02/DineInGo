import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ShieldAlert, ShieldCheck, Lock, Activity, Wifi, Disc, Terminal, Zap, Globe, Fingerprint, Server } from 'lucide-react';

interface SecurityVisualizerProps {
  logs: any[];
  stats: any | null;
  isScanning?: boolean;
}

function SecurityVisualizer({ logs, stats, isScanning = false }: SecurityVisualizerProps) {
  const [pulseActive, setPulseActive] = useState(false);
  const [attacks, setAttacks] = useState<any[]>([]);
  const lastLogId = useRef<string | null>(null);

  // Trigger pulse and simulation when new logs arrive
  useEffect(() => {
    if (logs.length > 0 && logs[0]._id !== lastLogId.current) {
      lastLogId.current = logs[0]._id;
      setPulseActive(true);
      setTimeout(() => setPulseActive(false), 1000);

      const newAttack = {
        id: Math.random().toString(36).substr(2, 9),
        angle: Math.random() * 360,
        severity: logs[0].severity,
        portal: logs[0].portal
      };
      setAttacks(prev => [...prev, newAttack].slice(-10));
    }
  }, [logs]);

  // Simulate particle storm during scanning
  useEffect(() => {
    let interval: any;
    if (isScanning) {
      interval = setInterval(() => {
        const newAttack = {
          id: Math.random().toString(36).substr(2, 9),
          angle: Math.random() * 360,
          severity: Math.random() > 0.8 ? 'critical' : 'low',
          portal: 'system'
        };
        setAttacks(prev => [...prev, newAttack].slice(-20));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  const securityLevels = [
    { id: 'L1', name: 'Session Guard', status: 'ACTIVE', color: 'bg-blue-500', icon: <Fingerprint size={12} />, desc: 'Single-tab session obfuscation' },
    { id: 'L2', name: 'Path Masquerade', status: 'ACTIVE', color: 'bg-emerald-500', icon: <Globe size={12} />, desc: 'Dynamic URL & Path sanitization' },
    { id: 'L3', name: 'OWASP Firewall', status: 'ACTIVE', color: 'bg-yellow-500', icon: <Activity size={12} />, desc: 'Layer 7 rate-limiting and filtering' },
    { id: 'L4', name: 'Fail-to-Ban', status: 'ACTIVE', color: 'bg-orange-500', icon: <Zap size={12} />, desc: 'Auto-blocking suspicious IP clusters' },
    { id: 'L5', name: 'DineInGo Core', status: 'SHIELDED', color: 'bg-red-500', icon: <ShieldCheck size={12} />, desc: 'System-wide secure kernel defense' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
      {/* Background Grid Decoration */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)`,
        backgroundSize: '24px 24px'
      }}></div>

      {/* Main Radar / Firewall Section */}
      <div className="lg:col-span-3 h-[300px] sm:h-[400px] relative flex items-center justify-center bg-slate-900/50 rounded-2xl border border-slate-800/50 overflow-hidden">
        
        {/* Radar Rings & Sweep - Scaled for mobile */}
        <div className="relative scale-75 sm:scale-100 flex items-center justify-center w-full h-full">
          {/* Radar Scanning Rings */}
          <div className="absolute w-[350px] h-[350px] border border-blue-500/20 rounded-full"></div>
          <div className="absolute w-[250px] h-[250px] border border-blue-500/10 rounded-full"></div>
          <div className="absolute w-[150px] h-[150px] border border-blue-500/5 rounded-full"></div>

          {/* Rotating Scanning Sweep */}
          <motion.div 
            className="absolute w-[350px] h-[350px] rounded-full z-0"
            style={{
              background: isScanning 
                ? 'conic-gradient(from 0deg, transparent 40%, rgba(239, 68, 68, 0.2) 100%)'
                : 'conic-gradient(from 0deg, transparent 50%, rgba(59, 130, 246, 0.1) 100%)'
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: isScanning ? 0.6 : 4, repeat: Infinity, ease: "linear" }}
          ></motion.div>

          {/* The Core Firewall Shield */}
          <div className="relative z-10 flex flex-col items-center">
            <motion.div 
              className={`w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center border-4 relative transition-all duration-300 ${
                pulseActive ? 'border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)]' : 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)]'
              }`}
              animate={{ 
                scale: pulseActive ? [1, 1.1, 1] : [1, 1.05, 1],
                opacity: [0.8, 1, 0.8] 
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="bg-slate-900 w-full h-full rounded-full flex items-center justify-center overflow-hidden">
                 {/* Hexagon Pattern Placeholder */}
                 <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                 {pulseActive ? (
                   <ShieldAlert className="text-red-500 w-10 h-10 sm:w-12 sm:h-12" />
                 ) : (
                   <ShieldCheck className="text-blue-500 w-10 h-10 sm:w-12 sm:h-12" />
                 )}
              </div>
              
              {/* Pulsing Outer Ring */}
              <motion.div 
                className={`absolute inset-0 rounded-full border-2 ${pulseActive ? 'border-red-500' : 'border-blue-500'}`}
                animate={{ 
                  scale: [1, 1.5, 2],
                  opacity: [0.5, 0.2, 0]
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
              ></motion.div>
            </motion.div>
            
            <div className="mt-4 text-center">
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Defense Status</p>
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
                 <div className={`w-2 h-2 rounded-full animate-pulse ${pulseActive ? 'bg-red-500' : 'bg-green-500'}`}></div>
                 <span className="text-[10px] sm:text-xs font-mono text-white whitespace-nowrap">CORE SECURE</span>
              </div>
            </div>
          </div>

          {/* Real-time simulated attacks/requests */}
          <AnimatePresence>
            {attacks.map((attack) => (
              <motion.div
                key={attack.id}
                initial={{ 
                  x: 200 * Math.cos(attack.angle * (Math.PI / 180)), 
                  y: 200 * Math.sin(attack.angle * (Math.PI / 180)),
                  opacity: 0,
                  scale: 0
                }}
                animate={{ 
                  x: 0, 
                  y: 0,
                  opacity: 1,
                  scale: 1
                }}
                exit={{ opacity: 0, scale: 2 }}
                transition={{ duration: 0.8, ease: "circIn" }}
                className="absolute z-20"
              >
                <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full shadow-lg ${
                  attack.severity === 'critical' ? 'bg-red-500' : 
                  attack.severity === 'high' ? 'bg-orange-500' : 'bg-blue-400'
                }`}></div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Real-time stats text overlay - Hidden on very small screens */}
        <div className="hidden sm:block absolute top-6 left-6 font-mono text-[10px] text-blue-400/60 bg-slate-900/40 p-3 rounded-lg border border-white/5 backdrop-blur-md">
           <div className="flex items-center gap-2 mb-1">
             <Terminal size={10} />
             <span>{isScanning ? 'INTEGRITY_SCAN_ACTIVE' : 'SEC_CMD_CENTER v1.02'}</span>
           </div>
           <div className="space-y-1">
             <p>{isScanning ? 'SCAN_DEPTH: DEPTH_7 (FULL)' : `UPTIME: ${Math.floor(Date.now() / 10000000) % 1000}h`}</p>
             <p>{isScanning ? 'STATUS: AUDITING_LAYERS...' : `TRAFFIC: ${stats?.total || 0}`}</p>
             <p>{isScanning ? 'VERIFYING: KERNEL_INTEGRITY' : `BLOCKED: ${stats?.blockedIpsCount || 0}`}</p>
             <p className={isScanning ? 'text-yellow-400 animate-pulse' : 'text-red-400'}>
               {isScanning ? 'ALERT: ENGINE_OVERLOAD_PREVENTED' : `CRITICAL: ${stats?.criticalThreats || 0}`}
             </p>
           </div>
        </div>

        {/* Deep Scan Overlay */}
        <AnimatePresence>
          {isScanning && (
            <motion.div 
              initial={{ opacity: 0, scale: 1.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute z-30 pointer-events-none flex flex-col items-center"
            >
              <div className="bg-red-500/20 border border-red-500/50 backdrop-blur-xl px-6 py-3 rounded-xl">
                 <div className="flex items-center gap-3">
                   <Zap className="text-red-500 animate-bounce" size={20} />
                   <span className="text-sm font-bold text-white tracking-widest uppercase">Deep Scan In Progress</span>
                   <div className="flex gap-1">
                      <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-white rounded-full" />
                      <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.3 }} className="w-1.5 h-1.5 bg-white rounded-full" />
                      <motion.div animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.6 }} className="w-1.5 h-1.5 bg-white rounded-full" />
                   </div>
                 </div>
              </div>
              <p className="mt-4 text-[10px] font-mono text-red-400 uppercase tracking-widest bg-black/50 px-3 py-1 rounded">DO_NOT_DISCONNECT_SYSTEM_DURING_AUDIT</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HUD Elements - Hidden on small screens */}
        <div className="hidden md:flex absolute bottom-6 right-6 flex-col items-end opacity-40">
           <Wifi size={16} className="text-blue-400 animate-pulse mb-2" />
           <p className="text-[8px] text-blue-400 font-mono tracking-widest uppercase">Encryption: AES-256-GCM</p>
           <p className="text-[8px] text-blue-400 font-mono tracking-widest uppercase mt-0.5">TLS: 1.3 Active</p>
        </div>
      </div>

      {/* Levels of Security Sidebar */}
      <div className="lg:col-span-1 space-y-4">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
           <Zap className="text-yellow-400" size={16} />
           <h3 className="text-sm font-bold text-white uppercase tracking-wider">Defense Tiers</h3>
        </div>
        
        <div className="space-y-3">
          {securityLevels.map((lvl) => (
            <motion.div 
               key={lvl.id}
               whileHover={{ x: 5 }}
               className="group relative p-3 bg-slate-900/80 rounded-xl border border-slate-800 hover:border-slate-700 transition-all cursor-crosshair"
            >
               <div className="flex items-center justify-between mb-1">
                 <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${lvl.color} text-white`}>{lvl.id}</span>
                    <span className="text-xs font-bold text-slate-100 group-hover:text-blue-400 transition-colors">{lvl.name}</span>
                 </div>
                 <span className="text-[8px] font-bold text-slate-500 flex items-center gap-1">
                   <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                   {lvl.status}
                 </span>
               </div>
               <p className="text-[10px] text-slate-400 leading-tight pr-4">{lvl.desc}</p>
               <div className="absolute top-3 right-3 opacity-20 group-hover:opacity-100 group-hover:text-blue-400 transition-all">
                  {lvl.icon}
               </div>
            </motion.div>
          ))}
        </div>

        {/* Global Security Index */}
        <div className="mt-6 pt-4 border-t border-slate-800">
           <div className="flex items-center justify-between mb-2">
             <span className="text-[10px] text-slate-500 font-bold uppercase">Integrity Index</span>
             <span className="text-xs font-bold text-emerald-400">99.8%</span>
           </div>
           <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                initial={{ width: 0 }}
                animate={{ width: '99.8%' }}
                transition={{ duration: 2, ease: "easeOut" }}
              ></motion.div>
           </div>
        </div>
      </div>
    </div>
  );
}

export default SecurityVisualizer;
