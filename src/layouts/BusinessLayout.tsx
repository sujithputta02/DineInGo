import React, { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    ChefHat,
    Map,
    Calendar,
    Settings,
    LogOut,
    User as UserIcon,
    Menu,
    Users,
    Bell,
    ChevronDown,
    Search,
    ShoppingBag,
    Ticket,
    X,
    Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../firebase';
import { toast } from 'react-toastify';
import DineInGoLogo from '../components/DineInGoLogo';
import GhostBanner from '../components/GhostBanner';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { getSessionToken } from '../utils/sessionGuard';
import { Analytics } from '@vercel/analytics/react';

function BusinessLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser } = useAuth();
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    const userDataRaw = localStorage.getItem('userData');
    const isGhosting = userDataRaw ? JSON.parse(userDataRaw).impersonated : false;

    const sessionToken = getSessionToken();

    // Helper to check if link is active
    const isActive = (path: string) => location.pathname.startsWith(path);

    const handleLogout = async () => {
        try {
            await auth.signOut();
            sessionStorage.removeItem('userData');
            toast.success('Logged out successfully');
            navigate('/business/businessLogin');
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('Failed to logout');
        }
    };

    const navItems = [
        { name: 'Dashboard', path: `/business/app/dashboard/${sessionToken}`, icon: LayoutDashboard },
        { name: 'Reservations', path: '/business/app/reservations', icon: Calendar },
        { name: 'Waitlist', path: '/business/app/waitlist', icon: Users },
        { name: 'Events', path: '/business/app/events', icon: Ticket },
        { name: 'Pre-orders', path: '/business/app/pre-orders', icon: ShoppingBag },
        { name: 'Menu', path: '/business/app/menu', icon: Menu },
        { name: 'Floor Plans', path: '/business/app/floor-plans', icon: Map },
        { name: 'Settings', path: '/business/app/settings', icon: Settings },
    ];

    const notificationsPath = '/business/app/notifications';

    const getInitials = (name: string | null) => {
        if (!name) return 'B';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    return (
        <div className={`min-h-screen bg-slate-50 flex ${isGhosting ? 'pt-12 sm:pt-10' : ''}`}>
            <GhostBanner />
            {/* Sidebar for Desktop */}
            <aside className={`hidden md:flex flex-col w-64 bg-slate-900 text-white fixed h-full z-20 transition-all duration-300 ${isGhosting ? 'top-10 sm:top-10 h-[calc(100%-40px)]' : 'top-0'}`}>
                <div className="p-4 md:p-6 border-b border-slate-800 flex flex-col gap-1">
                    <Link to={`/business/app/dashboard/${sessionToken}`} className="flex items-center gap-2">
                        <DineInGoLogo size="small" color="#ffffff" />
                    </Link>
                    <span className="text-emerald-400 text-xs uppercase tracking-wider font-bold ml-1">Business Portal</span>
                </div>

                <nav className="flex-1 p-3 md:p-4 space-y-1 md:space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all text-sm md:text-base ${isActive(item.path)
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <item.icon size={18} className="md:w-5 md:h-5" />
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    ))}

                    {/* Notifications Link */}
                    <Link
                        to={notificationsPath}
                        className={`flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all relative text-sm md:text-base ${
                            isActive('/business/app/notifications')
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        <Bell size={18} className="md:w-5 md:h-5" />
                        <span className="font-medium">Notifications</span>
                        {unreadCount > 0 && (
                            <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </Link>
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
                <header className={`sticky z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-3 md:px-6 py-2 md:py-4 flex items-center justify-between transition-all duration-300 ${isGhosting ? 'top-10' : 'top-0'}`}>
                    {/* Search / Breadcrumbs placeholder */}
                    <div className="hidden lg:flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-2xl w-64 xl:w-96 border border-slate-200">
                        <Search size={18} className="text-slate-400 font-bold" />
                        <input
                            type="text"
                            placeholder="Quick search..."
                            className="bg-transparent border-none outline-none text-sm w-full text-slate-600 placeholder:text-slate-400 font-medium"
                        />
                    </div>

                    <div className="flex-1 md:hidden">
                        <DineInGoLogo size="small" />
                    </div>

                    <div className="flex items-center gap-1 md:gap-4">
                        {/* Notifications Bell with Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                className="p-1.5 md:p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors relative min-h-[38px] min-w-[38px] md:min-h-[44px] md:min-w-[44px] flex items-center justify-center"
                            >
                                <Bell size={18} className="md:w-5 md:h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold bg-red-500 text-white rounded-full border-2 border-white">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            <AnimatePresence>
                                {isNotificationsOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden max-h-[500px] flex flex-col"
                                    >
                                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">Notifications</p>
                                                {unreadCount > 0 && (
                                                    <p className="text-xs text-slate-500">{unreadCount} unread</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {unreadCount > 0 && (
                                                    <button
                                                        onClick={async () => {
                                                            await markAllAsRead();
                                                            toast.success('All notifications marked as read');
                                                        }}
                                                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                                    >
                                                        Mark all read
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setIsNotificationsOpen(false)}
                                                    className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
                                                >
                                                    <X size={16} className="text-slate-400" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="overflow-y-auto flex-1">
                                            {notifications.length === 0 ? (
                                                <div className="p-8 text-center">
                                                    <Bell size={32} className="mx-auto text-slate-300 mb-2" />
                                                    <p className="text-sm text-slate-500">No notifications</p>
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-slate-100">
                                                    {notifications.slice(0, 5).map((notification: any) => (
                                                        <div
                                                            key={notification._id}
                                                            className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                                                                !notification.isRead ? 'bg-blue-50/50' : ''
                                                            }`}
                                                            onClick={async () => {
                                                                if (!notification.isRead) {
                                                                    await markAsRead(notification._id);
                                                                }
                                                                setIsNotificationsOpen(false);
                                                                navigate(notificationsPath);
                                                            }}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={`text-sm ${!notification.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                                                        {notification.title}
                                                                    </p>
                                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                                                        {notification.message}
                                                                    </p>
                                                                    <p className="text-xs text-slate-400 mt-1">
                                                                        {new Date(notification.createdAt).toLocaleDateString()}
                                                                    </p>
                                                                </div>
                                                                {!notification.isRead && (
                                                                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0"></div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {notifications.length > 0 && (
                                            <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                                                <Link
                                                    to={notificationsPath}
                                                    onClick={() => setIsNotificationsOpen(false)}
                                                    className="block text-center text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                                                >
                                                    View all notifications
                                                </Link>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="hidden md:block h-8 w-[1px] bg-slate-200"></div>

                        <div className="relative">
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center gap-2 md:gap-3 p-1 pr-1.5 md:pr-3 hover:bg-slate-100 rounded-2xl transition-all min-h-[38px] md:min-h-[44px]"
                            >
                                <div className="w-7 md:w-9 h-7 md:h-9 bg-emerald-600 rounded-lg md:rounded-xl flex items-center justify-center text-white font-bold text-[10px] md:text-sm shadow-md">
                                    {getInitials(currentUser?.displayName || 'Business')}
                                </div>
                                <div className="hidden lg:block text-left">
                                    <p className="text-xs font-bold text-slate-900 leading-tight">
                                        {currentUser?.displayName || 'Business Owner'}
                                    </p>
                                    <p className={`text-[10px] font-bold ${isGhosting ? 'text-red-500' : 'text-slate-500'}`}>
                                        {isGhosting ? 'Ghost Session' : 'Administrator'}
                                    </p>
                                </div>
                                <ChevronDown size={14} className={`text-slate-400 transition-transform hidden md:block ${isProfileOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isProfileOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
                                    >
                                        <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-1">Signed in as</p>
                                            <p className="text-sm font-bold text-slate-900 truncate">{currentUser?.email}</p>
                                        </div>
                                        <div className="p-2">
                                            <Link
                                                to="/business/app/settings"
                                                onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                                            >
                                                <UserIcon size={18} />
                                                My Profile
                                            </Link>
                                            <Link
                                                to="/business/app/settings"
                                                onClick={() => setIsProfileOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                                            >
                                                <Settings size={18} />
                                                Settings
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
                            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
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
                                className={`flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 rounded-2xl text-base md:text-lg mb-2 transition-all ${isActive(item.path)
                                    ? 'bg-emerald-600 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                <item.icon size={20} className="md:w-6 md:h-6" />
                                <span className="font-bold">{item.name}</span>
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
            <Analytics />
        </div>
    );
}

export default BusinessLayout;
