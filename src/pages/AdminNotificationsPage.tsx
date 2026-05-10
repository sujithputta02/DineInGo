import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Users,
  Building2,
  AlertCircle,
  CheckCircle,
  Info,
  Bell,
  Target,
  Globe,
  UserCheck,
  RefreshCw,
  Clock,
  History,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import EmojiPicker from '../components/EmojiPicker';
import { adminApi } from '../utils/adminApi';

function AdminNotificationsPage() {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [targetType, setTargetType] = useState<'all' | 'users' | 'businesses'>('all');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ today: 0, week: 0, total: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterTarget, setFilterTarget] = useState('all_targets');
  const [filterYear, setFilterYear] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');

  // Fetch notification stats and history
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, historyData] = await Promise.all([
          adminApi.getNotificationStats(),
          adminApi.getNotificationHistory({ 
            page, 
            limit: 5, 
            targetType: filterTarget,
            year: filterYear !== 'all' ? Number(filterYear) : undefined,
            month: filterMonth !== 'all' ? Number(filterMonth) : undefined
          })
        ]);
        
        if (statsData.success) setStats(statsData.stats);
        if (historyData.success) {
          setHistory(historyData.broadcasts);
          setTotalPages(historyData.pagination.totalPages);
        }
      } catch (err) {
        console.error('Error fetching notification data:', err);
      } finally {
        setStatsLoading(false);
        setHistoryLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [page, filterTarget, filterYear, filterMonth]);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      setError('Title and message are required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await adminApi.sendNotification({
        title: title.trim(),
        message: message.trim(),
        type,
        targetType
      });
      
      if (data.success) {
        setSuccess(`Notification sent successfully to ${data.recipientCount} recipients`);
        setTitle('');
        setMessage('');
        setType('info');
        setTargetType('all');
        
        // Refresh stats and history after sending
        const [statsData, historyData] = await Promise.all([
          adminApi.getNotificationStats(),
          adminApi.getNotificationHistory({ page: 1, limit: 5 })
        ]);
        
        if (statsData.success) setStats(statsData.stats);
        if (historyData.success) {
          setHistory(historyData.broadcasts);
          setPage(1);
        }
      } else {
        setError(data.message || 'Failed to send notification');
      }
    } catch (err: any) {
      console.error('Error sending notification:', err);
      setError(err.message || 'Failed to send notification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (notificationType: string) => {
    switch (notificationType) {
      case 'success': return <CheckCircle className="text-green-600" size={20} />;
      case 'warning': return <AlertCircle className="text-yellow-600" size={20} />;
      case 'error': return <AlertCircle className="text-red-600" size={20} />;
      default: return <Info className="text-blue-600" size={20} />;
    }
  };

  const getTypeColor = (notificationType: string) => {
    switch (notificationType) {
      case 'success': return 'border-green-200 bg-green-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'error': return 'border-red-200 bg-red-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  const getTargetIcon = (target: string) => {
    switch (target) {
      case 'users': return <Users className="text-blue-600" size={16} />;
      case 'businesses': return <Building2 className="text-purple-600" size={16} />;
      default: return <Globe className="text-green-600" size={16} />;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <MessageSquare className="text-blue-600" size={32} />
            Notification Center
          </h1>
          <p className="text-slate-600 mt-1">
            Manage system-wide broadcasts and communication history
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-xl">
          <Bell size={16} />
          <span className="text-sm font-medium">Broadcast Hub</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Notification Form */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Send className="text-blue-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Create Notification</h2>
                <p className="text-slate-600 text-sm">Compose and send notifications to your audience</p>
              </div>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Notification Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter notification title..."
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Message Content
                </label>
                <div className="relative">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your notification message..."
                    rows={4}
                    className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    required
                  />
                  <div className="absolute bottom-2 right-2">
                    <EmojiPicker 
                      onEmojiSelect={(emoji) => setMessage(prev => prev + emoji)}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {message.length}/500 characters
                </p>
              </div>

              {/* Type and Target */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Notification Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="info">Information</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error/Alert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Target Audience
                  </label>
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value as any)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Users</option>
                    <option value="users">Customers Only</option>
                    <option value="businesses">Businesses Only</option>
                  </select>
                </div>
              </div>

              {/* Preview */}
              {(title || message) && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Preview
                  </label>
                  <div className={`p-4 rounded-xl border-2 ${getTypeColor(type)}`}>
                    <div className="flex items-start gap-3">
                      {getTypeIcon(type)}
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 mb-1">
                          {title || 'Notification Title'}
                        </h3>
                        <p className="text-slate-700 text-sm">
                          {message || 'Your notification message will appear here...'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {getTargetIcon(targetType)}
                          <span className="text-xs text-slate-600 capitalize">
                            {targetType === 'all' ? 'All Users' : targetType}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Success/Error Messages */}
              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700"
                >
                  <CheckCircle size={16} />
                  <span className="text-sm font-medium">{success}</span>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700"
                >
                  <AlertCircle size={16} />
                  <span className="text-sm font-medium">{error}</span>
                </motion.div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !title.trim() || !message.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg shadow-blue-100"
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Sending Notification...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Send Notification
                  </>
                )}
              </button>
            </form>
          </motion.div>

          {/* Broadcast History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <History className="text-purple-600" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Broadcast History</h2>
                  <p className="text-slate-600 text-sm">Logs of all sent notifications</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Target Filter */}
                <select 
                  value={filterTarget}
                  onChange={(e) => {
                    setFilterTarget(e.target.value);
                    setPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-purple-200 transition-all"
                >
                  <option value="all_targets">All Targets</option>
                  <option value="users">Customers Only</option>
                  <option value="businesses">Businesses Only</option>
                </select>

                {/* Year Filter */}
                <select 
                  value={filterYear}
                  onChange={(e) => {
                    setFilterYear(e.target.value);
                    setPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-purple-200 transition-all"
                >
                  <option value="all">Any Year</option>
                  {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>

                {/* Month Filter */}
                {filterYear !== 'all' && (
                  <select 
                    value={filterMonth}
                    onChange={(e) => {
                      setFilterMonth(e.target.value);
                      setPage(1);
                    }}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-purple-200 transition-all"
                  >
                    <option value="all">Any Month</option>
                    {[
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'
                    ].map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                )}

                <div className="h-6 w-px bg-slate-200 mx-1" />

                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={18} className="text-slate-600" />
                </button>
                <span className="flex items-center px-3 font-bold text-xs text-slate-500 bg-slate-50 rounded-lg h-9">
                  {page} / {totalPages}
                </span>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={18} className="text-slate-600" />
                </button>
              </div>
            </div>

            {historyLoading ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="animate-spin text-blue-600" size={32} />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                No notification history found.
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item) => (
                  <div key={item._id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`mt-1 p-2 rounded-lg ${getTypeColor(item.type)}`}>
                          {getTypeIcon(item.type)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{item.title}</h4>
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2">{item.message}</p>
                          <div className="flex items-center gap-4 mt-3">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                              <Clock size={12} />
                              {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                              <Target size={12} />
                              {item.recipientCount} Recipients
                            </span>
                            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              {item.targetType.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setTitle(item.title);
                            setMessage(item.message);
                            setType(item.type);
                            setTargetType(item.targetType);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="px-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all flex items-center gap-1.5 border border-blue-100"
                        >
                          <RefreshCw size={14} />
                          Edit & Resend
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Quick Actions & Tips */}
        <div className="space-y-6">
          {/* Quick Templates */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Target size={20} className="text-purple-600" />
              Quick Templates
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setTitle('System Maintenance Notice');
                  setMessage('We will be performing scheduled maintenance on our servers. The platform may be temporarily unavailable during this time.');
                  setType('warning');
                  setTargetType('all');
                }}
                className="w-full text-left p-3 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <p className="font-medium text-slate-900 text-sm">Maintenance Notice</p>
                <p className="text-xs text-slate-600">System maintenance alert</p>
              </button>
              
              <button
                onClick={() => {
                  setTitle('New Feature Available');
                  setMessage('We\'ve just released exciting new features to enhance your dining experience. Check them out now!');
                  setType('success');
                  setTargetType('users');
                }}
                className="w-full text-left p-3 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <p className="font-medium text-slate-900 text-sm">Feature Announcement</p>
                <p className="text-xs text-slate-600">New feature release</p>
              </button>
              
              <button
                onClick={() => {
                  setTitle('Interactive AR Menu! 🦖');
                  setMessage('Why just read a menu when you can see it in 3D? We’ve just launched our Interactive AR Menu! Next time you’re at a partner restaurant, just tap the AR icon to see your dish appear right on your table before you even order.\n\nExplore nutrition, ingredients, and 3D visuals like never before. The future of dining is here—come take a look!\n\n— Team DineInGo');
                  setType('info');
                  setTargetType('all');
                }}
                className="w-full text-left p-3 hover:bg-slate-50 rounded-xl transition-colors border border-emerald-100 bg-emerald-50/30"
              >
                <p className="font-medium text-emerald-900 text-sm flex items-center gap-2">
                  <Globe size={14} />
                  AR Menu Launch
                </p>
                <p className="text-xs text-emerald-600">3D Interactive Menu Announcement</p>
              </button>

              <button
                onClick={() => {
                  setTitle('Important Policy Update');
                  setMessage('We have updated our terms of service and privacy policy. Please review the changes at your earliest convenience.');
                  setType('info');
                  setTargetType('all');
                }}
                className="w-full text-left p-3 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <p className="font-medium text-slate-900 text-sm">Policy Update</p>
                <p className="text-xs text-slate-600">Terms and privacy changes</p>
              </button>
            </div>
          </motion.div>

          {/* Best Practices */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <UserCheck size={20} className="text-green-600" />
              Best Practices
            </h3>
            <div className="space-y-3 text-sm text-slate-600 font-medium">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Keep titles concise and descriptive</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Use appropriate notification types</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Target specific audiences</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Preview before sending</p>
              </div>
            </div>
          </motion.div>

          {/* Statistics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200"
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Live Activity</h3>
            {statsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="animate-spin text-blue-600" size={24} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Today</span>
                  <span className="font-black text-slate-900">{stats.today}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Weekly</span>
                  <span className="font-black text-slate-900">{stats.week}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Lifetime</span>
                  <span className="font-black text-blue-900">{stats.total}</span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default AdminNotificationsPage;