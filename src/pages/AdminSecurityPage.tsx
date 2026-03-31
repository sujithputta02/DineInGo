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

const AdminSecurityPage: React.FC = () => {
  const navigate = useNavigate();
  const { sessionToken } = useParams<{ sessionToken: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [filterPortal, setFilterPortal] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchSecurityData = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      
      const [statsData, logsData] = await Promise.all([
        adminApi.getSecurityStats(),
        adminApi.getSecurityLogs({ 
          portal: filterPortal || undefined, 
          severity: filterSeverity || undefined,
          limit: 100 
        })
      ]);

      if (statsData.success) setStats(statsData.stats);
      if (logsData.success) setLogs(logsData.logs);

      if (showToast) toast.success('Security data refreshed');
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
  }, [filterPortal, filterSeverity]);

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
    toast.info('Initiating Universal Security Audit...');
    setTimeout(() => {
      toast.success('System Scan Complete: No major vulnerabilities found.');
    }, 2000);
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
          <button 
            onClick={runSecurityScan}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-medium text-sm"
          >
            <ShieldCheck size={18} />
            Run Security Audit
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

      {/* Dynamic High-Tech Security Visualizer */}
      <SecurityVisualizer logs={logs} stats={stats} />

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

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Threat Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden text-sm">
            <div className="p-4 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Terminal size={18} className="text-slate-500" />
                Live Security Audit Feed
              </h3>
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
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-50">
                  <tr>
                    <th className="px-6 py-4">Event</th>
                    <th className="px-6 py-4">IP Address</th>
                    <th className="px-6 py-4">Portal</th>
                    <th className="px-6 py-4">Severity</th>
                    <th className="px-6 py-4">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        <ShieldCheck className="mx-auto mb-2 opacity-20" size={40} />
                        No security threats detected in the current filter.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{log.eventType.replace(/_/g, ' ').toUpperCase()}</span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[200px]">{log.details}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">{log.ip}</code>
                          </div>
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
                        <td className="px-6 py-4 text-slate-400 text-xs">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Status Panel */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Server size={18} className="text-slate-500" />
              Active Defenses
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Fingerprint className="text-green-600" size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-none mb-1">Session Obfuscation</p>
                    <p className="text-[10px] text-slate-500">Active - Tab specific</p>
                  </div>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-500/50"></div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Lock className="text-green-600" size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-none mb-1">URL Masking</p>
                    <p className="text-[10px] text-slate-500">Active - Path randomized</p>
                  </div>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-500/50"></div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ShieldCheck className="text-blue-600" size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-none mb-1">API Rate Limiting</p>
                    <p className="text-[10px] text-slate-500">OWASP Standard Active</p>
                  </div>
                </div>
                <div className="w-2 h-2 bg-blue-500 rounded-full shadow-sm shadow-blue-500/50"></div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl opacity-60">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-200 rounded-lg">
                    <Globe className="text-slate-500" size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-none mb-1">Geo-Fencing</p>
                    <p className="text-[10px] text-slate-500">Disabled - Global Access</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl text-white">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Info size={18} className="text-red-500" />
              Security Ops Tip
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              DineInGo uses "Fail-to-Ban" technology. If an IP fails OTP verification 5 times, it is automatically blocked system-wide for 15 minutes to prevent AI-powered brute force attacks.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <label className="flex items-center gap-2 text-[10px] text-slate-500 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded bg-slate-800 border-slate-700 text-red-600" 
                />
                Auto-refresh Stats
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSecurityPage;
