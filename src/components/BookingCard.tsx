import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Calendar, Clock, MapPin, Users, Apple, Chrome, FileText, ShoppingBag, MessageSquare, Star } from 'lucide-react';
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
    const canCancel = booking.status === 'confirmed' && dayjs().isBefore(bookingDateTime.subtract(2, 'hours'));
    const isVisitCompleted = dayjs().isAfter(bookingDateTime.add(2, 'hours'));

    const handleCancel = async () => {
        if (!window.confirm('Are you sure you want to cancel this booking?')) return;

        setLocalIsCancelling(true);
        try {
            await bookingsApi.cancel(booking._id || booking.id);
            toast.success('Booking cancelled successfully');
            onRefresh();
        } catch (error) {
            console.error('Error cancelling booking:', error);
            toast.error('Failed to cancel booking');
        } finally {
            setLocalIsCancelling(false);
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
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Left Side: Info */}
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="text-lg font-semibold">{name}</div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${isEvent ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {type}
                        </span>
                    </div>

                    <div className="text-gray-700 text-sm">
                        <span className="font-medium">Date:</span> {new Date(dateStr).toLocaleDateString()} |
                        <span className="font-medium ml-2">Time:</span> {booking.time}
                    </div>

                    <div className="text-gray-700 text-sm">
                        <span className="font-medium">{isEvent ? 'Attendees' : 'Guests'}:</span> {booking.guests || booking.numberOfGuests || 1}
                    </div>

                    {booking.table && (
                        <div className="text-gray-700 text-sm">
                            <span className="font-medium">Table:</span> {booking.table}
                        </div>
                    )}

                    {booking.totalAmount && (
                        <div className="text-gray-700 text-sm">
                            <span className="font-medium">Total:</span> ₹{booking.totalAmount}
                        </div>
                    )}

                    <div className="text-gray-700 text-sm mt-1">
                        <span className="font-medium">Status:</span>
                        <span className={`ml-1 uppercase ${getStatusColor(booking.status)}`}>{booking.status}</span>
                    </div>

                    {/* Detailed Selections */}
                    {(booking.selectedTickets?.length > 0 || booking.selectedAddOns?.length > 0) && (
                        <div className="mt-2 text-sm">
                            {booking.selectedTickets?.length > 0 && (
                                <div className="text-gray-700 text-sm mt-1">
                                    <span className="font-medium">Tickets:</span>
                                    <ul className="list-disc list-inside ml-2 text-xs">
                                        {booking.selectedTickets.map((t: any) => (
                                            <li key={t.ticketId || t._id}>{t.quantity}x {t.name}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {booking.selectedAddOns?.length > 0 && (
                                <div className="text-gray-700 text-sm mt-1">
                                    <span className="font-medium">Add-ons:</span>
                                    <ul className="list-disc list-inside ml-2 text-xs">
                                        {booking.selectedAddOns.map((t: any) => (
                                            <li key={t.addOnId || t._id}>{t.quantity}x {t.name}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pre-order Status */}
                    {preOrder && (
                        <div className="mt-2 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-indigo-900 flex items-center gap-1">
                                    <ShoppingBag size={14} /> Pre-order
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${preOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        preOrder.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                            preOrder.status === 'preparing' ? 'bg-orange-100 text-orange-800' :
                                                preOrder.status === 'ready' ? 'bg-green-100 text-green-800' :
                                                    preOrder.status === 'served' ? 'bg-gray-100 text-gray-800' :
                                                        'bg-red-100 text-red-800'
                                    }`}>
                                    {preOrder.status}
                                </span>
                            </div>
                            <div className="text-xs text-indigo-700 mt-1">
                                {preOrder.items.length} items • ₹{preOrder.total}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side: Actions */}
                <div className="flex flex-col gap-2">
                    {/* Wallet Actions */}
                    <div className="flex gap-2">
                        {onAddToAppleWallet && (
                            <button
                                onClick={() => onAddToAppleWallet(booking)}
                                className="flex items-center gap-1 px-3 py-1 bg-black text-white rounded text-sm hover:bg-gray-800 transition-colors"
                                title="Add to Apple Wallet"
                            >
                                <Apple className="w-3 h-3" />
                                Apple
                            </button>
                        )}
                        {onAddToGoogleWallet && (
                            <button
                                onClick={() => onAddToGoogleWallet(booking)}
                                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                                title="Add to Google Wallet"
                            >
                                <Chrome className="w-3 h-3" />
                                Google
                            </button>
                        )}
                        {onGenerateInvoice && (
                            <button
                                onClick={() => onGenerateInvoice(booking)}
                                className="flex items-center gap-1 px-3 py-1 bg-emerald-500 text-white rounded text-sm hover:bg-emerald-600 transition-colors"
                                title="Generate Invoice"
                            >
                                <FileText className="w-3 h-3" />
                                Invoice
                            </button>
                        )}
                    </div>

                    {/* Booking Actions */}
                    <div className="flex gap-2">
                        {booking.status === 'pending' && (
                            <>
                                {onConfirm && (
                                    <button
                                        className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={() => onConfirm(booking._id || booking.id)}
                                        disabled={confirmingId === (booking._id || booking.id) || cancellingId === (booking._id || booking.id)}
                                    >
                                        {confirmingId === (booking._id || booking.id) ? 'Confirming...' : 'Confirm'}
                                    </button>
                                )}
                                <button
                                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={handleCancel}
                                    disabled={cancellingId === (booking._id || booking.id) || confirmingId === (booking._id || booking.id) || localIsCancelling}
                                >
                                    {cancellingId === (booking._id || booking.id) || localIsCancelling ? 'Cancelling...' : 'Cancel'}
                                </button>
                            </>
                        )}

                        {booking.status === 'confirmed' && canCancel && (
                            <button
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleCancel}
                                disabled={cancellingId === (booking._id || booking.id) || localIsCancelling}
                            >
                                {cancellingId === (booking._id || booking.id) || localIsCancelling ? 'Cancelling...' : 'Cancel'}
                            </button>
                        )}

                        {/* Rate & Review Button for completed bookings */}
                        {booking.status === 'confirmed' && isVisitCompleted && (
                            <button
                                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 shadow-sm transition-all font-semibold flex items-center gap-2"
                                onClick={() => onReview(booking)}
                            >
                                <Star size={16} className="fill-current" />
                                Rate & Review
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingCard;
