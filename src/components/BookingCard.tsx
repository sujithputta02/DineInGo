import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Calendar, Clock, MapPin, Users, Apple, Chrome, FileText, ShoppingBag, MessageSquare, Star, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { bookingsApi } from '../services/api';

interface BookingCardProps {
    booking: any;
    preOrder?: any;
    onRefresh: () => void;
    onReview: (booking: any) => void;
    onConfirm?: (id: string) => void;
    onAddToAppleWallet?: (booking: any) => void;
    onAddToGoogleWallet?: (booking: any) => void;
    onGenerateInvoice?: (booking: any) => void;
    confirmingId?: string | null;
    cancellingId?: string | null;
}

const BookingCard: React.FC<BookingCardProps> = ({
    booking,
    preOrder,
    onRefresh,
    onReview,
    onConfirm,
    onAddToAppleWallet,
    onAddToGoogleWallet,
    onGenerateInvoice,
    confirmingId,
    cancellingId
}) => {
    const navigate = useNavigate();
    const [localIsCancelling, setLocalIsCancelling] = useState(false);
    const [localIsDeleting, setLocalIsDeleting] = useState(false);

    // Determine booking type and name
    const isEvent = !!(booking.eventId || booking.eventName);
    const name = booking.restaurantName || booking.eventName || booking.restaurantId?.name || booking.eventId?.title || 'Unknown';
    const type = booking.restaurantId || booking.restaurantName ? 'Restaurant Booking' : booking.eventId || booking.eventName ? 'Event Registration' : 'Booking';

    // Parse dates
    let dateStr = booking.date;
    if (booking.date && new Date(booking.date).toString() !== 'Invalid Date') {
        dateStr = new Date(booking.date).toISOString().split('T')[0];
    }
    const bookingDateTime = dayjs(`${dateStr} ${booking.time}`);

    // Logic for cancellation and review availability
    const isPast = dayjs().isAfter(bookingDateTime);
    const isWithinOneHour = dayjs().isAfter(bookingDateTime.subtract(1, 'hour'));
    const canCancel = booking.status === 'confirmed' && !isWithinOneHour && !isPast;
    const isVisitCompleted = dayjs().isAfter(bookingDateTime.add(2, 'hours'));

    const handleCancel = async () => {
        if (!window.confirm('Are you sure you want to cancel this reservation? This cannot be undone.')) return;

        setLocalIsCancelling(true);
        try {
            await bookingsApi.cancel(booking._id || booking.id);
            toast.success('Your reservation has been cancelled');
            onRefresh();
        } catch (error) {
            console.error('Error cancelling booking:', error);
            toast.error('Failed to cancel reservation. Please try again.');
        } finally {
            setLocalIsCancelling(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this booking history? This action cannot be undone.')) return;

        setLocalIsDeleting(true);
        try {
            await bookingsApi.delete(booking._id || booking.id);
            toast.success('Booking deleted successfully');
            onRefresh();
        } catch (error) {
            console.error('Error deleting booking:', error);
            toast.error('Failed to delete booking');
        } finally {
            setLocalIsDeleting(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'confirmed': return 'text-green-600 font-semibold';
            case 'pending': return 'text-yellow-600 font-semibold';
            case 'cancelled': return 'text-red-600 font-semibold';
            case 'completed': return 'text-blue-600 font-semibold';
            default: return 'text-gray-600 font-semibold';
        }
    };

    return (
        <div
            className="bg-white rounded-3xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-2 hover:border-emerald-500/30 cursor-pointer"
            onClick={() => onGenerateInvoice && onGenerateInvoice(booking)}
        >
            {/* Header with Gradient and Status */}
            <div className={`relative h-48 flex items-center justify-center p-6 ${isEvent ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-gradient-to-br from-emerald-400 to-teal-600'}`}>
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold bg-white/90 backdrop-blur-sm text-emerald-700 shadow-sm uppercase tracking-wider">
                    {booking.status}
                </div>
                <div className="text-center">
                    <h3 className="text-2xl font-bold text-white mb-1 drop-shadow-sm">
                        {name}
                    </h3>
                    <p className="text-white/80 text-xs font-medium uppercase tracking-[0.2em]">
                        {type}
                    </p>
                </div>
            </div>

            {/* Content Body */}
            <div className="p-6">
                <div className="space-y-4">
                    {/* Date and Time */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center text-gray-700">
                            <Calendar className="w-5 h-5 mr-3 text-emerald-500" />
                            <span className="font-medium">
                                {new Date(dateStr).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </span>
                        </div>
                        <div className="flex items-center text-gray-700">
                            <Clock className="w-5 h-5 mr-2 text-emerald-500" />
                            <span className="font-semibold">{booking.time}</span>
                        </div>
                    </div>

                    {/* Guests and Details */}
                    <div className="flex items-center gap-6 py-3 border-y border-gray-50">
                        <div className="flex items-center text-gray-600">
                            <Users className="w-4 h-4 mr-2" />
                            <span className="text-sm font-medium">{booking.guests || booking.numberOfGuests || 1} Guests</span>
                        </div>
                        {booking.table && (
                            <div className="flex items-center text-gray-600">
                                <span className="w-4 h-4 mr-2 text-xs flex items-center justify-center border-2 border-gray-400 rounded-sm font-bold">#</span>
                                <span className="text-sm font-medium">Table {booking.table}</span>
                            </div>
                        )}
                        {booking.bookingNumber && (
                            <div className="text-[10px] text-gray-400 font-mono ml-auto">
                                {booking.bookingNumber}
                            </div>
                        )}
                    </div>

                    {/* Action Area */}
                    <div className="space-y-3 pt-2">
                        {/* Primary Buttons */}
                        {booking.status === 'pending' && (
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onConfirm && onConfirm(booking._id || booking.id); }}
                                    className="py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all font-bold shadow-sm active:scale-95 text-sm"
                                    disabled={confirmingId === (booking._id || booking.id) || localIsCancelling}
                                >
                                    {confirmingId === (booking._id || booking.id) ? 'Confirming...' : 'Confirm'}
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                                    className="py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-bold active:scale-95 text-sm"
                                    disabled={localIsCancelling}
                                >
                                    {localIsCancelling ? '...' : 'Cancel'}
                                </button>
                            </div>
                        )}

                        {booking.status === 'confirmed' && (
                            <div className="space-y-3">
                                {canCancel ? (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                                        className="w-full py-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all font-bold active:scale-95 text-sm border border-rose-100"
                                    >
                                        Cancel Reservation
                                    </button>
                                ) : !isVisitCompleted && (
                                    <div className="text-center p-2 rounded-xl bg-amber-50 border border-amber-100">
                                        <p className="text-[11px] text-amber-700 font-medium flex items-center justify-center gap-1">
                                            <Clock size={12} /> Non-cancellable (Within 1 hour)
                                        </p>
                                    </div>
                                )}

                                {isVisitCompleted && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onReview(booking); }}
                                        className="w-full py-2.5 bg-yellow-400 text-yellow-950 rounded-xl hover:bg-yellow-500 transition-all font-bold shadow-sm flex items-center justify-center gap-2 active:scale-95 text-sm"
                                    >
                                        <Star size={14} className="fill-current" />
                                        Rate Your Experience
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Special Requests or Notes */}
                        {(booking.specialRequests || booking.specialRequest) && (
                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <p className="text-[11px] text-gray-500 leading-relaxed">
                                    <span className="font-bold text-gray-700">Request:</span> {booking.specialRequests || booking.specialRequest}
                                </p>
                            </div>
                        )}

                        {/* Secondary Actions (Wallet, Invoice, Delete) */}
                        <div className="flex items-center justify-between gap-2 pt-2">
                            <div className="flex gap-2">
                                {onAddToAppleWallet && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onAddToAppleWallet(booking); }}
                                        className="p-2 bg-black text-white rounded-lg hover:scale-110 transition-all"
                                        title="Apple Wallet"
                                    >
                                        <Apple size={14} />
                                    </button>
                                )}
                                {onAddToGoogleWallet && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onAddToGoogleWallet(booking); }}
                                        className="p-2 bg-blue-600 text-white rounded-lg hover:scale-110 transition-all"
                                        title="Google Wallet"
                                    >
                                        <Chrome size={14} />
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-2 items-center">
                                {(isPast || booking.status === 'cancelled') && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                                        className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                        title="Delete from History"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingCard;
