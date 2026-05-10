import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { preOrderApi } from '../../services/api';
import socketService from '../../utils/socketService';
import { toast } from 'react-toastify';
import {
    ClipboardList,
    CheckCircle,
    XCircle,
    Clock,
    ChefHat,
    ShoppingBag,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PreOrderItem {
    itemId: {
        name: string;
        price: number;
    };
    quantity: number;
    specialRequests?: string;
}

interface PreOrder {
    _id: string;
    bookingId: {
        _id: string;
        date: string;
        time: string;
        seats: number;
        customerName: string;
    };
    customerName: string; // From preorder schema or booking
    items: PreOrderItem[];
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
    totalAmount: number;
    specialRequests?: string;
    createdAt: string;
}

interface PreOrderManagementProps {
    businessId?: string;
}

const PreOrderManagement: React.FC<PreOrderManagementProps> = ({ businessId }) => {
    const { currentUser } = useAuth();
    const effectiveBusinessId = businessId || currentUser?.uid;
    const [preOrders, setPreOrders] = useState<PreOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (effectiveBusinessId) {
            fetchPreOrders();

            const socket = socketService.getSocket();
            if (socket) {
                socket.emit('join-business-room', effectiveBusinessId);

                socket.on('preorder:new', (data: { preOrder: PreOrder }) => {
                    setPreOrders(prev => [data.preOrder, ...prev]);
                    toast.info(`New pre-order from ${data.preOrder.customerName}`);
                });

                socket.on('preorder:updated', (data: { preOrder: PreOrder }) => {
                    setPreOrders(prev => prev.map(p => p._id === data.preOrder._id ? data.preOrder : p));
                });
            }
        }
    }, [currentUser]);

    const fetchPreOrders = async () => {
        if (!effectiveBusinessId) return;
        try {
            setLoading(true);
            const res = await preOrderApi.getBusinessPreOrders(effectiveBusinessId);
            if (res.success) {
                setPreOrders(res.data);
            }
        } catch (error) {
            toast.error('Failed to load pre-orders');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (preOrderId: string, newStatus: string) => {
        try {
            const res = await preOrderApi.updateStatus(preOrderId, newStatus);
            if (res.success) {
                setPreOrders(prev => prev.map(p => p._id === preOrderId ? res.data : p));
                toast.success(`Order marked as ${newStatus}`);
            }
        } catch (error) {
            toast.error('Failed to update status');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'confirmed': return 'bg-blue-100 text-blue-800';
            case 'preparing': return 'bg-orange-100 text-orange-800';
            case 'ready': return 'bg-green-100 text-green-800';
            case 'completed': return 'bg-gray-100 text-gray-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const filteredOrders = preOrders.filter(order => {
        if (filter === 'all') return order.status !== 'completed' && order.status !== 'cancelled';
        if (filter === 'active') return ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status);
        if (filter === 'history') return ['completed', 'cancelled'].includes(order.status);
        return order.status === filter;
    });

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
                    <h1 className="text-2xl font-bold text-gray-900">Pre-Order Management</h1>
                    <p className="text-gray-500">Track and manage customer pre-orders</p>
                </div>

                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setFilter('preparing')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'preparing' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        Kitchen
                    </button>
                    <button
                        onClick={() => setFilter('history')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${filter === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                            }`}
                    >
                        History
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                    {filteredOrders.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                            <ClipboardList size={48} className="mx-auto text-gray-300 mb-4" />
                            <p>No pre-orders found</p>
                        </div>
                    ) : (
                        filteredOrders.map((order) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                key={order._id}
                                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                            >
                                <div className="p-4 border-b border-gray-100 flex justify-between items-start bg-gray-50">
                                    <div>
                                        <h3 className="font-bold text-gray-900">{order.customerName}</h3>
                                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                            <Clock size={12} />
                                            {new Date(order.bookingId?.date).toLocaleDateString()} at {order.bookingId?.time}
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                                        {order.status}
                                    </span>
                                </div>

                                <div className="p-4">
                                    <div className="space-y-3 mb-4">
                                        {order.items.map((item, index) => (
                                            <div key={index} className="flex justify-between items-start text-sm">
                                                <div className="flex gap-2">
                                                    <span className="font-bold text-gray-700">{item.quantity}x</span>
                                                    <span className="text-gray-900">{item.itemId?.name || 'Unknown Item'}</span>
                                                </div>
                                                <span className="text-gray-500">₹{(item.itemId?.price || 0) * item.quantity}</span>
                                            </div>
                                        ))}
                                        {order.specialRequests && (
                                            <div className="bg-amber-50 text-amber-800 text-xs p-2 rounded border border-amber-100 italic">
                                                Note: {order.specialRequests}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center py-3 border-t border-gray-100 font-bold text-gray-900">
                                        <span>Total</span>
                                        <span>₹{order.totalAmount}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        {order.status === 'pending' && (
                                            <button
                                                onClick={() => handleStatusUpdate(order._id, 'confirmed')}
                                                className="col-span-2 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                                            >
                                                Confirm Order
                                            </button>
                                        )}
                                        {order.status === 'confirmed' && (
                                            <button
                                                onClick={() => handleStatusUpdate(order._id, 'preparing')}
                                                className="col-span-2 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 flex justify-center items-center gap-2"
                                            >
                                                <ChefHat size={16} /> Send to Kitchen
                                            </button>
                                        )}
                                        {order.status === 'preparing' && (
                                            <button
                                                onClick={() => handleStatusUpdate(order._id, 'ready')}
                                                className="col-span-2 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 flex justify-center items-center gap-2"
                                            >
                                                <CheckCircle size={16} /> Mark Ready
                                            </button>
                                        )}
                                        {order.status === 'ready' && (
                                            <button
                                                onClick={() => handleStatusUpdate(order._id, 'completed')}
                                                className="col-span-2 py-2 bg-gray-800 text-white rounded-lg text-sm font-semibold hover:bg-gray-900"
                                            >
                                                Complete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default PreOrderManagement;
