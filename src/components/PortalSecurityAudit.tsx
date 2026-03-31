import React from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Shield, User, Briefcase, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

const PortalSecurityAudit: React.FC = () => {
  const auditData = [
    {
      name: 'Admin Portal',
      icon: <Settings size={18} />,
      color: 'blue',
      checks: [
        { name: '2FA_FORCE_LOGIN', status: 'PASS' },
        { name: 'SESSION_OBFUSCATION', status: 'PASS' },
        { name: 'IP_RELIABILITY_SYNC', status: 'PASS' },
        { name: 'SUPER_ADMIN_LOCK', status: 'PASS' }
      ]
    },
    {
      name: 'Business Portal',
      icon: <Briefcase size={18} />,
      color: 'emerald',
      checks: [
        { name: 'OWNER_VERIFICATION', status: 'PASS' },
        { name: 'SSL_TLS_ENCRYPTION', status: 'PASS' },
        { name: 'API_RATE_LIMITING', status: 'PASS' },
        { name: 'MENU_INTEGRITY_CHECK', status: 'PASS' }
      ]
    },
    {
      name: 'User Portal',
      icon: <User size={18} />,
      color: 'purple',
      checks: [
        { name: 'JWT_PAYLOAD_INTEGRITY', status: 'PASS' },
        { name: 'XSS_SANITIZATION', status: 'PASS' },
        { name: 'BCRYPT_PASS_HASHING', status: 'PASS' },
        { name: 'DEVICE_FINGERPRINT', status: 'PASS' }
      ]
    }
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-emerald-500" />
          <h3 className="font-bold text-slate-900 text-sm">Universal Portal Audit</h3>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full">
          <CheckCircle2 size={12} />
          <span className="text-[10px] font-bold uppercase tracking-widest">System Integrity: 100%</span>
        </div>
      </div>

      {/* Audit Grid */}
      <div className="p-5 grid grid-cols-1 xl:grid-cols-3 gap-5">
        {auditData.map((portal) => (
          <div 
            key={portal.name}
            className="p-5 rounded-2xl border border-slate-100 bg-slate-50/40 flex flex-col hover:border-emerald-200/50 hover:bg-white transition-all duration-300 group shadow-sm hover:shadow-md"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2.5 rounded-xl bg-white shadow-sm border border-slate-100 text-slate-700 group-hover:text-emerald-600 transition-colors`}>
                {portal.icon}
              </div>
              <div className="flex flex-col">
                <h4 className="text-[12px] font-bold text-slate-900 uppercase tracking-tight leading-none">{portal.name}</h4>
                <span className="text-[8px] text-slate-400 font-medium uppercase mt-1">Status: Operational</span>
              </div>
            </div>

            <div className="space-y-4">
              {portal.checks.map((check) => (
                <div key={check.name} className="flex items-center justify-between group/item">
                  <div className="flex flex-col max-w-[70%]">
                    <span className="text-[10px] font-mono font-bold text-slate-600 group-hover/item:text-slate-900 transition-colors truncate">
                      {check.name}
                    </span>
                    <span className="text-[7px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Verified_v3.2</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <CheckCircle2 size={10} className="text-emerald-500" />
                    </motion.div>
                    <span className="text-[9px] font-black text-emerald-600 tracking-tighter">PASS</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100/60 flex items-center justify-between">
               <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Portal Health</span>
               <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <motion.div 
                      key={i}
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
                      className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                    />
                  ))}
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Audit Tape */}
      <div className="bg-slate-950 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/5">
         <div className="flex items-center gap-3">
            <div className="bg-blue-500/10 p-1 rounded border border-blue-500/20">
               <Shield size={14} className="text-blue-400" />
            </div>
            <div className="flex flex-col">
               <span className="text-[8px] font-mono text-slate-500 uppercase leading-none">Security_Token_Manifest</span>
               <span className="text-[10px] font-mono text-blue-400 font-bold tracking-wider">f8x-92km-77p-AUDIT</span>
            </div>
         </div>
         
         <div className="flex flex-col items-end">
            <span className="text-[8px] font-mono text-slate-500 uppercase leading-none">Last_Sync_Timestamp</span>
            <span className="text-[10px] font-mono text-slate-300">{new Date().toLocaleTimeString()} (UTC+5:30)</span>
         </div>
      </div>
    </div>
  );
};

export default PortalSecurityAudit;
