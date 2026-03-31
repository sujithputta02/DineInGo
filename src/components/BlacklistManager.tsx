import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Trash2, RefreshCw, Search, Filter, Globe, Calendar, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { adminApi } from '../utils/adminApi';

interface BlockedIP {
  _id: string;
  ipAddress: string;
  reason: string;
  blockedBy: string;
  blockedAt: string;
  expiresAt?: string;
  isActive: boolean;
}

const BlacklistManager: React.FC = () => {
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchBlockedIPs = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getBlockedIPs();
      if (response.success) {
        setBlockedIPs(response.blockedIPs);
      }
    } catch (error) {
      console.error('Error fetching blocked IPs:', error);
      toast.error('Failed to load blacklist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockedIPs();
  }, []);

  const handleUnblock = async (ipAddress: string) => {
    if (!window.confirm(`Are you sure you want to unblock ${ipAddress}?`)) return;

    try {
      setProcessing(ipAddress);
      const response = await adminApi.unblockIP(ipAddress);
      if (response.success) {
        toast.success(response.message);
        setBlockedIPs(prev => prev.filter(ip => ip.ipAddress !== ipAddress));
      }
    } catch (error) {
      console.error('Error unblocking IP:', error);
      toast.error('Failed to unblock IP');
    } finally {
      setProcessing(null);
    }
  };

  const filteredIPs = blockedIPs.filter(ip => 
    ip.ipAddress.includes(searchTerm) || ip.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <ShieldAlert size={18} className="text-red-500" />
           <h3 className="font-bold text-slate-900 text-sm">Active IP Blacklist</h3>
           <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
             {blockedIPs.length} Active
           </span>
        </div>
        <button 
          onClick={fetchBlockedIPs}
          disabled={loading}
          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-50 relative">
        <Search size={14} className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search by IP or reason..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-8 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500 transition-all"
        />
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-x-auto min-h-[300px]">
        {loading && blockedIPs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <RefreshCw className="animate-spin mb-2" size={24} />
            <p className="text-xs font-medium">Syncing with Firewall...</p>
          </div>
        ) : filteredIPs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-400">
            <CheckCircle className="mb-2 opacity-20" size={32} />
            <p className="text-xs font-medium">No blocked addresses found.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th className="px-4 py-3 border-b border-slate-100">IP Address</th>
                <th className="px-4 py-3 border-b border-slate-100">Blocked Reason</th>
                <th className="px-4 py-3 border-b border-slate-100 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence initial={false}>
                {filteredIPs.map(ip => (
                  <motion.tr 
                    key={ip._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Globe size={12} className="text-slate-400" />
                        <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold text-slate-700">{ip.ipAddress}</code>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-400">
                         <Calendar size={10} />
                         <span>{new Date(ip.blockedAt).toLocaleDateString()} at {new Date(ip.blockedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-800">{ip.reason}</span>
                        <span className="text-[9px] text-slate-400">Blocked By: {ip.blockedBy}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => handleUnblock(ip.ipAddress)}
                        disabled={processing === ip.ipAddress}
                        className={`p-2 rounded-lg transition-all ${
                          processing === ip.ipAddress 
                            ? 'bg-slate-100 text-slate-400 cursor-wait' 
                            : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white'
                        }`}
                        title="Unblock IP"
                      >
                        {processing === ip.ipAddress ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 text-white flex items-center gap-3">
        <Info size={16} className="text-blue-400 shrink-0" />
        <p className="text-[9px] text-slate-400 leading-tight">
          Blocked IPs are strictly monitored. Manual unblocking is logged for security audits. These addresses represent repeated OTP failures or suspicious traffic patterns.
        </p>
      </div>
    </div>
  );
};

export default BlacklistManager;
