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
    Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../firebase';
import { toast } from 'react-toastify';
import DineInGoLogo from '../components/DineInGoLogo';

const BusinessLayout: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Helper to check if link is active
    const isActive = (path: string) => location.pathname.startsWith(path);

    const handleLogout = async () => {
        try {
            await auth.signOut();
            sessionStorage.removeItem('userData');
            toast.success('Logged out successfully');
            navigate('/business/login');
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('Failed to logout');
        }
    };

    const navItems = [
        { name: 'Dashboard', path: '/business/dashboard', icon: LayoutDashboard },
        { name: 'My Restaurants', path: '/business/restaurants', icon: ChefHat },
        { name: 'Reservations', path: '/business/reservations', icon: Calendar },
        { name: 'Floor Plans', path: '/business/floor-plans', icon: Map },
        { name: 'Settings', path: '/business/settings', icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar for Desktop */}
            <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white fixed h-full z-20">
                <div className="p-6 border-b border-slate-800 flex flex-col gap-1">
                    <Link to="/business/dashboard" className="flex items-center gap-2">
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

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 w-full bg-slate-900 text-white z-30 px-4 py-3 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                    <DineInGoLogo size="small" color="#ffffff" />
                    <span className="text-emerald-400 text-xs font-bold border-l border-slate-700 pl-2 ml-2">Business</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
                    <Menu size={24} />
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, x: '100%' }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: '100%' }}
                        className="fixed inset-0 bg-slate-900 z-40 md:hidden pt-16 p-4 flex flex-col"
                    >
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-4 rounded-xl text-lg mb-2 ${isActive(item.path) ? 'bg-emerald-600 text-white' : 'text-slate-400'
                                    }`}
                            >
                                <item.icon size={24} />
                                {item.name}
                            </Link>
                        ))}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-4 text-red-400 mt-auto"
                        >
                            <LogOut size={24} />
                            Logout
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-6 pt-20 md:pt-6">
                <Outlet />
            </main>
        </div>
    );
};

export default BusinessLayout;
