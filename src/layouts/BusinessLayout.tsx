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
    Ticket
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../firebase';
import { toast } from 'react-toastify';
import DineInGoLogo from '../components/DineInGoLogo';
import { useAuth } from '../contexts/AuthContext';

const BusinessLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

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
        { name: 'Dashboard', path: '/business/app/dashboard', icon: LayoutDashboard },
        { name: 'Reservations', path: '/business/app/reservations', icon: Calendar },
        { name: 'Waitlist', path: '/business/app/waitlist', icon: Users },
        { name: 'Events', path: '/business/app/events', icon: Ticket },
        { name: 'Pre-orders', path: '/business/app/pre-orders', icon: ShoppingBag },
        { name: 'Menu', path: '/business/app/menu', icon: Menu },
        { name: 'Floor Plans', path: '/business/app/floor-plans', icon: Map },
        { name: 'Settings', path: '/business/app/settings', icon: Settings },
    ];

    const getInitials = (name: string | null) => {
        if (!name) return 'B';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar for Desktop */}
            <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white fixed h-full z-20">
                <div className="p-6 border-b border-slate-800 flex flex-col gap-1">
                    <Link to="/business/app/dashboard" className="flex items-center gap-2">
                        <DineInGoLogo size="small" color="#ffffff" />
                    </Link>
                    <span className="text-emerald-400 text-xs uppercase tracking-wider font-bold ml-1">Business Portal</span>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive(item.path)
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <item.icon size={20} />
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl w-full transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 md:ml-64 flex flex-col">
                {/* Top Header */}
                <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    {/* Search / Breadcrumbs placeholder */}
                    <div className="hidden md:flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-2xl w-96 border border-slate-200">
                        <Search size={18} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder="Quick search..."
                            className="bg-transparent border-none outline-none text-sm w-full text-slate-600 placeholder:text-slate-400"
                        />
                    </div>

                    <div className="flex-1 md:hidden">
                        <DineInGoLogo size="small" />
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors relative">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>

                        <div className="h-8 w-[1px] bg-slate-200"></div>

                        <div className="relative">
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center gap-3 p-1 pr-3 hover:bg-slate-100 rounded-2xl transition-all"
                            >
                                <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
                                    {getInitials(currentUser?.displayName || 'Business')}
                                </div>
                                <div className="hidden lg:block text-left">
                                    <p className="text-xs font-bold text-slate-900 leading-tight">
                                        {currentUser?.displayName || 'Business Owner'}
                                    </p>
                                    <p className="text-[10px] text-slate-500">Administrator</p>
                                </div>
                                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
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
                            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                            <Menu size={24} />
                        </button>
                    </div>
                </header>

                {/* Main Content */}
                <main className="p-6">
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
                        className="fixed inset-0 bg-slate-900 z-40 md:hidden pt-20 p-6 flex flex-col"
                    >
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-lg mb-2 transition-all ${isActive(item.path)
                                    ? 'bg-emerald-600 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                <item.icon size={24} />
                                <span className="font-bold">{item.name}</span>
                            </Link>
                        ))}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-4 px-6 py-4 text-red-400 mt-auto font-bold text-lg"
                        >
                            <LogOut size={24} />
                            Logout
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BusinessLayout;
