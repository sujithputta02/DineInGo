import React, { useState, useEffect } from 'react';
import { Link, Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Shield,
  Menu,
  Bell,
  ChevronDown,
  Search,
  Mail,
  Database,
  Activity,
  AlertTriangle,
  UserCheck,
  Bug,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import DineInGoLogo from '../components/DineInGoLogo';
import axios from 'axios';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionToken } = useParams<{ sessionToken: string }>();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [openIssuesCount, setOpenIssuesCount] = useState(0);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  useEffect(() => {
    // Fetch open issues count
    fetchOpenIssuesCount();

    // Socket.IO for real-time updates
    const socket = (window as any).io?.(API_URL);
    if (socket) {
      socket.on('newIssueReport', (data: any) => {
        toast.error(`🚨 New ${data.priority} priority issue: ${data.title}`, {
          autoClose: 8000,
        });
        fetchOpenIssuesCount();
      });

      return () => socket.disconnect();
    }
  }, []);

  const fetchOpenIssuesCount = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/v1/issue-reports/admin/stats`);
      if ((response.data as any).success) {
        setOpenIssuesCount((response.data as any).stats.open || 0);
      }
    } catch (error) {
      console.error('Error fetching open issues count:', error);
    }
  };

  // Helper to check if link is active
  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminRole');
    localStorage.removeItem('adminLoginTime');
    toast.success('Logged out successfully');
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: `/admin/${sessionToken}/dashboard`, icon: LayoutDashboard },
    { name: 'Users', path: `/admin/${sessionToken}/users`, icon: Users },
    { name: 'Businesses', path: `/admin/${sessionToken}/businesses`, icon: Database },
    { name: 'Notifications', path: `/admin/${sessionToken}/notifications`, icon: MessageSquare },
    { name: 'Analytics', path: `/admin/${sessionToken}/analytics`, icon: BarChart3 },
    { name: 'Security', path: `/admin/${sessionToken}/security`, icon: Shield },
    { name: 'Waitlist', path: `/admin/${sessionToken}/waitlist`, icon: Mail },
    { name: 'System Health', path: `/admin/${sessionToken}/system`, icon: Activity },
    { name: 'Reports', path: `/admin/${sessionToken}/reports`, icon: AlertTriangle },
    { name: 'Issue Reports', path: `/admin/${sessionToken}/issues`, icon: Bug, badge: openIssuesCount },
    ...(localStorage.getItem('adminRole') === 'super_admin' ? [
      { name: 'Admin Team', path: `/admin/${sessionToken}/team`, icon: UserCheck }
    ] : []),
    { name: 'Settings', path: `/admin/${sessionToken}/settings`, icon: Settings },
  ];

  const getAdminInitials = () => {
    return 'AD';
  };

  const getLoginTime = () => {
    const loginTime = localStorage.getItem('adminLoginTime');
    if (loginTime) {
      return new Date(loginTime).toLocaleString();
    }
    return 'Unknown';
  };

  const getAdminEmail = () => {
    return localStorage.getItem('adminEmail') || 'admin@dineingo.com';
  };

  const getAdminRole = () => {
    const role = localStorage.getItem('adminRole');
    return role === 'super_admin' ? 'Super Administrator' : 'Administrator';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white fixed h-full z-20">
        <div className="p-4 md:p-6 border-b border-slate-800 flex flex-col gap-1">
          <Link to={`/admin/${sessionToken}/dashboard`} className="flex items-center gap-2">
            <DineInGoLogo size="small" color="#ffffff" />
          </Link>
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-red-400" />
            <span className="text-red-400 text-xs uppercase tracking-wider font-bold">Admin Portal</span>
          </div>
        </div>

        <nav className="flex-1 p-3 md:p-4 space-y-1 md:space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all relative text-sm md:text-base ${
                isActive(item.path)
                  ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={18} className="md:w-5 md:h-5" />
              <span className="font-medium">{item.name}</span>
              {item.badge && item.badge > 0 && (
                <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="p-3 md:p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl w-full transition-colors text-sm md:text-base"
          >
            <LogOut size={18} className="md:w-5 md:h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-3 md:px-6 py-3 md:py-4 flex items-center justify-between">
          {/* Search */}
          <div className="hidden md:flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-2xl w-96 border border-slate-200">
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search admin functions..."
              className="bg-transparent border-none outline-none text-sm w-full text-slate-600 placeholder:text-slate-400"
            />
          </div>

          <div className="flex-1 md:hidden">
            <div className="flex items-center gap-2">
              <DineInGoLogo size="small" />
              <Shield size={16} className="text-red-500" />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors relative min-h-[44px] min-w-[44px] flex items-center justify-center">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="hidden md:block h-8 w-[1px] bg-slate-200"></div>

            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 md:gap-3 p-1 pr-2 md:pr-3 hover:bg-slate-100 rounded-2xl transition-all min-h-[44px]"
              >
                <div className="w-8 md:w-9 h-8 md:h-9 bg-red-600 rounded-xl flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-md">
                  {getAdminInitials()}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    System Administrator
                  </p>
                  <p className="text-[10px] text-slate-500">Super User</p>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform hidden md:block ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
                  >
                    <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-1">Admin Session</p>
                      <p className="text-sm font-bold text-slate-900">{getAdminRole()}</p>
                      <p className="text-xs text-slate-500 truncate">{getAdminEmail()}</p>
                      <p className="text-xs text-slate-500 mt-1">Login: {getLoginTime()}</p>
                    </div>
                    <div className="p-2">
                      <Link
                        to={`/admin/${sessionToken}/settings`}
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                      >
                        <UserCheck size={18} />
                        Admin Profile
                      </Link>
                      <Link
                        to={`/admin/${sessionToken}/settings`}
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                      >
                        <Settings size={18} />
                        System Settings
                      </Link>
                      <div className="my-1 border-t border-slate-100"></div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <LogOut size={18} />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              <Menu size={24} />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-3 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 bg-slate-900 z-40 md:hidden pt-16 md:pt-20 p-4 md:p-6 flex flex-col overflow-y-auto"
          >
            {/* Close Button */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-3 text-white hover:bg-slate-800 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>

            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 rounded-2xl text-base md:text-lg mb-2 transition-all relative ${
                  isActive(item.path)
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <item.icon size={20} className="md:w-6 md:h-6" />
                <span className="font-bold">{item.name}</span>
                {item.badge && item.badge > 0 && (
                  <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 text-red-400 mt-auto font-bold text-base md:text-lg"
            >
              <LogOut size={20} className="md:w-6 md:h-6" />
              Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminLayout;