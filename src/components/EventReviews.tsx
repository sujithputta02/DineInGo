import React, { useState, useEffect } from 'react';
import { Star, Send, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

interface Review {
  _id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number;
  comment: string;
  reply?: {
    text: string;
    repliedAt: Date;
  };
  images: string[];
  createdAt: Date;
}

interface EventReviewsProps {
  eventId: string;
  hasAttended?: boolean; // Whether user has attended the event
}

const EventReviews: React.FC<EventReviewsProps> = ({ eventId, hasAttended = false }) => {
  const auth = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [eventId]);

  const fetchReviews = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${eventId}/reviews`);
      const data = await response.json();
      setReviews(data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${eventId}/reviews/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubmitReview = async () => {
    if (!auth.currentUser) {
      toast.error('Please login to submit a review');
      return;
    }

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    if (!comment.trim()) {
      toast.error('Please write a comment');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${eventId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: auth.currentUser.uid,
          userName: auth.currentUser.displayName || 'Anonymous',
          userPhoto: auth.currentUser.photoURL,
          rating,
          comment
        })
      });

      if (response.ok) {
        toast.success('Review submitted successfully!');
        setRating(0);
        setComment('');
        setShowReviewForm(false);
        fetchReviews();
        fetchStats();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (count: number, interactive: boolean = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={interactive ? 24 : 16}
            className={`${
              star <= (interactive ? (hoverRating || rating) : count)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer transition-colors' : ''}`}
            onClick={() => interactive && setRating(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-xl font-bold mb-4">Event Reviews</h3>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-emerald-600">{stats.averageRating.toFixed(1)}</div>
            <div className="flex justify-center mt-2">{renderStars(Math.round(stats.averageRating))}</div>
            <div className="text-sm text-gray-500 mt-1">{stats.totalReviews} reviews</div>
          </div>
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center gap-2">
                <span className="text-sm w-8">{star} ★</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400"
                    style={{
                      width: `${stats.totalReviews > 0 ? (stats.ratingDistribution[star] / stats.totalReviews) * 100 : 0}%`
                    }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-8">{stats.ratingDistribution[star]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Write Review Button */}
      {hasAttended && auth.currentUser && !showReviewForm && (
        <button
          onClick={() => setShowReviewForm(true)}
          className="w-full py-3 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors"
        >
          Write a Review
        </button>
      )}

      {/* Review Form */}
      {showReviewForm && (
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h4 className="font-semibold mb-4">Write Your Review</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Rating</label>
              {renderStars(rating, true)}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Your Review</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[100px]"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSubmitReview}
                disabled={submitting}
                className="flex-1 py-2 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Submit Review
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowReviewForm(false);
                  setRating(0);
                  setComment('');
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No reviews yet. Be the first to review this event!
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review._id} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                  {review.userPhoto ? (
                    <img src={review.userPhoto} alt={review.userName} className="w-12 h-12 rounded-full" />
                  ) : (
                    review.userName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold">{review.userName}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    {renderStars(review.rating)}
                  </div>
                  <p className="text-gray-700">{review.comment}</p>
                  
                  {/* Owner Reply */}
                  {review.reply && (
                    <div className="mt-4 pl-4 border-l-2 border-emerald-500 bg-emerald-50 p-4 rounded">
                      <div className="font-semibold text-sm text-emerald-700 mb-1">Response from organizer</div>
                      <p className="text-gray-700 text-sm">{review.reply.text}</p>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(review.reply.repliedAt).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EventReviews;
