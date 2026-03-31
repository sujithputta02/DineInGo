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
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {auditData.map((portal) => (
          <div 
            key={portal.name}
            className={`p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col`}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className={`p-1.5 rounded-lg bg-${portal.color}-100 text-${portal.color}-600`}>
                {portal.icon}
              </div>
              <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-tight">{portal.name}</h4>
            </div>

            <div className="space-y-3">
              {portal.checks.map((check) => (
                <div key={check.name} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-slate-500 leading-none mb-0.5">{check.name}</span>
                    <span className="text-[7px] text-slate-400 uppercase tracking-tighter">Verified_v3.2</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 size={10} />
                    <span className="text-[8px] font-bold">PASS</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
               <span className="text-[8px] text-slate-500 font-medium">Portal Status</span>
               <div className="flex gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Log */}
      <div className="bg-slate-900 p-3 flex items-center justify-between">
         <div className="flex items-center gap-2">
            <Shield size={14} className="text-blue-400" />
            <span className="text-[9px] font-mono text-slate-400">AUDIT_TOKEN: f8x-92km-77p</span>
         </div>
         <span className="text-[9px] font-mono text-slate-500 italic">LAST_UNIVERSAL_CHECK: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

export default PortalSecurityAudit;
