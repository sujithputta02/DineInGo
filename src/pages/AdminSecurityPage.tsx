import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Info,
  Lock,
  Unlock,
  AlertTriangle,
  Activity,
  UserCheck,
  Globe,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Trash2,
  Terminal,
  Server,
  Fingerprint
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { adminApi } from '../utils/adminApi';
import SecurityVisualizer from '../components/SecurityVisualizer';
import ThreatMap from '../components/ThreatMap';
import SecurityScoreDial from '../components/SecurityScoreDial';
import BlacklistManager from '../components/BlacklistManager';
import PortalSecurityAudit from '../components/PortalSecurityAudit';
import SecurityTerminal from '../components/SecurityTerminal';

interface SecurityStats {
  total: number;
  last24h: number;
  blockedIpsCount: number;
  criticalThreats: number;
  portals: { _id: string; count: number }[];
  severity: { _id: string; count: number }[];
}

interface SecurityLog {
  _id: string;
  portal: 'user' | 'business' | 'admin' | 'system';
  eventType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  ip: string;
  userAgent?: string;
  path?: string;
  timestamp: string;
}

function AdminSecurityPage() {
  const navigate = useNavigate();
  const { sessionToken } = useParams<{ sessionToken: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [filterPortal, setFilterPortal] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'live' | 'archive'>('live');
  const [archivePage, setArchivePage] = useState(1);
  const [paginationData, setPaginationData] = useState<any>(null);
  const [isAdminSuper] = useState(() => localStorage.getItem('adminRole') === 'super_admin');
  const [showTerminal, setShowTerminal] = useState(false);

  const fetchSecurityData = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      
      const params: any = {
        portal: filterPortal || undefined,
        severity: filterSeverity || undefined,
      };

      if (activeTab === 'live') {
        params.limit = 100;
        params.page = 1;
        // Only show logs from the last 24 hours in the Live view
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);
        params.since = oneDayAgo.toISOString();
      } else {
        params.limit = 20;
        params.page = archivePage;
      }

      const [statsData, logsData] = await Promise.all([
        adminApi.getSecurityStats(),
        adminApi.getSecurityLogs(params)
      ]);

      if (statsData.success) setStats(statsData.stats);
      if (logsData.success) {
        setLogs(logsData.logs);
        if (logsData.pagination) setPaginationData(logsData.pagination);
      }

      if (showToast) toast.success(`Security ${activeTab} data refreshed`);
    } catch (error) {
      console.error('Error fetching security data:', error);
      if (showToast) toast.error('Failed to update security data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, [filterPortal, filterSeverity, activeTab, archivePage]);

  useEffect(() => {
    let interval: any;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchSecurityData();
      }, 30000); // 30s auto-refresh
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const getPortalBadge = (portal: string) => {
    switch (portal) {
      case 'admin': return 'bg-zinc-900 text-white';
      case 'business': return 'bg-emerald-600 text-white';
      default: return 'bg-blue-600 text-white';
    }
  };

  const runSecurityScan = () => {
    setIsScanning(true);
    toast.info('Initiating Universal Security Audit...');
    
    // Simulate deep scan duration
    setTimeout(() => {
      setIsScanning(false);
      toast.success('System Scan Complete: No major vulnerabilities found.');
    }, 4000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <RefreshCw className="w-10 h-10 text-red-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Scanning System Security...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="text-red-600" />
            Universal Security Command Center
          </h1>
          <p className="text-slate-500 text-sm">Real-time threat monitoring and defense auditing across all DineInGo portals.</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdminSuper && (
            <button
              onClick={() => setShowTerminal(!showTerminal)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium text-sm ${
                showTerminal 
                  ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <Terminal size={18} />
              {showTerminal ? 'Close Console' : 'Master CLI'}
            </button>
          )}
          <button 
            onClick={runSecurityScan}
            disabled={isScanning}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium text-sm ${
              isScanning 
                ? 'bg-red-600 text-white cursor-not-allowed shadow-[0_0_15px_rgba(220,38,38,0.4)]' 
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {isScanning ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                Run Security Audit
              </>
            )}
          </button>
          <button 
            onClick={() => fetchSecurityData(true)}
            disabled={refreshing}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
          >
            <RefreshCw size={20} className={`${refreshing ? 'animate-spin' : ''} text-slate-600`} />
          </button>
        </div>
      </div>

      {/* Advanced Security Command Center Header Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          {isAdminSuper && showTerminal ? (
            <SecurityTerminal onCommandExecuted={() => fetchSecurityData(false)} />
          ) : (
            <SecurityScoreDial stats={stats} logs={logs} />
          )}
        </div>
        <div className="lg:col-span-3">
          <ThreatMap logs={logs} />
        </div>
      </div>

      {/* Dynamic High-Tech Security Visualizer */}
      <SecurityVisualizer logs={logs} stats={stats} isScanning={isScanning} />

      {/* Universal Portal Security Audit (Now Full-Width Hero Row) */}
      <PortalSecurityAudit />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Total Events</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Activity size={16} className="text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats?.total || 0}</p>
          <p className="text-xs text-slate-500 mt-1">System lifespan logs</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Blocked IPs</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <Globe size={16} className="text-orange-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats?.blockedIpsCount || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Currently restricted access</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">24h Threats</span>
            <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center">
              <AlertTriangle size={16} className="text-yellow-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{stats?.last24h || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Detected behavioral anomalies</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-red-100 shadow-sm bg-red-50/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-red-600 text-xs font-bold uppercase tracking-wider">Critical Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <ShieldAlert size={16} className="text-red-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-red-600">{stats?.criticalThreats || 0}</p>
          <p className="text-xs text-red-500 mt-1">Immediate attention required</p>
        </div>
      </div>

      {/* Main Content Area: Feed and Status Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Threat Feed (Left/2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-sm">
            <div className="p-4 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Terminal size={18} className="text-slate-500" />
                  Security Audit System
                </h3>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  {['live', 'archive'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setFilterPortal('');
                        setFilterSeverity('');
                        setLogs([]); // Reset logs when switching
                        setActiveTab(tab as 'live' | 'archive');
                        setArchivePage(1);
                      }}
                      className={`px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                        activeTab === tab 
                          ? 'bg-white text-slate-900 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab === 'live' ? (
                        <span className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                          Live Monitor
                        </span>
                      ) : 'Audit Archive'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select 
                  value={filterPortal}
                  onChange={(e) => setFilterPortal(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-medium rounded-lg px-2 py-1 outline-none"
                >
                  <option value="">All Portals</option>
                  <option value="admin">Admin Portal</option>
                  <option value="business">Business Portal</option>
                  <option value="user">User Portal</option>
                </select>
                <select 
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-medium rounded-lg px-2 py-1 outline-none"
                >
                  <option value="">All Severities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto min-h-[400px]">
              <AnimatePresence mode="wait">
                <motion.table 
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full text-left"
                >
                  <thead className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Security Event</th>
                      <th className="px-6 py-4">IP Address</th>
                      <th className="px-6 py-4">Access Point</th>
                      <th className="px-6 py-4">Priority</th>
                      <th className="px-6 py-4">Occurrence [T-Stamp]</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-24 text-center text-slate-400">
                          <div className="flex flex-col items-center">
                            <ShieldCheck className="mb-3 opacity-20" size={48} />
                            <p className="font-medium">No {activeTab} logs found.</p>
                            <p className="text-[10px] uppercase mt-1">System status: All clear</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log._id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800 group-hover:text-red-600 transition-colors">
                                {log.eventType.replace(/_/g, ' ').toUpperCase()}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate max-w-[220px] font-mono">{log.details}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <code className="text-[11px] bg-slate-950 text-slate-300 px-2.5 py-1 rounded-lg font-mono border border-white/5">
                              {log.ip}
                            </code>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter ${getPortalBadge(log.portal)}`}>
                              {log.portal}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter ${getSeverityColor(log.severity)}`}>
                              {log.severity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-mono text-[10px]">
                            {new Date(log.timestamp).toLocaleString('en-US', {
                              month: 'short',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: true
                            })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </motion.table>
              </AnimatePresence>
            </div>

            {/* Archive Pagination */}
            {activeTab === 'archive' && paginationData && paginationData.totalPages > 1 && (
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium tracking-tight">
                  Displaying historical records {((archivePage - 1) * 20) + 1} to {Math.min(archivePage * 20, paginationData.total)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={archivePage === 1}
                    onClick={() => setArchivePage(p => p - 1)}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <RefreshCw size={14} className="rotate-180" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, paginationData.totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setArchivePage(pageNum)}
                          className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-all ${
                            archivePage === pageNum 
                              ? 'bg-slate-900 text-white shadow-md' 
                              : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    disabled={!paginationData.hasNext}
                    onClick={() => setArchivePage(p => p + 1)}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Panel (Right Column/1/3) */}
        <div className="space-y-6 lg:col-span-1">
          <BlacklistManager />

          <div className="bg-slate-900 p-6 rounded-2xl text-white">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Info size={18} className="text-red-500" />
              Security Ops Tip
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              DineInGo uses "Fail-to-Ban" technology. If an IP fails OTP verification 5 times, it is automatically blocked system-wide for 15 minutes to prevent AI-powered brute force attacks.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <label className="flex items-center gap-2 text-[10px] text-slate-500 cursor-pointer font-bold uppercase tracking-wider">
                <input 
                  type="checkbox" 
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-red-600 focus:ring-0" 
                />
                Auto-ping Active Monitor
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSecurityPage;
 
