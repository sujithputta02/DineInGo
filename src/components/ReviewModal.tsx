import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Camera, Loader, CheckCircle } from 'lucide-react';
import { businessApi } from '../services/api';
import { toast } from 'react-toastify';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: any;
    onReviewSubmitted: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ isOpen, onClose, booking, onReviewSubmitted }) => {
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const businessName = booking.restaurantName || booking.eventName || booking.restaurantId?.name || booking.eventId?.title || 'the business';
    const businessId = booking.restaurantId?._id || booking.restaurantId || booking.eventId?._id || booking.eventId;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            toast.error('Please select a rating');
            return;
        }

        setIsSubmitting(true);
        try {
            // Get user from session storage
            const userStr = sessionStorage.getItem('userData');
            const user = userStr ? JSON.parse(userStr) : null;

            if (!user || !user.uid) {
                toast.error('You must be logged in to submit a review');
                setIsSubmitting(false); // Stop loading state
                return;
            }

            await businessApi.addReview({
                businessId,
                bookingId: booking._id,
                rating,
                comment,
                userId: user.uid,
                userName: user.displayName || user.name || booking.userName || 'Customer',
                userPhoto: user.photoURL || user.photoUrl || '',
                status: 'published'
            });

            setIsSuccess(true);
            setTimeout(() => {
                onReviewSubmitted();
                onClose();
                // Reset state for next time
                setRating(0);
                setComment('');
                setIsSuccess(false);
            }, 2000);
        } catch (error: any) {
            console.error('Failed to submit review:', error);
            toast.error(error.message || 'Failed to submit review');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
                <div className="relative p-6 border-b border-slate-100">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <h2 className="text-xl font-bold text-slate-900">Rate Your Experience</h2>
                    <p className="text-slate-600">How was your visit to {businessName}?</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {isSuccess ? (
                        <div className="py-12 text-center space-y-4">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 10 }}
                                className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto"
                            >
                                <CheckCircle size={48} />
                            </motion.div>
                            <h3 className="text-2xl font-bold text-slate-900">Thank You!</h3>
                            <p className="text-slate-600">Your feedback helps others discover great places.</p>
                        </div>
                    ) : (
                        <>
                            {/* Star Rating */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onMouseEnter={() => setHoveredRating(star)}
                                            onMouseLeave={() => setHoveredRating(0)}
                                            onClick={() => setRating(star)}
                                            className="p-1 transition-transform active:scale-90"
                                        >
                                            <Star
                                                size={40}
                                                className={`${(hoveredRating || rating) >= star
                                                    ? 'text-yellow-400 fill-current'
                                                    : 'text-slate-200'
                                                    } transition-colors duration-200`}
                                            />
                                        </button>
                                    ))}
                                </div>
                                <span className="text-sm font-medium text-slate-600">
                                    {rating === 1 && 'Poor'}
                                    {rating === 2 && 'Fair'}
                                    {rating === 3 && 'Good'}
                                    {rating === 4 && 'Very Good'}
                                    {rating === 5 && 'Excellent'}
                                    {rating === 0 && 'Select a rating'}
                                </span>
                            </div>

                            {/* Comment */}
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Tell us more (optional)</label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="What did you like? How was the service?"
                                    className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
                                />
                            </div>

                            {/* Photo Upload (Placeholder for now) */}
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400">
                                    <Camera size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700">Add Photos</p>
                                    <p className="text-xs text-slate-500">Show off your experience!</p>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmitting || rating === 0}
                                className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:transform active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader className="animate-spin" size={20} />
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit Review'
                                )}
                            </button>
                        </>
                    )}
                </form>
            </motion.div>
        </div>
    );
};

export default ReviewModal;
