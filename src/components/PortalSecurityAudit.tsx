import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Shield,
  AlertTriangle,
  Info,
  KeyRound,
  ShieldHalf,
  Radar,
  History,
} from 'lucide-react';
import { motion } from 'framer-motion';

export type PortalCheckStatus = 'PASS' | 'WARN' | 'FAIL' | 'INFO';

export interface PortalAuditCategory {
  id: string;
  name: string;
  integrity: number;
  checks: Array<{
    name: string;
    status: PortalCheckStatus;
    detail: string;
  }>;
}

export interface DeepScanViewModel {
  scannedAt: string;
  score: number;
  summary: { pass: number; info: number; warn: number; fail: number };
  categories: PortalAuditCategory[];
  recommendations: string[];
}

interface PortalSecurityAuditProps {
  scan?: DeepScanViewModel | null;
  isScanning?: boolean;
}

const iconFor = (id: string) => {
  switch (id) {
    case 'secrets':
      return <KeyRound size={18} />;
    case 'hardening':
      return <ShieldHalf size={18} />;
    case 'portal':
      return <Radar size={18} />;
    case 'exposure':
      return <History size={18} />;
    default:
      return <Shield size={18} />;
  }
};

const statusBadge = (status: PortalCheckStatus) => {
  switch (status) {
    case 'PASS':
      return {
        wrap: 'bg-emerald-500/5 border-emerald-500/10 text-emerald-600',
        icon: <CheckCircle2 size={10} className="text-emerald-500" />,
      };
    case 'WARN':
      return {
        wrap: 'bg-amber-500/5 border-amber-500/10 text-amber-700',
        icon: <AlertTriangle size={10} className="text-amber-500" />,
      };
    case 'FAIL':
      return {
        wrap: 'bg-red-500/5 border-red-500/10 text-red-600',
        icon: <XCircle size={10} className="text-red-500" />,
      };
    default:
      return {
        wrap: 'bg-blue-500/5 border-blue-500/10 text-blue-600',
        icon: <Info size={10} className="text-blue-500" />,
      };
  }
};

const fallback: DeepScanViewModel = {
  scannedAt: '',
  score: 0,
  summary: { pass: 0, info: 0, warn: 0, fail: 0 },
  categories: [
    {
      id: 'secrets',
      name: 'Secret Hygiene',
      integrity: 0,
      checks: [
        {
          name: 'AWAITING_DEEP_SCAN',
          status: 'INFO',
          detail: 'Click “Run Security Audit” to scan secrets, env hardening, and exposure risks.',
        },
      ],
    },
    {
      id: 'hardening',
      name: 'Runtime Hardening',
      integrity: 0,
      checks: [
        {
          name: 'AWAITING_DEEP_SCAN',
          status: 'INFO',
          detail: 'NODE_ENV, HTTPS origins, and secret strength will be checked live.',
        },
      ],
    },
    {
      id: 'portal',
      name: 'Portal Defense',
      integrity: 0,
      checks: [
        {
          name: 'AWAITING_DEEP_SCAN',
          status: 'INFO',
          detail: 'IP blacklist and recent critical threat signals will appear here.',
        },
      ],
    },
    {
      id: 'exposure',
      name: 'Exposure & History',
      integrity: 0,
      checks: [
        {
          name: 'AWAITING_DEEP_SCAN',
          status: 'INFO',
          detail: 'Previously leaked cluster / git-history risk advisories.',
        },
      ],
    },
  ],
  recommendations: [],
};

const PortalSecurityAudit: React.FC<PortalSecurityAuditProps> = ({ scan, isScanning }) => {
  const data = scan || fallback;
  const integrity =
    scan != null
      ? `${data.score}%`
      : '—';
  const headerTone =
    !scan
      ? 'bg-slate-100 text-slate-600'
      : data.summary.fail > 0
        ? 'bg-red-100 text-red-700'
        : data.summary.warn > 0
          ? 'bg-amber-100 text-amber-800'
          : 'bg-emerald-100 text-emerald-700';

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-50 bg-slate-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-emerald-500" />
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Universal Deep Security Audit</h3>
            <p className="text-[10px] text-slate-400 font-medium">
              Secrets · Hardening · Portal defense · Exposure history
            </p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${headerTone}`}>
          {isScanning ? (
            <span className="text-[10px] font-bold uppercase tracking-widest animate-pulse">
              Scanning…
            </span>
          ) : (
            <>
              {scan && data.summary.fail > 0 ? (
                <XCircle size={12} />
              ) : (
                <CheckCircle2 size={12} />
              )}
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Integrity: {integrity}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-4 gap-5">
        {data.categories.map((portal) => (
          <div
            key={portal.id}
            className="p-5 rounded-2xl border border-slate-100 bg-slate-50/40 flex flex-col hover:border-emerald-200/50 hover:bg-white transition-all duration-300 group shadow-sm hover:shadow-md"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-white shadow-sm border border-slate-100 text-slate-700 group-hover:text-emerald-600 transition-colors">
                {iconFor(portal.id)}
              </div>
              <div className="flex flex-col min-w-0">
                <h4 className="text-[12px] font-bold text-slate-900 uppercase tracking-tight leading-none truncate">
                  {portal.name}
                </h4>
                <span className="text-[8px] text-slate-400 font-medium uppercase mt-1">
                  Module health: {scan ? `${portal.integrity}%` : 'idle'}
                </span>
              </div>
            </div>

            <div className="space-y-3 flex-1">
              {portal.checks.map((check, idx) => {
                const badge = statusBadge(check.status);
                return (
                  <div key={`${check.name}-${idx}`} className="flex items-start justify-between gap-2 group/item">
                    <div className="flex flex-col max-w-[72%] min-w-0">
                      <span className="text-[10px] font-mono font-bold text-slate-600 group-hover/item:text-slate-900 transition-colors truncate">
                        {check.name}
                      </span>
                      <span className="text-[8px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                        {check.detail}
                      </span>
                    </div>
                    <div
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border shrink-0 ${badge.wrap}`}
                    >
                      <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        {badge.icon}
                      </motion.div>
                      <span className="text-[9px] font-black tracking-tighter">{check.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {scan && scan.recommendations.length > 0 && (
        <div className="px-5 pb-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-2">
              Priority remediations
            </p>
            <ul className="space-y-1.5">
              {scan.recommendations.slice(0, 6).map((rec) => (
                <li key={rec} className="text-[11px] text-amber-900/90 flex gap-2">
                  <span className="text-amber-500 shrink-0">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="bg-slate-950 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/5">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/10 p-1 rounded border border-blue-500/20">
            <Shield size={14} className="text-blue-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] font-mono text-slate-500 uppercase leading-none">
              Deep_Scan_Manifest
            </span>
            <span className="text-[10px] font-mono text-blue-400 font-bold tracking-wider">
              {scan
                ? `PASS ${data.summary.pass} · WARN ${data.summary.warn} · FAIL ${data.summary.fail}`
                : 'PENDING_OPERATOR_RUN'}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[8px] font-mono text-slate-500 uppercase leading-none">
            Last_Scan_Timestamp
          </span>
          <span className="text-[10px] font-mono text-slate-300">
            {scan?.scannedAt
              ? new Date(scan.scannedAt).toLocaleString()
              : 'Not run yet'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PortalSecurityAudit;
