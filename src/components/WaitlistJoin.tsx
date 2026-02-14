import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { waitlistApi } from '../services/api';
import socketService from '../utils/socketService';
import { toast } from 'react-toastify';
import { Clock, Users, Bell, CheckCircle, XCircle, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WaitlistJoinProps {
    businessId: string;
    businessName: string;
    onClose?: () => void;
}

interface WaitlistEntry {
    _id: string;
    position: number;
    estimatedWaitTime: number;
    partySize: number;
    status: 'waiting' | 'notified' | 'seated' | 'cancelled';
    createdAt: string;
}

const WaitlistJoin: React.FC<WaitlistJoinProps> = ({ businessId, businessName, onClose }) => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [currentEntry, setCurrentEntry] = useState<WaitlistEntry | null>(null);
    const [partySize, setPartySize] = useState(2);
    const [notes, setNotes] = useState('');
    const [customerName, setCustomerName] = useState(currentUser?.displayName || '');
    const [customerPhone, setCustomerPhone] = useState('');

    useEffect(() => {
        if (currentUser) {
            checkExistingStatus();
        }

        // Setup socket listeners
        const socket = socketService.getSocket();
        if (socket && currentUser) {
            socket.on('waitlist:position-update', (data: { position: number, estimatedWaitTime: number }) => {
                if (currentEntry) {
                    setCurrentEntry(prev => prev ? { ...prev, position: data.position, estimatedWaitTime: data.estimatedWaitTime } : null);
                    toast.info(`Your position is now #${data.position}`);
                }
            });

            socket.on('waitlist:table-ready', (data: { entry: WaitlistEntry }) => {
                setCurrentEntry(data.entry);
                toast.success('Your table is ready! Please head to the host stand.');
                // Play notification sound if possible
                new Audio('/sounds/notification.mp3').play().catch(() => { });
            });

            socket.on('waitlist:cancelled', () => {
                setCurrentEntry(null);
                toast.warn('Your waitlist entry was cancelled.');
            });
        }

        return () => {
            if (socket) {
                socket.off('waitlist:position-update');
                socket.off('waitlist:table-ready');
                socket.off('waitlist:cancelled');
            }
        };
    }, [currentUser, businessId]);

    const checkExistingStatus = async () => {
        if (!currentUser) return;
        try {
            const res = await waitlistApi.getCustomerStatus(currentUser.uid);
            if (res.success && res.data) {
                setCurrentEntry(res.data);
            }
        } catch (error) {
            console.error('Error checking waitlist status:', error);
        }
    };

    const handleJoinWaitlist = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) {
            toast.error('Please login to join the waitlist');
            return;
        }

        try {
            setLoading(true);
            const data = {
                businessId,
                customerId: currentUser.uid,
                customerName: customerName || currentUser.displayName || 'Guest',
                customerEmail: currentUser.email,
                customerPhone,
                partySize,
                notes
            };

            const res = await waitlistApi.join(data);
            if (res.success) {
                setCurrentEntry(res.data);
                toast.success('Joined waitlist successfully!');
            } else {
                toast.error('Failed to join waitlist');
            }
        } catch (error) {
            toast.error('Failed to join waitlist');
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveWaitlist = async () => {
        if (!currentEntry) return;
        if (!window.confirm('Are you sure you want to leave the waitlist?')) return;

        try {
            setLoading(true);
            const res = await waitlistApi.cancel(currentEntry._id);
            if (res.success) {
                setCurrentEntry(null);
                toast.info('Left waitlist');
                if (onClose) onClose();
            }
        } catch (error) {
            toast.error('Failed to leave waitlist');
        } finally {
            setLoading(false);
        }
    };

    if (!currentUser) {
        return (
            <div className="text-center p-6 bg-gray-50 rounded-xl">
                <p className="text-gray-600 mb-4">Please login to join the waitlist</p>
                <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg">Login</button>
            </div>
        );
    }

    if (currentEntry) {
        return (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-md w-full mx-auto">
                <div className={`p-6 text-white text-center ${currentEntry.status === 'notified' ? 'bg-green-600' : 'bg-emerald-600'
                    }`}>
                    <h3 className="text-2xl font-bold mb-2">
                        {currentEntry.status === 'notified' ? 'Table Ready!' : 'You are on the list'}
                    </h3>
                    <p className="opacity-90">{businessName}</p>
                </div>

                {/* Dino Waitlist Guard */}
                <div className="bg-emerald-50/50 p-4 border-b border-gray-100 flex items-center gap-4">
                    <div className="relative">
                        <motion.div
                            animate={{
                                scale: [1, 1.05, 1],
                                rotate: [0, 2, -2, 0]
                            }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="w-16 h-16 bg-white rounded-xl shadow-sm border border-emerald-100 p-2"
                        >
                            <img src="/images/Dino Icon.svg" alt="Dino Guard" className="w-full h-full object-contain" />
                        </motion.div>
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">GUARD</div>
                    </div>
                    <div>
                        <p className="text-xs font-black text-emerald-600 uppercase tracking-tighter mb-0.5">Dino's Guard Duty</p>
                        <p className="text-sm text-gray-600 font-medium leading-tight">
                            {currentEntry.status === 'notified'
                                ? "RAWR! It's feast time! Stomp over to the host stand now! 🦖🍴"
                                : "Don't worry, I'm keeping your spot safe from hungry T-Rexes! 🦕🛡️"}
                        </p>
                    </div>
                </div>

                <div className="p-8">
                    {currentEntry.status === 'notified' ? (
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 mb-4 animate-bounce">
                                <Bell size={32} />
                            </div>
                            <p className="text-gray-600 text-lg">
                                Your table for <strong className="text-gray-900">{currentEntry.partySize} guests</strong> is ready.
                            </p>
                            <p className="text-sm text-gray-500">Please head to the host stand within 5 minutes.</p>
                            <div className="pt-4">
                                <p className="text-xs text-gray-400 mb-2">Wait ID: #{currentEntry._id.slice(-6).toUpperCase()}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="flex justify-center gap-8">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-gray-900 mb-1">{currentEntry.position}</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider">Position</div>
                                </div>
                                <div className="w-px bg-gray-100"></div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-emerald-600 mb-1">~{currentEntry.estimatedWaitTime}m</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider">Est. Wait</div>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Party Size</span>
                                    <span className="font-medium text-gray-900">{currentEntry.partySize} Guests</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Joined at</span>
                                    <span className="font-medium text-gray-900">
                                        {new Date(currentEntry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleLeaveWaitlist}
                                disabled={loading}
                                className="w-full py-3 text-red-500 font-medium hover:bg-red-50 rounded-xl transition-colors text-sm"
                            >
                                Leave Waitlist
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-auto">
            <div className="text-center mb-6">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-3">
                    <Clock size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Join Waitlist</h3>
                <p className="text-gray-500 text-sm">Current wait time is approx. 15-30 mins</p>
            </div>

            <form onSubmit={handleJoinWaitlist} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                    <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="John Doe"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="+1 (555) 000-0000"
                    />
                    <p className="text-xs text-gray-500 mt-1">We'll text you when your table is ready</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Party Size</label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="1"
                            max="12"
                            value={partySize}
                            onChange={(e) => setPartySize(parseInt(e.target.value))}
                            className="flex-1 accent-emerald-600"
                        />
                        <span className="w-12 text-center font-bold text-gray-900 border border-gray-200 py-1 rounded bg-gray-50">
                            {partySize}
                        </span>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="High chair needed, outside seating..."
                        rows={2}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-900/10 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? 'Joining...' : 'Join Waitlist'}
                </button>
            </form>
        </div>
    );
};

export default WaitlistJoin;
