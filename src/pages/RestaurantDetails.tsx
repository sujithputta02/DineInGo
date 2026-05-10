import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Heart, Clock, Phone, Globe, ArrowLeft, Calendar, Users, Plus, Minus, ChevronLeft, ChevronRight, ShoppingCart, Star, StarHalf, Tag, Percent, MessageSquare, Send, Eye, Camera, Image as ImageIcon, X, Trash2, Edit2, Maximize2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { getRestaurantById, getMockTotalGuests } from '../services/restaurantService';
import { getMockEventById, getMockEventCapacity } from '../services/event-service';
import { businessApi, bookingsApi, userAPI, normalizeImageUrl } from '../services/api';
import { favoritesApi } from '../services/favoritesApi';
import { Restaurant, Event, MenuItem } from '../types';
import RestaurantMap from '../components/RestaurantMap';
import StarRating from '../components/StarRating';
import { DinoStepper } from '../components/DinoStepper';
import EmojiPicker from '../components/EmojiPicker';
import { isRestaurantOpen } from '../utils/openStatus';
import { trackEvent } from '../utils/analytics';



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
  const [theme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'system';
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Sync theme with system preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        setIsDarkMode(mediaQuery.matches);
        document.documentElement.setAttribute('data-theme', mediaQuery.matches ? 'dark' : 'light');
      }
    };
    
    // Initial sync
    if (theme === 'system') {
      document.documentElement.setAttribute('data-theme', mediaQuery.matches ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // New review form state
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [activeLightbox, setActiveLightbox] = useState<{ 
    images: string[], 
    index: number,
    comment?: string,
    userName?: string
  } | null>(null);

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
      
      trackEvent('select_time_slot', { 
        id, 
        type: 'restaurant', 
        time, 
        date: selectedDate, 
        guests: selectedGuests 
      });

      navigate(`/restaurant/${id}/menu?${queryParams.toString()}`);
    } else {
      navigate(`/event/${id}/register`);
    }
  };

  const handleEventRegistration = () => {
    navigate(`/event/${id}/register`);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newImages = [...selectedImages, ...files].slice(0, 5); // Limit to 5 images
      setSelectedImages(newImages);

      const newPreviews = newImages.map(file => URL.createObjectURL(file));
      setImagePreviews(newPreviews);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...selectedImages];
    newImages.splice(index, 1);
    setSelectedImages(newImages);

    const newPreviews = [...imagePreviews];
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
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
      const userStr = localStorage.getItem('userData');
      const user = userStr ? JSON.parse(userStr) : null;

      if (!user || !user.uid) {
        toast.error('You must be logged in to submit a review');
        return;
      }

      setIsSubmittingReview(true);

      const formData = new FormData();
      formData.append('userId', user.uid);
      formData.append('userName', user.displayName || user.name || 'Anonymous User');
      formData.append('userPhoto', user.photoURL || user.photoUrl || '');
      formData.append('rating', newRating.toString());
      formData.append('comment', newComment);
      
      selectedImages.forEach(image => {
        formData.append('images', image);
      });

      if (editingReviewId) {
        // Update existing review
        // In this case, we also need to send the existing images that were kept
        const existingImages = reviews.find(r => r._id === editingReviewId)?.images || [];
        // For simplicity, if we are editing, we might want to handle existing vs new images
        // For now, let's just append existing images as JSON if they weren't deleted
        // (This part needs backend support for 'existingImages' field or similar)
        formData.append('existingImages', JSON.stringify(imagePreviews.filter(p => p.startsWith('http'))));
        await businessApi.updateReview(editingReviewId, formData);
        toast.success('Review updated successfully!');
      } else {
        // Add new review
        await businessApi.addReview(id, formData);
        toast.success('Review submitted successfully!');
      }

      // Refresh reviews
      const reviewsData = await businessApi.getReviews(id);
      setReviews(reviewsData);

      // Reset form
      setNewRating(0);
      setNewComment('');
      setSelectedImages([]);
      setImagePreviews([]);
      setEditingReviewId(null);
    } catch (error: any) {
      console.error('Review error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleEditReview = (review: any) => {
    setEditingReviewId(review._id);
    setNewRating(review.rating);
    setNewComment(review.comment);
    setImagePreviews(review.images || []);
    // Note: selectedImages will stay empty until new files are picked
    // Scroll to form
    document.getElementById('review-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;

    try {
      await businessApi.deleteReview(reviewId);
      setReviews(reviews.filter(r => r._id !== reviewId));
      toast.success('Review deleted');
    } catch (err) {
      toast.error('Failed to delete review');
    }
  };

  // Check if restaurant is in favorites
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      const userStr = localStorage.getItem('userData');
      if (!userStr) return;

      try {
        const user = JSON.parse(userStr);
        if (user.uid && id) {
          // Use statically imported favoritesApi

          const response = await favoritesApi.get(user.uid);
          const restFavs = response.restaurantIds || [];
          const isFav = restFavs.includes(id);
          setIsFavorite(isFav);
        }
      } catch (err) {
        console.error('Error checking favorite status:', err);
      }
    };

    checkFavoriteStatus();
  }, [id]);

  const toggleFavorite = async () => {
    const userStr = localStorage.getItem('userData');
    if (!userStr) {
      toast.error('Please login to save favorites');
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (!user.uid || !id) return;

      // Use statically imported favoritesApi

      if (isFavorite) {
        await favoritesApi.removeRestaurant(user.uid, id);
        toast.success('Removed from favorites');
      } else {
        await favoritesApi.addRestaurant(user.uid, id);
        toast.success('Added to favorites');
      }
      
      trackEvent('toggle_favorite', { 
        id, 
        type, 
        status: !isFavorite 
      });

      setIsFavorite(!isFavorite);
    } catch (err) {
      console.error('Error toggling favorite:', err);
      toast.error('Failed to update favorites');
    }
  };


  if (loading) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading details...</p>
        </div>
      </div>
    );
  }

  if (error || (!restaurant && !event)) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <h2 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{type === 'restaurant' ? 'Restaurant' : 'Event'} not found</h2>
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
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className={`absolute top-3 md:top-4 left-3 md:left-4 z-30 p-2 rounded-full shadow-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
            isDarkMode ? 'bg-gray-800/90 hover:bg-gray-800 text-white' : 'bg-white/90 hover:bg-white text-gray-700'
          }`}
        >
          <ArrowLeft size={20} />
        </button>

        {/* Hero Section with Restaurant Image */}
        <div className="relative h-[250px] md:h-[350px] lg:h-[400px]">
          <div className="absolute inset-0 bg-black/40 z-10" />
          <img
            src={normalizeImageUrl(restaurant.image)}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 md:bottom-6 lg:bottom-8 left-4 md:left-6 lg:left-8 z-20 text-white">
            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={() => navigate(-1)}
                className={`p-2 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center ${
                  isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                }`}
              >
                <ChevronLeft className="w-5 md:w-6 h-5 md:h-6" />
              </button>
              <h1 className="text-base md:text-xl lg:text-2xl font-black tracking-tight">{restaurant.name}</h1>
            </div>
            <p className="text-sm md:text-base lg:text-lg mb-2 mt-1 md:mt-2 font-medium opacity-90">{restaurant.cuisine?.join(', ')}</p>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 lg:gap-6 text-xs md:text-sm">
              <div className="flex items-center gap-2">
                <Clock size={14} className="md:w-4 md:h-4 text-emerald-400" />
                <span className="font-semibold">{restaurant && isRestaurantOpen(restaurant) ? 'Open Now' : 'Closed'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="md:w-4 md:h-4 text-emerald-400" />
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address || `${restaurant.location.city}, ${restaurant.location.state}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 transition-colors line-clamp-1 font-semibold"
                >
                  <span>{restaurant.address}</span>
                </a>
              </div>
              <div className={`flex items-center gap-2 px-2 md:px-3 py-1 rounded-full backdrop-blur-md ${
                isDarkMode ? 'bg-white/10' : 'bg-black/30'
              }`}>
                {averageRating !== null ? (
                  <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-xl">
                    <span className="text-yellow-400 font-bold">★</span>
                    <span className="font-black text-white">{averageRating}</span>
                  </div>
                ) : (
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Not yet rated</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-3 md:px-4 py-6 md:py-8 grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Booking Section */}
          <div className="lg:col-span-2">
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-3xl p-6 sm:p-8 shadow-xl border mb-8 transition-all`}>
              <h2 className={`text-2xl font-black mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'} tracking-tight`}>Make a Reservation</h2>

              {/* Dino Progress Tracker */}
              <DinoStepper currentStep={0} />

              {/* Guest and Date Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 mt-8">
                <div>
                  <label className={`block text-xs font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Number of Guests</label>
                  <select
                    value={selectedGuests}
                    onChange={(e) => setSelectedGuests(Number(e.target.value))}
                    className={`w-full p-4 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-bold ${
                      isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    } border-2`}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                      <option key={num} value={num}>{num} {num === 1 ? 'Guest' : 'Guests'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={`block text-xs font-black uppercase tracking-widest mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Select Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className={`w-full p-4 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-bold ${
                      isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                    } border-2`}
                    min={new Date().toISOString().split('T')[0]}
                    max={(() => { const d = new Date(); d.setDate(d.getDate() + 29); return d.toISOString().split('T')[0]; })()}
                    style={blockedDates.includes(selectedDate) ? { borderColor: 'red' } : {}}
                    list="blocked-dates"
                  />
                  <datalist id="blocked-dates">
                    {blockedDates.map(date => (
                      <option key={date} value={date} />
                    ))}
                  </datalist>
                  {blockedDates.includes(selectedDate) && (
                    <div className="text-red-500 text-[10px] font-bold uppercase mt-2 tracking-wider">This date is fully booked.</div>
                  )}
                </div>
              </div>

              {/* Time Slots */}
              {restaurant?.timeSlots && restaurant.timeSlots.length > 0 ? (
                <div className="space-y-8 mt-8">
                  {lunchSlots.length > 0 && (
                    <div>
                      <h3 className={`text-sm font-black uppercase tracking-[0.2em] mb-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Lunch Expedition</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {lunchSlots.map((slot, index) => (
                          <button
                            key={index}
                            onClick={() => handleTimeSlotClick(slot.time)}
                            className={`p-4 text-center rounded-2xl transition-all duration-300 flex flex-col items-center justify-center gap-1 border-2 ${
                              isDarkMode 
                                ? 'bg-gray-700/50 border-gray-600 text-white hover:border-emerald-500 hover:bg-emerald-500/10' 
                                : 'bg-white border-gray-100 text-gray-900 hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-lg'
                            }`}
                            disabled={isPastSlot(slot) || blockedSlots.includes(slot.time)}
                            style={isPastSlot(slot) || blockedSlots.includes(slot.time) ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
                          >
                            <span className="font-black text-lg">{slot.time}</span>
                            {slot.startTime && slot.endTime && (
                              <span className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{slot.startTime} - {slot.endTime}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {dinnerSlots.length > 0 && (
                    <div>
                      <h3 className={`text-sm font-black uppercase tracking-[0.2em] mb-4 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>Dinner Hunt</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {dinnerSlots.map((slot, index) => (
                          <button
                            key={index}
                            onClick={() => handleTimeSlotClick(slot.time)}
                            className={`p-4 text-center rounded-2xl transition-all duration-300 flex flex-col items-center justify-center gap-1 border-2 ${
                              isDarkMode 
                                ? 'bg-gray-700/50 border-gray-600 text-white hover:border-purple-500 hover:bg-purple-500/10' 
                                : 'bg-white border-gray-100 text-gray-900 hover:border-purple-500 hover:bg-purple-50 hover:shadow-lg'
                            }`}
                            disabled={isPastSlot(slot) || blockedSlots.includes(slot.time)}
                            style={isPastSlot(slot) || blockedSlots.includes(slot.time) ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
                          >
                            <span className="font-black text-lg">{slot.time}</span>
                            {slot.startTime && slot.endTime && (
                              <span className={`text-[10px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{slot.startTime} - {slot.endTime}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className={`${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'} rounded-3xl p-8 border-2 border-dashed ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                    <h3 className={`text-xl font-black mb-3 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Time Slots Not Available</h3>
                    <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} font-medium`}>The restaurant owner hasn't set up time slots yet. Please contact the restaurant directly to make a reservation.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Promotions Section */}
            {promotions && Array.isArray(promotions) && promotions.length > 0 && (
              <div className="mb-12">
                <h3 className={`text-2xl font-black mb-6 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <div className="w-10 h-10 rounded-xl bg-yellow-400/10 flex items-center justify-center text-yellow-500">
                    <Tag size={20} />
                  </div>
                  Dino Deals & Offers
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {promotions.map((promo: any) => (
                    <div key={promo._id} className={`group relative overflow-hidden rounded-3xl p-6 transition-all duration-500 border-2 ${
                      isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-emerald-50 border-emerald-100'
                    }`}>
                      <div className="relative z-10 flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-6 ${
                          isDarkMode ? 'bg-zinc-700 text-emerald-400' : 'bg-white text-emerald-600'
                        }`}>
                          <Percent size={28} />
                        </div>
                        <div>
                          <div className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'} mb-1`}>{promo.title}</div>
                          <p className={`text-sm font-medium mb-4 ${isDarkMode ? 'text-gray-400' : 'text-emerald-700 opacity-80'}`}>{promo.description}</p>
                          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${
                            isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-600 text-white'
                          }`}>
                            CODE: {promo.code}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-3xl p-6 sm:p-8 shadow-xl border mb-8 transition-all`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                <h2 className={`text-2xl font-black flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'} tracking-tight`}>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <MessageSquare size={20} />
                  </div>
                  Excavation Feedback
                </h2>
                <div className={`flex items-center gap-4 px-5 py-3 rounded-2xl ${isDarkMode ? 'bg-gray-700/50' : 'bg-emerald-50'}`}>
                  {averageRating ? (
                    <div className="flex items-center gap-3">
                      <StarRating rating={averageRating} size={18} />
                      <span className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>{averageRating}</span>
                    </div>
                  ) : null}
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-emerald-600'}`}>({reviews?.length || 0} reviews)</span>
                </div>
              </div>

              {/* Review Submission Form */}
              <div className={`mb-10 rounded-2xl p-6 border-2 ${isDarkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                <h3 className={`text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  Leave Your Mark
                </h3>
                <form id="review-form" onSubmit={handleReviewSubmit} className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} tracking-tight uppercase`}>
                      {editingReviewId ? 'Edit Your Expedition Report' : 'Log Your Expedition'}
                    </h3>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <div key={star} className="relative cursor-pointer group">
                          <button
                            type="button"
                            onClick={() => setNewRating(star - 0.5)}
                            onMouseEnter={() => setHoverRating(star - 0.5)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="absolute left-0 top-0 w-1/2 h-full z-10"
                          />
                          <button
                            type="button"
                            onClick={() => setNewRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="absolute right-0 top-0 w-1/2 h-full z-10"
                          />
                          <div className="transition-transform group-hover:scale-110 active:scale-95">
                            {(hoverRating || newRating) >= star ? (
                              <Star size={28} className="text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]" />
                            ) : (hoverRating || newRating) >= star - 0.5 ? (
                              <div className="relative">
                                <Star size={28} className={`${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                                <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                                  <Star size={28} className="text-yellow-400 fill-yellow-400" />
                                </div>
                              </div>
                            ) : (
                              <Star size={28} className={`${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="relative">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="What were the highlights of your culinary expedition?"
                      className={`w-full p-5 pr-14 border-2 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[120px] text-base font-medium transition-all ${
                        isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-100 text-gray-900'
                      }`}
                    />
                    <div className="absolute bottom-3 right-3 scale-110 flex items-center gap-2">
                      <EmojiPicker
                        onEmojiSelect={(emoji) => setNewComment(prev => prev + emoji)}
                      />
                    </div>
                  </div>

                  {/* Image Upload Area */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Visual Evidence (Optional)
                      </label>
                      <span className="text-[10px] font-bold text-gray-400">{imagePreviews.length}/5 photos</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative w-24 h-24 group">
                          <img 
                            src={preview} 
                            alt="Preview" 
                            className="w-full h-full object-cover rounded-2xl border-2 border-emerald-500/20"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow-lg hover:bg-rose-600 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      
                      {imagePreviews.length < 5 && (
                        <label className={`w-24 h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                          isDarkMode 
                            ? 'bg-gray-800/50 border-gray-700 hover:border-emerald-500 hover:bg-emerald-500/5' 
                            : 'bg-gray-50 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50'
                        }`}>
                          <Camera className="text-gray-400 mb-1" size={24} />
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Add Photo</span>
                          <input 
                            type="file" 
                            accept="image/jpeg,image/png,image/webp,image/avif" 
                            multiple 
                            onChange={handleImageChange} 
                            className="hidden" 
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="flex-1 group relative bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-sm py-4 px-10 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95 disabled:opacity-50 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      <span className="relative flex items-center justify-center gap-3">
                        {isSubmittingReview ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
                        {editingReviewId ? 'Update Report' : 'Post Review'}
                      </span>
                    </button>
                    {editingReviewId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingReviewId(null);
                          setNewRating(0);
                          setNewComment('');
                          setImagePreviews([]);
                          setSelectedImages([]);
                        }}
                        className={`px-8 rounded-2xl font-black uppercase tracking-widest text-xs border-2 ${
                          isDarkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-500'
                        }`}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {reviewsLoading ? (
                <div className="flex justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
                </div>
              ) : (!reviews || !Array.isArray(reviews) || reviews.length === 0) ? (
                <div className={`text-center py-16 rounded-3xl border-2 border-dashed ${isDarkMode ? 'bg-gray-700/20 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                  <p className={`text-lg font-bold opacity-40 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No reviews yet. Be the first to visit!</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {reviews.map((review) => (
                    <div key={review._id} className={`p-6 rounded-3xl border-2 transition-all ${isDarkMode ? 'bg-gray-700/20 border-gray-700 hover:border-emerald-500/20' : 'bg-white border-gray-50 hover:border-emerald-100'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          {review.userPhoto ? (
                            <img 
                              src={normalizeImageUrl(review.userPhoto)} 
                              alt={review.userName} 
                              className="w-12 h-12 rounded-2xl object-cover shadow-lg"
                            />
                          ) : (
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg ${
                              isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-500 text-white'
                            }`}>
                              {review.userName?.charAt(0) || 'U'}
                            </div>
                          )}
                          <div>
                            <div className={`font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{review.userName || 'Anonymous'}</div>
                            <div className={`text-[10px] font-bold uppercase tracking-widest opacity-40 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Authenticated Explorer • {new Date(review.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="scale-90">
                            <StarRating rating={review.rating} size={14} />
                          </div>
                          {localStorage.getItem('userData') && JSON.parse(localStorage.getItem('userData')!).uid === review.userId && (
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleEditReview(review)}
                                className={`p-2 rounded-xl transition-all ${isDarkMode ? 'bg-gray-800 text-emerald-400 hover:bg-gray-700' : 'bg-gray-50 text-emerald-600 hover:bg-gray-100'}`}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteReview(review._id)}
                                className={`p-2 rounded-xl transition-all ${isDarkMode ? 'bg-gray-800 text-rose-400 hover:bg-gray-700' : 'bg-gray-50 text-rose-600 hover:bg-gray-100'}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className={`text-base font-medium leading-relaxed mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{review.comment}</p>
                      
                      {/* Review Images Gallery */}
                      {review.images && review.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {review.images.map((img: string, idx: number) => (
                            <div 
                              key={idx} 
                              className="relative group cursor-zoom-in w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden border-2 border-transparent hover:border-emerald-500 transition-all"
                              onClick={() => setActiveLightbox({ 
                                images: review.images, 
                                index: idx,
                                comment: review.comment,
                                userName: review.userName
                              })}
                            >
                              <img 
                                src={normalizeImageUrl(img)} 
                                alt={`Review ${idx}`} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Maximize2 className="text-white" size={20} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {review.reply && (
                        <div className={`mt-6 rounded-2xl p-5 border-l-4 border-emerald-500 ${isDarkMode ? 'bg-gray-700/40 text-gray-400' : 'bg-emerald-50/50 text-emerald-800'}`}>
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">Owner Response</div>
                          <p className="text-sm font-medium italic">
                            "{typeof review.reply === 'object' ? review.reply.text : review.reply}"
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
            <div className={`sticky top-8 rounded-[2.5rem] p-8 shadow-2xl border-2 transition-all duration-500 ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <h2 className={`text-3xl font-black mb-6 tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>The Site</h2>
              <p className={`text-base font-medium leading-relaxed mb-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {restaurant.name} is a premier dining site in {restaurant.location.city}, offering {restaurant.cuisine?.join(', ')} cuisine.
                {restaurant && isRestaurantOpen(restaurant) ? " We're currently active and ready for excavation!" : " This site is currently dormant."}
              </p>

              <div className="space-y-6">
                <div className="flex items-center justify-between group/item">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover/item:scale-110 transition-transform">
                      <MapPin size={22} />
                    </div>
                    <span className={`text-sm font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{restaurant.address}</span>
                  </div>
                  <button
                    onClick={() => {
                      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address || '')}&map_action=pano`;
                      window.open(url, '_blank');
                    }}
                    className={`p-3 rounded-xl border-2 transition-all hover:scale-110 active:scale-95 ${
                      isDarkMode ? 'border-gray-700 hover:border-emerald-500 text-gray-400 hover:text-emerald-500' : 'border-gray-100 hover:border-emerald-500 text-gray-400 hover:text-emerald-500'
                    }`}
                    title="View Street View"
                  >
                    <Eye size={18} />
                  </button>
                </div>
                <div className="flex items-center gap-4 group/item">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover/item:scale-110 transition-transform">
                    <Phone size={22} />
                  </div>
                  <span className={`text-sm font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{restaurant.phoneNumber}</span>
                </div>
              </div>

              {/* Keep the map component */}
              <div className="mt-10 rounded-3xl overflow-hidden border-2 border-gray-100 dark:border-gray-700 shadow-inner group/map grayscale hover:grayscale-0 transition-all duration-700">
                <RestaurantMap
                  address={restaurant.address || `${restaurant.location.city}, ${restaurant.location.state}`}
                  name={restaurant.name}
                />
              </div>

              <div className="mt-10">
                <button
                  onClick={toggleFavorite}
                  className={`w-full group flex items-center justify-center gap-3 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all duration-500 border-2 active:scale-95 ${
                    isFavorite
                      ? 'bg-rose-500 border-rose-400 text-white shadow-xl shadow-rose-500/20'
                      : isDarkMode
                        ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                        : 'border-emerald-500 text-emerald-500 hover:bg-emerald-50 shadow-lg shadow-emerald-500/5'
                    }`}
                >
                  <Heart fill={isFavorite ? "currentColor" : "none"} className={`w-5 h-5 ${isFavorite ? 'animate-bounce' : ''}`} />
                  <span>{isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Lightbox Modal */}
        {activeLightbox && (
          <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-8">
            <button 
              onClick={() => setActiveLightbox(null)}
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-[110]"
            >
              <X size={24} />
            </button>
            
            <div className="relative w-full max-w-5xl aspect-video md:aspect-auto md:h-[80vh] flex items-center justify-center">
              <button 
                onClick={() => setActiveLightbox({ ...activeLightbox, index: (activeLightbox.index - 1 + activeLightbox.images.length) % activeLightbox.images.length })}
                className="absolute left-0 p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all z-[110]"
              >
                <ChevronLeft size={32} />
              </button>
              
              <img 
                src={normalizeImageUrl(activeLightbox.images[activeLightbox.index])} 
                alt="Fullscreen view" 
                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-in fade-in zoom-in duration-300"
              />
              
              <button 
                onClick={() => setActiveLightbox({ ...activeLightbox, index: (activeLightbox.index + 1) % activeLightbox.images.length })}
                className="absolute right-0 p-4 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all z-[110]"
              >
                <ChevronRight size={32} />
              </button>

              {/* Comment Overlay */}
              {activeLightbox.comment && (
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white animate-in slide-in-from-bottom-10 duration-500">
                  <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-1 h-6 bg-emerald-500 rounded-full" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Expedition Report</span>
                      {activeLightbox.userName && (
                        <>
                          <span className="text-white/20">•</span>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Scout: {activeLightbox.userName}</span>
                        </>
                      )}
                    </div>
                    <p className="text-lg md:text-xl font-medium leading-relaxed italic drop-shadow-md">
                      "{activeLightbox.comment}"
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto">
              {activeLightbox.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveLightbox({ ...activeLightbox, index: idx })}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                    activeLightbox.index === idx ? 'border-emerald-500 scale-110' : 'border-transparent opacity-50 hover:opacity-100'
                  }`}
                >
                  <img src={normalizeImageUrl(img)} alt="Thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
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
            src={normalizeImageUrl(event.imageUrl)}
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