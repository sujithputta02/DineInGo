import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Heart, Clock, Phone, Globe, ArrowLeft, Calendar, Users, Plus, Minus, ChevronLeft, ShoppingCart, Star, StarHalf, Tag, Percent, MessageSquare, Send } from 'lucide-react';
import { toast } from 'react-toastify';
import { getRestaurantById, getMockTotalGuests } from '../services/restaurantService';
import { getMockEventById, getMockEventCapacity } from '../services/event-service';
import { businessApi, bookingsApi, userAPI } from '../services/api';
import { Restaurant, Event, MenuItem } from '../types';
import RestaurantMap from '../components/RestaurantMap';
import StarRating from '../components/StarRating';
import { DinoStepper } from '../components/DinoStepper';
import EmojiPicker from '../components/EmojiPicker';

const RestaurantDetails = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type') || 'restaurant';
  const navigate = useNavigate();
  const [selectedGuests, setSelectedGuests] = useState(2);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // New review form state
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Helper to identify mock restaurants (Standard ObjectIDs are 24 chars)
  const isMockId = id ? id.length < 24 : true;

  // Calculate real-time aggregate rating - only for business restaurants
  // For mock restaurants, we'll fall back to restaurant.rating
  const averageRating = reviews && Array.isArray(reviews) && reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : (isMockId ? (restaurant?.rating || null) : 0);

  // Dynamic time slots based on restaurant data
  const lunchSlots = restaurant?.timeSlots?.filter((slot: any) => slot.type === 'lunch' || slot.type === 'morning' || slot.type === 'afternoon').map((slot: any) => ({
    time: slot.name,
    startTime: slot.startTime,
    endTime: slot.endTime,
    available: slot.available
  })) || [
      { time: '11:30 AM', available: true, startTime: undefined, endTime: undefined },
      { time: '12:00 PM', available: true, startTime: undefined, endTime: undefined },
      { time: '12:30 PM', available: true, startTime: undefined, endTime: undefined },
      { time: '1:00 PM', available: true, startTime: undefined, endTime: undefined },
      { time: '1:30 PM', available: true, startTime: undefined, endTime: undefined },
      { time: '2:00 PM', available: true, startTime: undefined, endTime: undefined },
    ];

  const dinnerSlots = restaurant?.timeSlots?.filter((slot: any) => slot.type === 'dinner' || slot.type === 'evening' || slot.type === 'night').map((slot: any) => ({
    time: slot.name,
    startTime: slot.startTime,
    endTime: slot.endTime,
    available: slot.available
  })) || [
      { time: '6:00 PM', available: true, startTime: undefined, endTime: undefined },
      { time: '6:30 PM', available: true, startTime: undefined, endTime: undefined },
      { time: '7:00 PM', available: true, startTime: undefined, endTime: undefined },
      { time: '7:30 PM', available: true, startTime: undefined, endTime: undefined },
      { time: '8:00 PM', available: true, startTime: undefined, endTime: undefined },
      { time: '8:30 PM', available: true, startTime: undefined, endTime: undefined },
      { time: '9:00 PM', available: true, startTime: undefined, endTime: undefined },
      { time: '9:30 PM', available: true, startTime: undefined, endTime: undefined },
    ];

  // Helper: get all slot times
  const allSlotTimes = [
    ...lunchSlots.map(s => s.time),
    ...dinnerSlots.map(s => s.time)
  ];

  // Fetch blocked dates for the next 30 days
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const fetchBlockedDates = async () => {
      if (!id) return;
      const today = new Date();
      const datesToCheck: string[] = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        datesToCheck.push(d.toISOString().split('T')[0]);
      }
      const blocked: string[] = [];
      await Promise.all(datesToCheck.map(async (date) => {
        try {
          const slots = await bookingsApi.getTrackedSlots(id, date);
          const reserved = slots.filter((s: any) => s.action === 'reserve').map((s: any) => s.time);
          // If all slots are reserved, block the date
          if (allSlotTimes.every(t => reserved.includes(t))) {
            blocked.push(date);
          }
        } catch { }
      }));
      setBlockedDates(blocked);
    };
    fetchBlockedDates();
    interval = setInterval(fetchBlockedDates, 10000);
    return () => clearInterval(interval);
  }, [id]);

  // Fetch blocked slots for the selected date and restaurant
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const fetchBlocked = async () => {
      if (id && selectedDate) {
        try {
          const slots = await bookingsApi.getTrackedSlots(id, selectedDate);
          // Only consider slots with action 'reserve'
          setBlockedSlots(slots.filter((s: any) => s.action === 'reserve').map((s: any) => s.time));
        } catch (err) {
          setBlockedSlots([]);
        }
      }
    };
    fetchBlocked();
    // Poll every 10 seconds for real-time updates
    interval = setInterval(fetchBlocked, 10000);
    return () => clearInterval(interval);
  }, [id, selectedDate]);

  // Helper: is slot in the past (for today)?
  const isPastSlot = (slot: any) => {
    const today = new Date().toISOString().split('T')[0];
    if (selectedDate !== today) return false;

    const now = new Date();
    let slotDate = new Date();

    // If we have an explicit end time, use that to determine if the slot is "past"
    // e.g. "Morning" ends at 12:00. If now is 12:01, it's past.
    // If we only have start time/slot time name (e.g. "7:00 PM"), we use that.

    const timeStrToParse = slot.endTime || slot.time;

    // Check if time string exists
    if (!timeStrToParse) return false;

    // Handle "Morning", "Afternoon", etc. without explicit times (fallback)
    // Though usually specific slots should have times.
    if (timeStrToParse === 'Morning') return now.getHours() >= 12;
    if (timeStrToParse === 'Afternoon') return now.getHours() >= 17;
    if (timeStrToParse === 'Evening') return now.getHours() >= 21;
    if (timeStrToParse === 'Night') return now.getHours() >= 23;

    // Parse time string (supports "14:00", "2:00 PM", "2:00")
    // Remove spaces and convert to uppercase for consistency
    const cleanTime = timeStrToParse.trim().toUpperCase();

    const is12Hour = cleanTime.includes('AM') || cleanTime.includes('PM');

    let hours, minutes;

    if (is12Hour) {
      const [timePart, modifier] = cleanTime.split(' ');
      const [h, m] = timePart.split(':').map(Number);
      hours = h;
      minutes = m || 0;
      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
    } else {
      // Assume 24h format if no AM/PM
      const [h, m] = cleanTime.split(':').map(Number);
      hours = h;
      minutes = m || 0;
    }

    // Validate parsing
    if (isNaN(hours) || isNaN(minutes)) return false;

    slotDate.setHours(hours, minutes, 0, 0);

    // For ranges (Morning 8-12), if we are checking endTime (12:00), 
    // we want to disable if now > 12:00.
    // So slotDate (12:00) < now.
    return slotDate < now;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (id) {
          if (type === 'restaurant') {
            const restaurantData = await getRestaurantById(id);
            await getMockTotalGuests(); // We still call this to simulate the API call
            setRestaurant(restaurantData);
            setEvent(null);

            // Only fetch real reviews and promotions if it's not a mock restaurant
            if (!isMockId) {
              try {
                setReviewsLoading(true);
                const [reviewsData, promosData] = await Promise.all([
                  businessApi.getReviews(id),
                  businessApi.getPromotions(id)
                ]);
                setReviews(Array.isArray(reviewsData) ? reviewsData : []);
                setPromotions(Array.isArray(promosData) ? promosData.filter((p: any) => p.status === 'active' || p.isActive) : []);
              } catch (err) {
                console.error('Failed to fetch storefront data:', err);
                setReviews([]);
                setPromotions([]);
              } finally {
                setReviewsLoading(false);
              }
            } else {
              setReviews([]);
              setPromotions([]);
              setReviewsLoading(false);
            }
          } else if (type === 'event') {
            const eventData = await getMockEventById(id);
            await getMockEventCapacity(); // We still call this to simulate the API call
            setEvent(eventData);
            setRestaurant(null);
          }
        }
      } catch (err) {
        setError('Failed to fetch data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, type]);

  const handleTimeSlotClick = (time: string) => {
    if (type === 'restaurant') {
      const queryParams = new URLSearchParams();
      queryParams.set('date', selectedDate);
      queryParams.set('time', time);
      queryParams.set('guests', selectedGuests.toString());
      navigate(`/restaurant/${id}/menu?${queryParams.toString()}`);
    } else {
      navigate(`/event/${id}/register`);
    }
  };

  const handleEventRegistration = () => {
    navigate(`/event/${id}/register`);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (newRating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      // Get user from session storage
      const userStr = sessionStorage.getItem('userData');
      const user = userStr ? JSON.parse(userStr) : null;

      if (!user || !user.uid) {
        toast.error('You must be logged in to submit a review');
        return;
      }

      setIsSubmittingReview(true);
      await businessApi.addReview({
        businessId: id,
        userId: user.uid,
        userName: user.displayName || user.name || 'Anonymous User',
        userPhoto: user.photoURL || user.photoUrl, // Handle both casing consistent with LoginPage.tsx
        rating: newRating,
        comment: newComment,
      });

      // Refresh reviews
      const reviewsData = await businessApi.getReviews(id);
      setReviews(reviewsData);

      // Reset form
      setNewRating(0);
      setNewComment('');
      toast.error('Failed to submit review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Check if restaurant is in favorites
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      const userStr = sessionStorage.getItem('userData');
      if (!userStr) return;

      try {
        const user = JSON.parse(userStr);
        if (user.uid && id) {
          const response = await userAPI.getFavorites(user.uid);
          const favorites = response.favorites || [];
          // Check if current ID exists in favorites array (handling both string IDs and object populations)
          const isFav = favorites.some((f: any) => (typeof f === 'string' ? f : f._id || f.id) === id);
          setIsFavorite(isFav);
        }
      } catch (err) {
        console.error('Error checking favorite status:', err);
      }
    };

    checkFavoriteStatus();
  }, [id]);

  const toggleFavorite = async () => {
    const userStr = sessionStorage.getItem('userData');
    if (!userStr) {
      toast.error('Please login to save favorites');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (!user.uid || !id) return;

      if (isFavorite) {
        await userAPI.removeFavorite(user.uid, id);
        toast.success('Removed from favorites');
      } else {
        await userAPI.addFavorite(user.uid, id);
        toast.success('Added to favorites');
      }
      setIsFavorite(!isFavorite);
    } catch (err) {
      console.error('Error toggling favorite:', err);
      toast.error('Failed to update favorites');
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading details...</p>
        </div>
      </div>
    );
  }

  if (error || (!restaurant && !event)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900">{type === 'restaurant' ? 'Restaurant' : 'Event'} not found</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 inline-flex items-center gap-2 text-emerald-500 hover:text-emerald-600"
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>
    );
  }



  // Render restaurant details
  if (restaurant) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="absolute top-4 left-4 z-30 p-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>

        {/* Hero Section with Restaurant Image */}
        <div className="relative h-[400px]">
          <div className="absolute inset-0 bg-black/40 z-10" />
          <img
            src={restaurant.image}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-8 left-8 z-20 text-white">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-semibold">{restaurant.name}</h1>
            </div>
            <p className="text-lg mb-2">{restaurant.cuisine?.join(', ')}</p>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Clock size={16} />
                <span>{restaurant.openNow ? 'Open Now' : 'Closed'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address || `${restaurant.location.city}, ${restaurant.location.state}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-500 transition-colors"
                >
                  <span>{restaurant.address}</span>
                </a>
              </div>
              <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full">
                {averageRating !== null ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl">
                    <span className="text-emerald-400 text-lg">★</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-white">{averageRating}</span>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-emerald-400">Not yet rated</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-3 gap-8">
          {/* Booking Section */}
          <div className="col-span-2">
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
              <h2 className="text-2xl font-semibold mb-6">Make a Reservation</h2>

              {/* Dino Progress Tracker */}
              <DinoStepper currentStep={0} />

              {/* Guest and Date Selection */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Number of Guests</label>
                  <select
                    value={selectedGuests}
                    onChange={(e) => setSelectedGuests(Number(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                      <option key={num} value={num}>{num} {num === 1 ? 'Guest' : 'Guests'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    min={new Date().toISOString().split('T')[0]}
                    max={(() => { const d = new Date(); d.setDate(d.getDate() + 29); return d.toISOString().split('T')[0]; })()}
                    disabled={false}
                    onInput={e => {
                      // Prevent manual typing of blocked dates
                      const input = e.target as HTMLInputElement;
                      if (blockedDates.includes(input.value)) {
                        input.setCustomValidity('This date is fully booked.');
                      } else {
                        input.setCustomValidity('');
                      }
                    }}
                    style={blockedDates.includes(selectedDate) ? { borderColor: 'red' } : {}}
                    list="blocked-dates"
                  />
                  <datalist id="blocked-dates">
                    {blockedDates.map(date => (
                      <option key={date} value={date} />
                    ))}
                  </datalist>
                  {blockedDates.includes(selectedDate) && (
                    <div className="text-red-500 text-xs mt-1">This date is fully booked. Please select another date.</div>
                  )}
                </div>
              </div>

              {/* Time Slots */}
              {restaurant?.timeSlots && restaurant.timeSlots.length > 0 ? (
                <div className="space-y-6">
                  {lunchSlots.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Lunch</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {lunchSlots.map((slot, index) => (
                          <button
                            key={index}
                            onClick={() => handleTimeSlotClick(slot.time)}
                            className="p-3 text-center border border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-colors flex flex-col items-center justify-center gap-1"
                            disabled={isPastSlot(slot) || blockedSlots.includes(slot.time)}
                            style={isPastSlot(slot) || blockedSlots.includes(slot.time) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                          >
                            <span className="font-medium">{slot.time}</span>
                            {slot.startTime && slot.endTime && (
                              <span className="text-xs text-gray-500">{slot.startTime} - {slot.endTime}</span>
                            )}
                            {blockedSlots.includes(slot.time) && <span className="text-xs text-red-500">Blocked</span>}
                            {isPastSlot(slot) && <span className="text-xs text-gray-400">Past</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {dinnerSlots.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Dinner</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {dinnerSlots.map((slot, index) => (
                          <button
                            key={index}
                            onClick={() => handleTimeSlotClick(slot.time)}
                            className="p-3 text-center border border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-colors flex flex-col items-center justify-center gap-1"
                            disabled={isPastSlot(slot) || blockedSlots.includes(slot.time)}
                            style={isPastSlot(slot) || blockedSlots.includes(slot.time) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                          >
                            <span className="font-medium">{slot.time}</span>
                            {slot.startTime && slot.endTime && (
                              <span className="text-xs text-gray-500">{slot.startTime} - {slot.endTime}</span>
                            )}
                            {blockedSlots.includes(slot.time) && <span className="text-xs text-red-500">Blocked</span>}
                            {isPastSlot(slot) && <span className="text-xs text-gray-400">Past</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Time Slots Not Available</h3>
                    <p className="text-gray-600">The restaurant owner hasn't set up time slots yet. Please contact the restaurant directly to make a reservation.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Promotions Section */}
            {promotions && Array.isArray(promotions) && promotions.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Tag className="text-emerald-500" size={24} />
                  Active Offers & Happy Hours
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {promotions.map((promo: any) => (
                    <div key={promo._id} className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                        <Percent size={24} />
                      </div>
                      <div>
                        <div className="font-bold text-emerald-900">{promo.title}</div>
                        <p className="text-sm text-emerald-700 mb-2">{promo.description}</p>
                        <div className="inline-block bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded">
                          CODE: {promo.code}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold flex items-center gap-2">
                  <MessageSquare className="text-emerald-500" size={24} />
                  Customer Reviews
                </h2>
                <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl">
                  {averageRating ? (
                    <>
                      <StarRating rating={averageRating} size={20} />
                      <span className="text-xl font-bold text-emerald-900">{averageRating}</span>
                    </>
                  ) : null}
                  <span className="text-emerald-600 text-sm">({reviews?.length || 0} reviews)</span>
                </div>
              </div>

              {/* Review Submission Form */}
              <div className="mb-10 bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Send className="text-emerald-500" size={18} />
                  Share Your Experience
                </h3>
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-700 mr-2">Your Rating:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <div key={star} className="relative inline-block">
                        {/* Left half of star (0.5 rating) */}
                        <button
                          type="button"
                          onClick={() => setNewRating(star - 0.5)}
                          onMouseEnter={() => setHoverRating(star - 0.5)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="absolute left-0 top-0 w-1/2 h-full z-10"
                          style={{ cursor: 'pointer' }}
                        />
                        {/* Right half of star (full rating) */}
                        <button
                          type="button"
                          onClick={() => setNewRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="absolute right-0 top-0 w-1/2 h-full z-10"
                          style={{ cursor: 'pointer' }}
                        />
                        {/* Star display */}
                        <div className="relative pointer-events-none">
                          {(hoverRating || newRating) >= star ? (
                            <Star size={28} className="text-yellow-400 fill-yellow-400" />
                          ) : (hoverRating || newRating) >= star - 0.5 ? (
                            <div className="relative">
                              <Star size={28} className="text-gray-300" />
                              <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                                <Star size={28} className="text-yellow-400 fill-yellow-400" />
                              </div>
                            </div>
                          ) : (
                            <Star size={28} className="text-gray-300" />
                          )}
                        </div>
                      </div>
                    ))}
                    <span className="ml-2 text-sm font-semibold text-gray-600">
                      {newRating > 0 ? newRating.toFixed(1) : '0.0'}
                    </span>
                  </div>
                  <div className="relative">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Tell us about your visit, the food, and the service..."
                      className="w-full p-4 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[100px] text-sm"
                    />
                    <div className="absolute bottom-2 right-2">
                      <EmojiPicker 
                        onEmojiSelect={(emoji) => setNewComment(prev => prev + emoji)}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl hover:bg-emerald-600 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSubmittingReview ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : null}
                    Submit Review
                  </button>
                </form>
              </div>

              {reviewsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
              ) : (!reviews || !Array.isArray(reviews) || reviews.length === 0) ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <p className="text-gray-500">No reviews yet. Be the first to visit!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review._id} className="border-b border-gray-100 last:border-0 pb-6 last:pb-0">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                            {review.userName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{review.userName || 'Anonymous'}</div>
                            <div className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <StarRating rating={review.rating} size={14} />
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                      {review.reply && (
                        <div className="mt-4 bg-gray-50 rounded-xl p-4 border-l-4 border-emerald-500">
                          <div className="text-xs font-bold text-emerald-700 mb-1">Owner Response</div>
                          <p className="text-gray-600 text-sm">
                            {typeof review.reply === 'object' ? review.reply.text : review.reply}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Restaurant Info Section */}
          <div className="col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-8">
              <h2 className="text-2xl font-semibold mb-6">About {restaurant.name}</h2>
              <p className="text-gray-600 mb-6">
                {restaurant.name} is located in {restaurant.location.city}, offering {restaurant.cuisine?.join(', ')} cuisine.
                {restaurant.openNow ? " We're currently open and ready to serve you!" : " We're currently closed."}
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <MapPin className="text-emerald-500" size={20} />
                  <span className="text-gray-600">{restaurant.address}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="text-emerald-500" size={20} />
                  <span className="text-gray-600">{restaurant.phoneNumber}</span>
                </div>
              </div>

              {/* Add the map component */}
              <div className="mt-6">
                <RestaurantMap
                  address={restaurant.address || `${restaurant.location.city}, ${restaurant.location.state}`}
                  name={restaurant.name}
                />
              </div>

              <div className="mt-8">
                <button
                  onClick={toggleFavorite}
                  className={`w-full flex items-center justify-center gap-2 p-3 border-2 rounded-xl transition-colors ${isFavorite
                    ? 'bg-red-50 border-red-500 text-red-500'
                    : 'border-emerald-500 text-emerald-500 hover:bg-emerald-50'
                    }`}
                >
                  <Heart fill={isFavorite ? "currentColor" : "none"} />
                  <span>{isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render event details
  if (event) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 z-30 p-2 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>

        {/* Hero Section with Event Image */}
        <div className="relative h-[400px]">
          <div className="absolute inset-0 bg-black/40 z-10" />
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-8 left-8 z-20 text-white">
            <h1 className="text-5xl font-bold mb-4">{event.title}</h1>
            <p className="text-lg mb-2">{event.category}</p>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span>{event.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} />
                <span>{event.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <span>{event.location}</span>
              </div>
              <div className="flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full">
                <span className="text-emerald-400">₹</span>
                <span>{event.price}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-3 gap-8">
          {/* Registration Section */}
          <div className="col-span-2">
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
              <h2 className="text-2xl font-semibold mb-6">Register for Event</h2>

              <div className="mb-8">
                <p className="text-gray-600 mb-4">
                  {event.description}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Users size={16} />
                    <span>{event.registeredCount}/{event.capacity} Registered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe size={16} />
                    <span>Organized by {event.organizer}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleEventRegistration}
                className="w-full py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors"
              >
                Register Now
              </button>
            </div>
          </div>

          {/* Event Info Section */}
          <div className="col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-8">
              <h2 className="text-2xl font-semibold mb-6">Event Details</h2>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="text-emerald-500" size={20} />
                  <span className="text-gray-600">{event.date}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="text-emerald-500" size={20} />
                  <span className="text-gray-600">{event.time}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="text-emerald-500" size={20} />
                  <span className="text-gray-600">{event.location}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="text-emerald-500" size={20} />
                  <span className="text-gray-600">{event.registeredCount}/{event.capacity} Registered</span>
                </div>
                <div className="flex items-center gap-3">
                  <Globe className="text-emerald-500" size={20} />
                  <span className="text-gray-600">Organized by {event.organizer}</span>
                </div>
              </div>

              {/* Event doesn't strictly have a favorite toggle in this context for MVP, but kept for consistency if needed, 
                  though `isFavorite` logic is tied to restaurant ID. If event has ID, it might work if backend supports it. 
                  Suppressed for now or can rely on restaurant favorites. */}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default RestaurantDetails; 