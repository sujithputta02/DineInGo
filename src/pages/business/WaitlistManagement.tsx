import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { waitlistApi } from '../../services/api';
import socketService from '../../utils/socketService';
import { toast } from 'react-toastify';
import {
    Clock,
    Users,
    Bell,
    CheckCircle,
    XCircle,
    Phone,
    MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WaitlistEntry {
    _id: string;
    businessId: string;
    customerName: string;
    customerPhone: string;
    partySize: number;
    status: 'waiting' | 'notified' | 'seated' | 'cancelled';
    position: number;
    estimatedWaitTime: number;
    notes?: string;
    createdAt: string;
    notifiedAt?: string;
}

const WaitlistManagement: React.FC = () => {
    const { currentUser } = useAuth();
    const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'waiting' | 'notified'>('waiting');

    useEffect(() => {
        if (currentUser?.uid) {
            fetchWaitlist();

            const socket = socketService.getSocket();
            if (socket) {
                socket.emit('join-business-room', currentUser.uid);

                socket.on('waitlist:joined', (data: { entry: WaitlistEntry }) => {
                    setWaitlist(prev => {
                        const newList = [...prev, data.entry].sort((a, b) => a.position - b.position);
                        toast.info(`New waitlist entry: ${data.entry.customerName} (${data.entry.partySize} ppl)`);
                        return newList;
                    });
                });

                socket.on('waitlist:cancelled', (data: { entry: WaitlistEntry }) => {
                    setWaitlist(prev => prev.filter(e => e._id !== data.entry._id));
                });

                socket.on('waitlist:seated', () => fetchWaitlist());
                socket.on('waitlist:customer-notified', () => fetchWaitlist());
            }
        }
    }, [currentUser]);

    const fetchWaitlist = async () => {
        try {
            setLoading(true);
            const res = await waitlistApi.getBusinessWaitlist(currentUser!.uid);
            if (res.success) {
                setWaitlist(res.data);
            }
        } catch (error) {
            toast.error('Failed to load waitlist');
        } finally {
            setLoading(false);
        }
    };

    const handleNotify = async (entry: WaitlistEntry) => {
        try {
            const res = await waitlistApi.notifyCustomer(entry._id);
            if (res.success) {
                setWaitlist(prev => prev.map(e => e._id === entry._id ? res.data : e));
                toast.success(`Notified ${entry.customerName}`);
            }
        } catch (error) {
            toast.error('Failed to notify customer');
        }
    };

    const handleSeated = async (entry: WaitlistEntry) => {
        try {
            const res = await waitlistApi.markAsSeated(entry._id);
            if (res.success) {
                setWaitlist(prev => prev.filter(e => e._id !== entry._id));
                toast.success(`${entry.customerName} seated`);
            }
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const handleCancel = async (entry: WaitlistEntry) => {
        if (!window.confirm(`Cancel waitlist entry for ${entry.customerName}?`)) return;

        try {
            const res = await waitlistApi.cancel(entry._id);
            if (res.success) {
                setWaitlist(prev => prev.filter(e => e._id !== entry._id));
                toast.info('Entry cancelled');
            }
        } catch (error) {
            toast.error('Failed to cancel entry');
        }
    };

    const filteredWaitlist = waitlist.filter(entry => {
        if (filter === 'all') return true;
        if (filter === 'waiting') return entry.status === 'waiting';
        if (filter === 'notified') return entry.status === 'notified';
        return true;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'waiting': return 'bg-yellow-100 text-yellow-800';
            case 'notified': return 'bg-green-100 text-green-800';
            case 'seated': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Waitlist Management</h1>
                    <p className="text-gray-500">Manage your restaurant's waiting queue</p>
                </div>

                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                    {(['waiting', 'notified', 'all'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all capitalist ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <div className="col-span-1 text-center">Pos</div>
                    <div className="col-span-3">Customer</div>
                    <div className="col-span-2">Party Size</div>
                    <div className="col-span-2">Waited</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>

                <div className="divide-y divide-gray-100">
                    <AnimatePresence initial={false}>
                        {filteredWaitlist.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="col-span-12 p-12 text-center text-gray-500"
                            >
                                <div className="flex justify-center mb-4">
                                    <Users size={48} className="text-gray-300" />
                                </div>
                                <p>No customers in the waitlist</p>
                            </motion.div>
                        ) : (
                            filteredWaitlist.map((entry) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    key={entry._id}
                                    className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 transition-colors"
                                >
                                    <div className="col-span-1 text-center font-bold text-gray-700">#{entry.position}</div>
                                    <div className="col-span-3">
                                        <div className="font-medium text-gray-900">{entry.customerName}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                            <Phone size={10} /> {entry.customerPhone}
                                        </div>
                                        {entry.notes && (
                                            <div className="text-xs text-amber-600 mt-1 italic flex items-center gap-1">
                                                <MessageSquare size={10} /> {entry.notes}
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-2 flex items-center gap-2">
                                        <Users size={16} className="text-gray-400" />
                                        <span>{entry.partySize} guests</span>
                                    </div>
                                    <div className="col-span-2 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Clock size={16} className="text-gray-400" />
                                            {Math.floor((Date.now() - new Date(entry.createdAt).getTime()) / 60000)} mins
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entry.status)}`}>
                                            {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                                        </span>
                                    </div>
                                    <div className="col-span-2 flex justify-end gap-2">
                                        {entry.status === 'waiting' && (
                                            <button
                                                onClick={() => handleNotify(entry)}
                                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                title="Notify Table Ready"
                                            >
                                                <Bell size={18} />
                                            </button>
                                        )}
                                        {entry.status === 'notified' && (
                                            <button
                                                onClick={() => handleSeated(entry)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Mark Seated"
                                            >
                                                <CheckCircle size={18} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleCancel(entry)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Cancel"
                                        >
                                            <XCircle size={18} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default WaitlistManagement;
