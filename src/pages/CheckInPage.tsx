import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle,
    Camera,
    ChefHat,
    MessageSquare,
    Clock,
    Info,
    ArrowRight,
    ShieldCheck,
    Zap,
    Coffee
} from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { API_CONFIG } from '../config/api';

const CheckInPage: React.FC = () => {
    const { bookingId } = useParams<{ bookingId: string }>();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [booking, setBooking] = useState<any>(null);
    const [restaurant, setRestaurant] = useState<any>(null);

    useEffect(() => {
        const performCheckIn = async () => {
            try {
                const response = await axios.post<any>(`${API_CONFIG.BASE_URL}/api/bookings/${bookingId}/check-in`);

                if (response.data.success) {
                    const bookingData = response.data.booking;
                    setBooking(bookingData);
                    // Set restaurant data from populated booking or fallback
                    setRestaurant(bookingData.restaurantId || { name: 'this restaurant' });
                    setStatus('success');
                    toast.success('Welcome! You have been checked in.');
                } else {
                    throw new Error('Check-in failed');
                }
            } catch (err: any) {
                console.error('Check-in error:', err);
                setStatus('error');
                toast.error(err.response?.data?.message || 'Failed to check in. Please try again or ask staff.');
            }
        };

        if (bookingId) {
            performCheckIn();
        }
    }, [bookingId]);

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-white font-['Outfit']">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full mb-4"
                />
                <p className="text-xl font-medium animate-pulse">Checking you in...</p>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-white font-['Outfit'] space-y-6">
                <div className="p-4 bg-red-500/20 rounded-full">
                    <Info className="w-12 h-12 text-red-500" />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">Check-in Error</h2>
                    <p className="text-gray-400">We couldn't verify your booking ID. Please try scanning again or contact the restaurant staff.</p>
                </div>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white font-['Outfit'] overflow-x-hidden">
            {/* Dynamic Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/20 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 max-w-lg mx-auto p-6 pt-12">
                {/* Success Header */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center mb-10"
                >
                    <div className="inline-flex items-center justify-center p-4 bg-emerald-500/20 rounded-full mb-6 border border-emerald-500/30">
                        <ShieldCheck className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Welcome to {restaurant?.name}!</h1>
                    <p className="text-gray-400">Your table is ready. Experience the magic of DineInGo.</p>
                </motion.div>

                {/* Feature Cards */}
                <div className="grid grid-cols-1 gap-4">
                    {/* AR Menu Card */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate(`/ar-experience/${bookingId}`)}
                        className="group relative overflow-hidden p-6 bg-white/5 border border-white/10 rounded-3xl text-left backdrop-blur-xl transition-all hover:bg-white/10"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="p-3 bg-purple-500/20 rounded-2xl mb-4 border border-purple-500/30 group-hover:scale-110 transition-transform">
                                    <Camera className="w-6 h-6 text-purple-400" />
                                </div>
                                <h3 className="text-xl font-bold mb-1">Launch AR Menu</h3>
                                <p className="text-sm text-gray-400">See your dishes in 3D before they arrive.</p>
                            </div>
                            <ArrowRight className="w-6 h-6 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </div>
                        {/* Visual Flare */}
                        <div className="absolute bottom-[-20%] right-[-10%] w-32 h-32 bg-purple-500/10 blur-3xl rounded-full" />
                    </motion.button>

                    {/* Dietary Assistant Card */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/feedback')} /* Link to Dietary AI usually inside feedback or dedicated */
                        className="group relative overflow-hidden p-6 bg-white/5 border border-white/10 rounded-3xl text-left backdrop-blur-xl transition-all hover:bg-white/10"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="p-3 bg-emerald-500/20 rounded-2xl mb-4 border border-emerald-500/30 group-hover:scale-110 transition-transform">
                                    <ChefHat className="w-6 h-6 text-emerald-400" />
                                </div>
                                <h3 className="text-xl font-bold mb-1">Dietary Concierge</h3>
                                <p className="text-sm text-gray-400">Get personalized menu suggestions.</p>
                            </div>
                            <ArrowRight className="w-6 h-6 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </div>
                        {/* Visual Flare */}
                        <div className="absolute bottom-[-20%] right-[-10%] w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full" />
                    </motion.button>

                    {/* Quick Help Card */}
                    <motion.div
                        className="p-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl flex items-center justify-between"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-brand-yellow/20 rounded-2xl border border-brand-yellow/30">
                                <Coffee className="w-6 h-6 text-yellow-400" />
                            </div>
                            <div>
                                <h3 className="font-bold">Need assistance?</h3>
                                <p className="text-xs text-gray-400">Request service from the staff.</p>
                            </div>
                        </div>
                        <button className="px-4 py-2 bg-yellow-500/80 hover:bg-yellow-500 text-black text-xs font-bold rounded-xl transition-all">
                            CALL STAFF
                        </button>
                    </motion.div>
                </div>

                {/* Real-time Info Section */}
                <div className="mt-8 pt-8 border-t border-white/10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 mb-4">
                        <Clock className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs uppercase tracking-widest font-bold">In-Restaurant Session Active</span>
                    </div>
                    <p className="text-xs text-gray-500">Booking ID: {bookingId}</p>
                </div>
            </div>
        </div>
    );
};

export default CheckInPage;
