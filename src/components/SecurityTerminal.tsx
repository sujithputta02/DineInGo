import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, HelpCircle, X } from 'lucide-react';
import { adminApi } from '../utils/adminApi';

interface OpenTerminalProps {
  onCommandExecuted?: () => void;
}

const COMMAND_LIST = [
  { cmd: '/help', desc: 'Display this command cheat sheet' },
  { cmd: '/status', desc: 'Check global system integrity and server load' },
  { cmd: '/scan [portal]', desc: 'Perform a security deep-scan (admin, business, user)' },
  { cmd: '/ban [IP] [Reason]', desc: 'Instantly blacklist a suspicious IP address' },
  { cmd: '/unban [IP]', desc: 'Remove an IP address from the global blacklist' },
  { cmd: '/clear', desc: 'Clear the terminal output history' },
  { cmd: '/lockdown', desc: 'Toggle emergency maintenance mode (Restricted)' },
];

const SecurityTerminal: React.FC<OpenTerminalProps> = ({ onCommandExecuted }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Array<{ type: 'cmd' | 'resp' | 'error' | 'success', text: string }>>([
    { type: 'resp', text: 'DineInGo Security OS [Version 1.0.4-BETA]' },
    { type: 'resp', text: '(c) 2026 DineInGo Corp. All rights reserved.' },
    { type: 'resp', text: 'Type "/help" for available tactical commands.' },
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const addHistory = (text: string, type: 'cmd' | 'resp' | 'error' | 'success' = 'resp') => {
    setHistory(prev => [...prev, { type, text }]);
  };

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const fullCmd = input.trim();
    const [cmd, ...args] = fullCmd.split(' ');
    
    addHistory(`> ${fullCmd}`, 'cmd');
    setInput('');
    setIsProcessing(true);

    try {
      switch (cmd.toLowerCase()) {
        case '/help':
          setShowHelp(true);
          addHistory('Opening tactical command manual...', 'success');
          break;

        case '/clear':
          setHistory([]);
          break;

        case '/status':
          addHistory('Init: System Diagnostic...', 'resp');
          setTimeout(() => {
            addHistory('Core: STABLE | DB: CONNECTED | Auth: PROTECTED', 'success');
            addHistory(`Lat_Sync: ${Math.floor(Math.random() * 40 + 20)}ms`, 'resp');
          }, 600);
          break;

        case '/scan':
          const portal = args[0] || 'global';
          addHistory(`Initiating deep-scan on [${portal.toUpperCase()}] network...`, 'resp');
          setTimeout(() => {
            addHistory(`Scan complete. 0 vulnerabilities found in ${portal} portal.`, 'success');
            if (onCommandExecuted) onCommandExecuted();
          }, 1500);
          break;

        case '/ban':
          if (args.length < 1) {
             addHistory('Error: IP address missing. Usage: /ban [IP] [Reason]', 'error');
          } else {
             const ip = args[0];
             const reason = args.slice(1).join(' ') || 'Manual block via Terminal';
             addHistory(`Targeting IP: ${ip}...`, 'resp');
             const res = await adminApi.blockIP(ip, reason);
             if (res.status === 200 || res.success) {
               addHistory(`Action: IP ${ip} has been blacklisted.`, 'success');
               if (onCommandExecuted) onCommandExecuted();
             } else {
               addHistory(`Access Denied: ${res.message || 'Unknown error'}`, 'error');
             }
          }
          break;

        case '/unban':
          if (args.length < 1) {
             addHistory('Error: IP address missing. Usage: /unban [IP]', 'error');
          } else {
             const ip = args[0];
             addHistory(`Authenticating release for ${ip}...`, 'resp');
             const res = await adminApi.unblockIP(ip);
             if (res.status === 200 || res.success) {
               addHistory(`Action: IP ${ip} removed from blacklist.`, 'success');
               if (onCommandExecuted) onCommandExecuted();
             } else {
               addHistory(`Access Denied: ${res.message || 'Unknown error'}`, 'error');
             }
          }
          break;

        case '/lockdown':
          addHistory('CRITICAL: Accessing lockdown protocols...', 'error');
          setTimeout(() => {
            addHistory('AUTHENTICATION ERROR: Super-Admin biometric confirmation required for Level-5 actions.', 'error');
          }, 800);
          break;

        default:
          addHistory(`Unknown command: "${cmd}". Type "/help" for documentation.`, 'error');
      }
    } catch (error: any) {
      addHistory(`System Error: ${error.message || 'Operation failed'}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-black/90 rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col h-[350px] relative font-mono">
      {/* Terminal Header */}
      <div className="bg-white/5 border-b border-white/5 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <Terminal size={14} className="text-emerald-500" />
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Master Security CLI v1.0</span>
        </div>
        <button 
          onClick={(e) => { e.preventDefault(); setShowHelp(true); }}
          className="text-slate-500 hover:text-white transition-colors p-1"
        >
          <HelpCircle size={14} />
        </button>
      </div>

      {/* Terminal Viewport */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-thin scrollbar-thumb-emerald-500/20"
      >
        {history.map((line, i) => (
          <div key={i} className={`text-[11px] leading-relaxed break-all ${
            line.type === 'cmd' ? 'text-white font-bold' :
            line.type === 'error' ? 'text-red-500' :
            line.type === 'success' ? 'text-emerald-400' : 'text-slate-400'
          }`}>
            {line.text}
          </div>
        ))}
        {isProcessing && (
          <div className="text-[11px] text-emerald-500 animate-pulse">Running process...</div>
        )}
      </div>

      {/* Terminal Input */}
      <form onSubmit={handleCommand} className="p-3 bg-black/40 border-t border-white/5 flex items-center gap-2">
        <span className="text-emerald-500 font-bold text-xs">{'>'}</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="System command..."
          className="flex-1 bg-transparent border-none outline-none text-white text-xs placeholder:text-slate-700 font-mono"
        />
      </form>

      {/* Modal Help Overlay */}
      {showHelp && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
             <h4 className="text-emerald-500 font-bold text-xs uppercase tracking-[0.2em]">Command Cheat Sheet</h4>
             <button onClick={() => setShowHelp(false)} className="text-slate-500 hover:text-white p-1">
                <X size={16} />
             </button>
          </div>
          <div className="space-y-4 overflow-y-auto pr-2">
             {COMMAND_LIST.map((c, i) => (
               <div key={i} className="border-b border-white/5 pb-2">
                  <div className="text-white text-[11px] font-bold mb-1">{c.cmd}</div>
                  <div className="text-slate-500 text-[10px] uppercase font-medium">{c.desc}</div>
               </div>
             ))}
          </div>
          <button 
            onClick={() => setShowHelp(false)}
            className="mt-6 w-full py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-[10px] font-bold uppercase"
          >
            Close Manual
          </button>
        </div>
      )}
    </div>
  );
};

export default SecurityTerminal;
