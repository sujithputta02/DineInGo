import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Mail, 
  Send, 
  Filter, 
  Search, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Store,
  UserCheck,
  LayoutDashboard
} from 'lucide-react';
import { adminApi } from '../utils/adminApi';
import { toast } from 'react-toastify';

interface WaitlistStats {
  total: number;
  users: number;
  businesses: number;
  pending: number;
  contacted: number;
  emailDelivery: {
    sent: number;
    delivered: number;
    softBounces: number;
    hardBounces: number;
    failures: number;
  };
}

interface Signup {
  _id: string;
  email: string;
  userType: 'user' | 'business';
  status: 'pending' | 'contacted' | 'converted';
  referralCode?: string;
  lastEmailStatus?: string;
  lastEmailError?: string;
  lastAttemptAt?: string;
  createdAt: string;
}

const AdminWaitlistPage: React.FC = () => {
  const [stats, setStats] = useState<WaitlistStats | null>(null);
  const [recentSignups, setRecentSignups] = useState<Signup[]>([]);
  const [recentFailures, setRecentFailures] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  // Broadcast form
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'user' | 'business'>('all');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getWaitlistStats();
      if (res.success) {
        setStats(res.stats);
        setRecentSignups(res.recentSignups || []);
        setRecentFailures(res.recentFailures || []);
      }
    } catch (error) {
      console.error('Error fetching waitlist data:', error);
      toast.error('Failed to load waitlist data');
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) {
      toast.warning('Please fill in both subject and message');
      return;
    }

    const confirmSend = window.confirm(`Are you sure you want to send this broadcast to all ${targetType === 'all' ? 'Users & Businesses' : targetType + 's'}?`);
    if (!confirmSend) return;

    try {
      setIsSending(true);

      const res = await adminApi.sendWaitlistBroadcast({
        subject,
        html: message, // Just pass raw message, backend wraps it in template
        targetType
      });

      if (res.success) {
        toast.success(res.message);
        setSubject('');
        setMessage('');
        fetchData(); // Refresh stats
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to send broadcast');
    } finally {
      setIsSending(false);
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Mail className="w-8 h-8 text-emerald-600" />
            Waitlist Management
          </h1>
          <p className="text-gray-500 mt-1">Manage your early access community and send broadcasts.</p>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
        >
          <Clock className="w-4 h-4" />
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard 
          icon={<Users className="w-6 h-6 text-blue-600" />}
          label="Total Waitlist"
          value={stats?.total || 0}
          color="blue"
        />
        <StatCard 
          icon={<UserCheck className="w-6 h-6 text-emerald-600" />}
          label="Interested Users"
          value={stats?.users || 0}
          color="emerald"
        />
        <StatCard 
          icon={<Store className="w-6 h-6 text-purple-600" />}
          label="Venue Partners"
          value={stats?.businesses || 0}
          color="purple"
        />
        <StatCard 
          icon={<AlertCircle className="w-6 h-6 text-orange-600" />}
          label="Pending Contact"
          value={stats?.pending || 0}
          color="orange"
        />
        <StatCard 
          icon={<CheckCircle2 className="w-6 h-6 text-cyan-600" />}
          label="Contacted"
          value={stats?.contacted || 0}
          color="cyan"
        />
      </div>

      {/* Email Delivery Health */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="md:col-span-5">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Email Delivery Health
          </h3>
        </div>
        <StatCard 
          icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
          label="Confirmed Delivered"
          value={stats?.emailDelivery?.delivered || 0}
          color="emerald"
          hint="Receipt confirmed by server"
        />
        <StatCard 
          icon={<Send className="w-6 h-6 text-blue-600" />}
          label="Accepted / Sent"
          value={stats?.emailDelivery?.sent || 0}
          color="blue"
          hint="In transit / Accepted"
        />
        <StatCard 
          icon={<Clock className="w-6 h-6 text-amber-600" />}
          label="Soft Bounces"
          value={stats?.emailDelivery?.softBounces || 0}
          color="amber"
          hint="Temporary: Mailbox full / Throttled"
        />
        <StatCard 
          icon={<AlertCircle className="w-6 h-6 text-orange-600" />}
          label="Hard Bounces"
          value={stats?.emailDelivery?.hardBounces || 0}
          color="orange"
          hint="Permanent: Invalid Email"
        />
        <StatCard 
          icon={<AlertCircle className="w-6 h-6 text-red-600" />}
          label="Fatal Failures"
          value={stats?.emailDelivery?.failures || 0}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Broadcast Form */}
        <div className="lg:col-span-2">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Send className="w-5 h-5" />
                Send Waitlist Broadcast
              </h2>
              <p className="text-emerald-50 text-sm mt-1">Emails will be sent via Brevo with Gmail fallback.</p>
            </div>

            <form onSubmit={handleBroadcast} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Target Audience</label>
                  <div className="flex gap-2 p-1 bg-gray-50 rounded-lg border border-gray-100">
                    {(['all', 'user', 'business'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTargetType(type)}
                        className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                          targetType === type 
                            ? 'bg-white text-emerald-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Subject Line</label>
                  <input 
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Enter email subject..."
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <label className="text-sm font-semibold text-gray-700">Message Content</label>
                    <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">
                      {targetType === 'all' ? '✨ Multi-segmented templates will be applied' : 
                       targetType === 'business' ? '💼 Specialized Business template active' : 
                       '🍕 Specialized User template active'}
                    </span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-xs font-medium text-emerald-600 hover:underline"
                  >
                    {showPreview ? 'Edit Message' : 'Preview Styled Email'}
                  </button>
                </div>
                
                <AnimatePresence mode="wait">
                  {!showPreview ? (
                    <motion.textarea 
                      key="editor"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write your announcement here..."
                      className="w-full h-64 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none"
                      required
                    />
                  ) : (
                    <motion.div 
                      key="preview"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full h-[500px] p-6 bg-gray-200 border border-emerald-100 rounded-xl overflow-y-auto"
                    >
                      <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                        {/* Header Section */}
                        <div className={`p-10 text-center text-white ${
                          targetType === 'business' ? 'bg-slate-900' : 'bg-emerald-700'
                        }`}>
                          <div className="w-16 h-16 bg-emerald-500 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <span className="text-white font-black text-2xl italic tracking-tighter relative">
                              D
                              <span className="relative">
                                i
                                <span className="absolute top-[4px] left-[85%] -translate-x-1/2 w-[6px] h-[6px] bg-red-500 rounded-full"></span>
                              </span>
                            </span>
                          </div>
                          <h2 className="text-2xl font-black tracking-tight leading-tight">
                            {targetType === 'business' ? 'Empower Your Business' : 'Welcome to DineInGo'}
                          </h2>
                        </div>

                        {/* Content Section */}
                        <div className="p-10">
                          <span className={`text-[11px] font-black uppercase tracking-[0.25em] block mb-4 ${
                            targetType === 'business' ? 'text-amber-500' : 'text-emerald-500'
                          }`}>
                            {targetType === 'business' ? 'The Operating System for Modern Dining' : 'Your Personal Dining Concierge'}
                          </span>
                          
                          <div className="text-[19px] font-bold text-slate-900 mb-4">
                            Hello [Recipient Name],
                          </div>

                          <div className="text-gray-600 text-[15px] whitespace-pre-wrap leading-relaxed mb-8">
                            {message || (targetType === 'business' 
                              ? "DineInGo is more than just a management tool—it's the Operating System for the modern hospitality industry. We're building the infrastructure you need to thrive in a digital-first world."
                              : "We're crafting an experience where every meal is an adventure. From AI-powered discoveries to immersive AR menus, DineInGo is your gateway to the city's finest flavors.")
                            }
                          </div>

                          {/* Features Section */}
                          <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
                            <div className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">What to Expect</div>
                            <div className="space-y-4">
                              {(targetType === 'business' ? [
                                { icon: '📊', title: 'Advanced Analytics', desc: 'Real-time insights into your venue’s performance.' },
                                { icon: '🗓️', title: 'Seamless Bookings', desc: 'Effortless reservation management for busy teams.' },
                                { icon: '🚀', title: 'Growth Engine', desc: 'Targeted marketing tools to skyrocket your ROI.' },
                                { icon: '🛠️', title: 'Full Portal Control', desc: 'Manage menu, staff, and events from one place.' }
                              ] : [
                                { icon: '🔍', title: 'Smart Discovery', desc: 'AI recommendations tailored to your unique vibe.' },
                                { icon: '🎟️', title: 'Exclusive Events', desc: 'VIP access to the city’s best dining events.' },
                                { icon: '📱', title: 'AR Menu Tech', desc: 'See dishes in 3D before you place your order.' },
                                { icon: '🏆', title: 'Dining Rewards', desc: 'Earn points and unlock rare achievements.' }
                              ]).map((f, i) => (
                                <div key={i} className="flex gap-4">
                                  <div className="text-xl">{f.icon}</div>
                                  <div>
                                    <div className="text-xs font-black text-slate-900">{f.title}</div>
                                    <div className="text-[11px] text-gray-500 leading-tight">{f.desc}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="text-center">
                            <div className={`inline-block px-10 py-5 rounded-full text-white text-sm font-black shadow-xl tracking-wide ${
                              targetType === 'business' ? 'bg-slate-900 shadow-slate-900/20' : 'bg-emerald-600 shadow-emerald-600/20'
                            }`}>
                              {targetType === 'business' ? 'Explore Business Portal' : 'Discover DineInGo'}
                            </div>
                          </div>
                        </div>

                        {/* Footer Section */}
                        <div className="p-10 bg-gray-50 text-center border-t border-gray-100">
                          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-6 leading-relaxed">
                            © 2026 DineInGo Official. All rights reserved.<br/>
                            Joining the elite DineInGo waitlist.
                          </p>
                          <div className="flex justify-center gap-8 text-[11px] font-black">
                            <span className="text-emerald-600">Instagram</span>
                            <span className="text-slate-900">Website</span>
                            <span className="text-slate-900">Terms</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between pt-4 border-top border-gray-50">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <AlertCircle className="w-3 h-3" />
                  Sent in batches of 5 for reliability.
                </div>
                <button
                  type="submit"
                  disabled={isSending}
                  className={`flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSending ? (
                    <>
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Dispatch Broadcast
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* Sidebar Lists */}
        <div className="lg:col-span-1 space-y-8">
          {/* Recent Signups */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col max-h-[450px]">
            <div className="p-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2 text-gray-800 uppercase tracking-tight">
                <Clock className="w-4 h-4 text-emerald-500" />
                Recent Signups
              </h2>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">LIVE</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {recentSignups.map((signup) => (
                <div 
                  key={signup._id}
                  className="p-3 rounded-xl border border-gray-50 bg-gray-50/30 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-900 truncate max-w-[140px]">
                        {signup.email}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                          signup.userType === 'user' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {signup.userType}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                          signup.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {signup.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-[9px] text-gray-400 font-medium whitespace-nowrap">
                      {signup.createdAt ? new Date(signup.createdAt).toLocaleDateString() : '—'}
                    </p>
                  </div>
                </div>
              ))}
              {recentSignups.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-xs">No recent signups</p>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Issues (Not Reached) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col max-h-[450px]">
            <div className="p-4 border-b border-gray-50 bg-red-50/30 flex items-center justify-between">
              <h2 className="text-sm font-bold flex items-center gap-2 text-red-700 uppercase tracking-tight">
                <AlertCircle className="w-4 h-4" />
                Delivery Issues
              </h2>
              <span className="text-[10px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-full">NOT REACHED</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {recentFailures.map((failure) => (
                <div 
                  key={failure._id}
                  className="p-3 rounded-xl border border-red-50 bg-white hover:bg-red-50/30 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-900 truncate max-w-[140px]">
                        {failure.email}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                          failure.lastEmailStatus === 'hard_bounce' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {failure.lastEmailStatus?.replace('_', ' ') || 'failed'}
                        </span>
                      </div>
                      {failure.lastEmailError && (
                        <p className="text-[8px] text-red-400 font-medium italic mt-1 line-clamp-1">
                          {failure.lastEmailError}
                        </p>
                      )}
                    </div>
                    <p className="text-[9px] text-gray-400 font-medium whitespace-nowrap">
                      {failure.lastAttemptAt ? new Date(failure.lastAttemptAt).toLocaleDateString() : '—'}
                    </p>
                  </div>
                </div>
              ))}
              {recentFailures.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-xs">No pending failures</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  hint?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color, hint }) => {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center space-y-3"
    >
      <div className={`p-3 rounded-xl bg-gray-50 group-hover:bg-${color}-50 transition-colors`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-black text-gray-900">{value.toLocaleString()}</p>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        {hint && <p className="text-[9px] text-gray-400 mt-1 italic">{hint}</p>}
      </div>
    </motion.div>
  );
};

export default AdminWaitlistPage;
