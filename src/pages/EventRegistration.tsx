import React, { useState, useEffect, useRef } from 'react';
import { API_CONFIG } from '../config/api';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Clock, Users, MapPin, Loader, ArrowLeft, Heart, CheckCircle, MessageSquare, Star, Send, ThumbsUp, ThumbsDown, Camera, X, Maximize2, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import SeatingChart from '../components/SeatingChart';
import IndividualSeatingChart from '../components/IndividualSeatingChart';
import EventSeatingViewer from '../components/EventSeatingViewer';
import StarRating from '../components/StarRating';
import EmojiPicker from '../components/EmojiPicker';
import { seatsToRows } from '../utils/seatUtils';
import { Seat, SeatingLayout } from '../types/seating';
import { io, Socket } from 'socket.io-client';
import { normalizeImageUrl } from '../services/api';

interface TicketType {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  description: string;
  status: 'active' | 'sold_out' | 'hidden';
}

interface AddOn {
  _id: string;
  name: string;
  price: number;
  description: string;
  type: 'product' | 'service';
  isRequired: boolean;
}

interface Event {
  _id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  location: string;
  capacity: number;
  registeredCount: number;
  price: number;
  imageUrl?: string;
  category?: string;
  organizer?: string;
  hasSeating?: boolean;
  seatingLayout?: SeatingLayout;
  tickets?: TicketType[];
  addOns?: AddOn[];
}

const EventRegistration: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  // New state for tickets and add-ons
  const [selectedTickets, setSelectedTickets] = useState<{ [key: string]: number }>({});
  const [selectedAddOns, setSelectedAddOns] = useState<{ [key: string]: number }>({});

  // Review state
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [activeLightbox, setActiveLightbox] = useState<{
    images: string[];
    index: number;
    comment?: string;
    userName?: string;
  } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("dineInGoDarkMode");
    return saved === "true" ? true : false;
  });

  useEffect(() => {
    const root = document.documentElement;
    
    const checkTheme = () => {
      const themeAttr = root.getAttribute('data-theme');
      if (themeAttr) {
        setIsDarkMode(themeAttr === 'dark');
      } else {
        const theme = localStorage.getItem("theme");
        if (theme === 'dark') {
          setIsDarkMode(true);
        } else if (theme === 'light') {
          setIsDarkMode(false);
        } else {
          setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
      }
    };

    checkTheme();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          checkTheme();
        }
      });
    });

    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      const theme = localStorage.getItem("theme");
      if (theme === 'system' || !theme) {
        checkTheme();
      }
    };
    mediaQuery.addEventListener('change', handleSystemChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleSystemChange);
    };
  }, []);


  useEffect(() => {
    // Check if ID is a valid MongoDB ObjectID (24 hex characters)
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      toast.error('Invalid event ID. Redirecting to events page...');
      setTimeout(() => navigate('/events'), 2000);
      setLoading(false);
      return;
    }

    fetchEvent();
    checkIfFavorite();

    // Initialize Socket.IO connection
    const newSocket = io(API_CONFIG.BASE_URL);
    setSocket(newSocket);

    // Join event room for real-time updates
    newSocket.emit('joinEvent', id);
    console.log(`Joined event room: ${id}`);

    // Listen for seat booking updates
    newSocket.on('seatsBooked', (data: { eventId: string; seatIds: string[]; userId: string; registeredCount: number; capacity: number }) => {
      console.log('Seats booked by another user:', data);

      // Update event state to mark seats as booked
      setEvent(prevEvent => {
        if (!prevEvent || !prevEvent.seatingLayout) return prevEvent;

        const updatedSeats = prevEvent.seatingLayout.seats.map(seat => {
          if (data.seatIds.includes(seat.id)) {
            return { ...seat, status: 'booked' as const, bookedBy: data.userId };
          }
          return seat;
        });

        return {
          ...prevEvent,
          seatingLayout: {
            ...prevEvent.seatingLayout,
            seats: updatedSeats
          },
          registeredCount: data.registeredCount
        };
      });

      // Remove any selected seats that were just booked by someone else
      setSelectedSeatIds(prev => prev.filter(seatId => !data.seatIds.includes(seatId)));

      // Show toast notification
      if (data.userId !== auth.currentUser?.uid) {
        toast.info(`${data.seatIds.length} seat(s) just booked by another user`, {
          position: 'top-right',
          autoClose: 3000
        });
      }
    });

    // Listen for seat cancellation updates
    newSocket.on('seatsCancelled', (data: { eventId: string; seatIds: string[]; userId: string; registeredCount: number; capacity: number; availableSeats: number }) => {
      console.log('Seats cancelled by another user:', data);

      // Update event state to mark seats as available
      setEvent(prevEvent => {
        if (!prevEvent || !prevEvent.seatingLayout) return prevEvent;

        const updatedSeats = prevEvent.seatingLayout.seats.map(seat => {
          if (data.seatIds.includes(seat.id)) {
            return { ...seat, status: 'available' as const, bookedBy: undefined };
          }
          return seat;
        });

        return {
          ...prevEvent,
          seatingLayout: {
            ...prevEvent.seatingLayout,
            seats: updatedSeats
          },
          registeredCount: data.registeredCount
        };
      });

      // Show toast notification
      if (data.userId !== auth.currentUser?.uid) {
        toast.success(`${data.seatIds.length} seat(s) now available!`, {
          position: 'top-right',
          autoClose: 3000
        });
      }
    });

    // Listen for area booking updates
    newSocket.on('areaBooked', (data: { eventId: string; areaId: string; userId: string; guests: number; booked: number; capacity: number; availableSpots: number }) => {
      console.log('Area booked by another user:', data);

      setEvent(prevEvent => {
        if (!prevEvent || !prevEvent.seatingLayout || !prevEvent.seatingLayout.areas) return prevEvent;

        const updatedAreas = prevEvent.seatingLayout.areas.map((area: any) => {
          if (area.id === data.areaId) {
            return { ...area, booked: data.booked };
          }
          return area;
        });

        return {
          ...prevEvent,
          seatingLayout: {
            ...prevEvent.seatingLayout,
            areas: updatedAreas
          }
        };
      });

      if (data.userId !== auth.currentUser?.uid) {
        toast.info(`${data.guests} spot(s) just booked in an area`, {
          position: 'top-right',
          autoClose: 3000
        });
      }
    });

    // Listen for area cancellation updates
    newSocket.on('areaCancelled', (data: { eventId: string; areaId: string; userId: string; guests: number; booked: number; capacity: number; availableSpots: number }) => {
      console.log('Area cancelled by another user:', data);

      setEvent(prevEvent => {
        if (!prevEvent || !prevEvent.seatingLayout || !prevEvent.seatingLayout.areas) return prevEvent;

        const updatedAreas = prevEvent.seatingLayout.areas.map((area: any) => {
          if (area.id === data.areaId) {
            return { ...area, booked: data.booked };
          }
          return area;
        });

        return {
          ...prevEvent,
          seatingLayout: {
            ...prevEvent.seatingLayout,
            areas: updatedAreas
          }
        };
      });

      if (data.userId !== auth.currentUser?.uid) {
        toast.success(`${data.guests} spot(s) now available in an area!`, {
          position: 'top-right',
          autoClose: 3000
        });
      }
    });

    // Listen for general event registration updates (non-seating events)
    newSocket.on('eventRegistered', (data: { eventId: string; guests: number; registeredCount: number; capacity: number; spotsLeft: number }) => {
      console.log('Event registered by another user:', data);

      setEvent(prevEvent => {
        if (!prevEvent) return prevEvent;
        return {
          ...prevEvent,
          registeredCount: data.registeredCount
        };
      });

      // Adjust numberOfGuests if it exceeds available spots
      setNumberOfGuests(prev => {
        const maxGuests = Math.min(10, data.spotsLeft);
        return prev > maxGuests ? maxGuests : prev;
      });

      if (data.spotsLeft > 0) {
        toast.info(`${data.guests} spot(s) just taken. ${data.spotsLeft} spot(s) remaining`, {
          position: 'top-right',
          autoClose: 3000
        });
      } else {
        toast.warning('Event is now full!', {
          position: 'top-right',
          autoClose: 3000
        });
      }
    });

    // Listen for event cancellation updates (non-seating events)
    newSocket.on('eventCancelled', (data: { eventId: string; guests: number; registeredCount: number; capacity: number; spotsLeft: number }) => {
      console.log('Event cancelled by another user:', data);

      setEvent(prevEvent => {
        if (!prevEvent) return prevEvent;
        return {
          ...prevEvent,
          registeredCount: data.registeredCount
        };
      });

      toast.success(`${data.guests} spot(s) now available! ${data.spotsLeft} spot(s) remaining`, {
        position: 'top-right',
        autoClose: 3000
      });
    });

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.emit('leaveEvent', id);
        newSocket.disconnect();
        console.log(`Left event room: ${id}`);
      }
    };
  }, [id]);

  // Reset guests to 1 when area selection changes to prevent overbooking errors
  useEffect(() => {
    if (selectedSeatIds.length > 0) {
      setNumberOfGuests(1);
    }
  }, [selectedSeatIds]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/events/${id}`);

      if (!response.ok) {
        if (response.status === 400 || response.status === 404) {
          toast.error('Event not found. Redirecting to events page...');
          setTimeout(() => navigate('/events'), 2000);
          return;
        }
        throw new Error('Failed to fetch event');
      }

      const data = await response.json();
      console.log('Fetched event data:', data);
      console.log('Has seating:', data.hasSeating);
      console.log('Seating layout:', data.seatingLayout);

      // If this is an area-based event, silently recalculate area counts from
      // confirmed bookings to fix any stale/corrupted numbers
      if (data.seatingLayout?.areas?.length > 0 || data.seatingLayout?.eventConfig?.concertAreas?.length > 0) {
        try {
          await fetch(
            `${API_CONFIG.BASE_URL}/api/v1/events/${id}/recalculate-areas`,
            { method: 'POST' }
          );
          // Re-fetch with fresh counts
          const fresh = await fetch(`${API_CONFIG.BASE_URL}/api/v1/events/${id}`);
          if (fresh.ok) {
            const freshData = await fresh.json();
            setEvent(freshData);
            fetchReviews();
            return;
          }
        } catch (e) {
          console.warn('Area recalculate failed, using original data:', e);
        }
      }

      setEvent(data);

      // Fetch reviews
      fetchReviews();
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Failed to load event details. Redirecting to events page...');
      setTimeout(() => navigate('/events'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/events/${id}/reviews`);
      const data = await response.json();
      console.log('Fetched reviews:', data);
      if (data && data.length > 0) {
        console.log('First review userPhoto:', data[0]?.userPhoto);
        console.log('First review userName:', data[0]?.userName);
      }
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleLikeReview = async (reviewId: string) => {
    if (!auth.currentUser) {
      toast.error('Please login to like reviews');
      return;
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/events/reviews/${reviewId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: auth.currentUser.uid
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Update the review in the list
        setReviews(prev => prev.map(review =>
          review._id === reviewId
            ? { ...review, likes: data.likes, dislikes: data.dislikes }
            : review
        ));
      }
    } catch (error) {
      console.error('Error liking review:', error);
    }
  };

  const handleDislikeReview = async (reviewId: string) => {
    if (!auth.currentUser) {
      toast.error('Please login to dislike reviews');
      return;
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/events/reviews/${reviewId}/dislike`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: auth.currentUser.uid
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Update the review in the list
        setReviews(prev => prev.map(review =>
          review._id === reviewId
            ? { ...review, likes: data.likes, dislikes: data.dislikes }
            : review
        ));
      }
    } catch (error) {
      console.error('Error disliking review:', error);
    }
  };

  const handleEditReview = (review: any) => {
    setEditingReviewId(review._id);
    setNewRating(review.rating);
    setNewComment(review.comment);
    setImagePreviews(review.images || []);
    // selectedImages will stay empty until new files are picked
    document.getElementById('review-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/events/reviews/${reviewId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Review deleted');
        fetchReviews();
      } else {
        toast.error('Failed to delete review');
      }
    } catch (err) {
      toast.error('Failed to delete review');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newImages = [...selectedImages, ...files].slice(0, 5);
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
      toast.error('Please write a comment');
      return;
    }

    if (!auth.currentUser) {
      toast.error('You must be logged in to submit a review');
      navigate('/login');
      return;
    }

    try {
      setIsSubmittingReview(true);
      
      // Get user data from localStorage or Firebase
      const userData = localStorage.getItem('userData') ? JSON.parse(localStorage.getItem('userData')!) : null;
      const userPhoto = auth.currentUser.photoURL || userData?.photoURL || userData?.currentAvatar || '';
      
      console.log('Submitting review with userPhoto:', userPhoto);
      
      const formData = new FormData();
      formData.append('userId', auth.currentUser.uid);
      formData.append('userName', auth.currentUser.displayName || userData?.displayName || userData?.name || 'Anonymous');
      formData.append('userPhoto', userPhoto);
      formData.append('rating', newRating.toString());
      formData.append('comment', newComment);

      // Append new file uploads
      selectedImages.forEach(image => {
        formData.append('images', image);
      });

      let response;
      if (editingReviewId) {
        // Editing an existing review or sub-review → PUT
        formData.append('images', JSON.stringify(imagePreviews.filter(p => p.startsWith('http'))));
        response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/events/reviews/${editingReviewId}`, {
          method: 'PUT',
          body: formData
        });
      } else {
        // New review → POST
        response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/events/${id}/reviews`, {
          method: 'POST',
          body: formData
        });
      }

      if (response.ok) {
        toast.success(editingReviewId ? 'Review updated successfully!' : 'Review submitted successfully!');
        setNewRating(0);
        setNewComment('');
        setSelectedImages([]);
        setImagePreviews([]);
        setEditingReviewId(null);
        fetchReviews();
      } else {
        let error;
        try {
          error = await response.json();
        } catch (jsonError) {
          console.error('Failed to parse error response:', jsonError);
          error = { message: `Server error: ${response.status} ${response.statusText}` };
        }
        
        console.error('Review submission error:', error);

        // Check if user already reviewed
        if (error.message && error.message.includes('already reviewed')) {
          // Find user's existing review
          const existingReview = reviews.find(r => r.userId === auth.currentUser?.uid);
          if (existingReview) {
            toast.info('You have already reviewed this event. Your previous review is shown below.');
          } else {
            toast.error('You have already reviewed this event. Please refresh the page to see your review.');
          }
        } else {
          toast.error(error.message || 'Failed to submit review');
        }
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error('Failed to submit review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const checkIfFavorite = async () => {
    if (!auth.currentUser || !id) return;

    try {
      const { favoritesApi } = await import('../services/favoritesApi');
      const response = await favoritesApi.get(auth.currentUser.uid);
      const eventFavs = response.eventIds || [];
      const isFav = eventFavs.includes(id);
      setIsFavorite(isFav);
    } catch (error) {
      console.error('Error checking favorites:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!auth.currentUser) {
      toast.error('Please login to add favorites');
      navigate('/login');
      return;
    }

    if (!id) return;

    setFavoriteLoading(true);

    try {
      const { favoritesApi } = await import('../services/favoritesApi');
      if (isFavorite) {
        await favoritesApi.removeEvent(auth.currentUser.uid, id);
        toast.success('Removed from favorites');
      } else {
        await favoritesApi.addEvent(auth.currentUser.uid, id);
        toast.success('Added to favorites');
      }
      setIsFavorite(!isFavorite);
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      toast.error(error.message || 'Failed to update favorites');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleSeatClick = (seat: Seat) => {
    if (seat.status === 'booked') return;

    if (selectedSeatIds.includes(seat.id)) {
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seat.id));
    } else {
      setSelectedSeatIds((prev) => [...prev, seat.id]);
    }
  };

  const updateTicketQuantity = (ticketId: string, delta: number, max?: number) => {
    setSelectedTickets(prev => {
      const current = prev[ticketId] || 0;
      const next = Math.max(0, current + delta);
      if (max !== undefined && next > max) return prev;
      return { ...prev, [ticketId]: next };
    });
  };

  const updateAddOnQuantity = (addOnId: string, delta: number) => {
    setSelectedAddOns(prev => {
      const current = prev[addOnId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [addOnId]: next };
    });
  };

  const handleProceedToPreview = () => {
    if (!auth.currentUser) {
      toast.error('Please login to register for events');
      navigate('/login');
      return;
    }

    if (!event) return;

    // For events with seating, check if seats are selected
    if (event.hasSeating && selectedSeatIds.length === 0) {
      toast.error('Please select at least one seat');
      return;
    }

    // For events without seating
    if (!event.hasSeating) {
      if (event.tickets && event.tickets.length > 0) {
        // Check if any tickets are selected
        const totalTickets = Object.values(selectedTickets).reduce((a, b) => a + b, 0);
        if (totalTickets === 0) {
          toast.error('Please select at least one ticket');
          return;
        }
      } else {
        // Legacy simple guest count check
        if (event.registeredCount + numberOfGuests > event.capacity) {
          toast.error('Not enough spots available');
          return;
        }
      }
    }

    // Calculate total amount
    let totalAmount = 0;
    let finalGuests = 0;

    if (event.hasSeating && event.seatingLayout) {
      if (event.seatingLayout.areas && event.seatingLayout.areas.length > 0) {
        const selectedArea = event.seatingLayout.areas.find((area: any) =>
          selectedSeatIds.includes(area.id)
        );
        totalAmount = selectedArea ? selectedArea.price * numberOfGuests : 0;
        finalGuests = numberOfGuests;
      } else if (event.seatingLayout.seats && event.seatingLayout.seats.length > 0) {
        const selectedSeats = event.seatingLayout.seats.filter((seat: any) =>
          selectedSeatIds.includes(seat.id)
        );
        totalAmount = selectedSeats.reduce((sum: number, seat: any) => sum + seat.price, 0);
        finalGuests = selectedSeatIds.length;
      }
    } else {
      if (event.tickets && event.tickets.length > 0) {
        // Sum up ticket prices
        event.tickets.forEach(ticket => {
          const qty = selectedTickets[ticket._id] || 0;
          totalAmount += ticket.price * qty;
          finalGuests += qty;
        });
      } else {
        totalAmount = event.price * numberOfGuests;
        finalGuests = numberOfGuests;
      }
    }

    // Add Add-ons cost
    if (event.addOns) {
      event.addOns.forEach(addon => {
        const qty = selectedAddOns[addon._id] || 0;
        totalAmount += addon.price * qty;
      });
    }

    // Prepare ticket data for easier processing in preview
    const selectedTicketsData = event.tickets?.filter(t => (selectedTickets[t._id] || 0) > 0).map(t => ({
      ticketId: t._id,
      name: t.name,
      price: t.price,
      quantity: selectedTickets[t._id]
    })) || [];

    const selectedAddOnsData = event.addOns?.filter(a => (selectedAddOns[a._id] || 0) > 0).map(a => ({
      addOnId: a._id,
      name: a.name,
      price: a.price,
      quantity: selectedAddOns[a._id]
    })) || [];

    // Navigate to preview page with event data
    const queryParams = new URLSearchParams({
      type: 'event',
      date: new Date(event.date).toISOString().split('T')[0],
      time: event.time,
      guests: finalGuests.toString(),
      ...(event.hasSeating && { seats: selectedSeatIds.join(',') })
    });

    navigate(`/event/${event._id}/preview?${queryParams.toString()}`, {
      state: {
        event,
        selectedSeatIds: event.hasSeating ? selectedSeatIds : undefined,
        numberOfGuests: finalGuests,
        totalAmount,
        selectedTickets: selectedTicketsData,
        selectedAddOns: selectedAddOnsData
      }
    });
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <Loader className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="text-center">
          <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Event not found</h2>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/events')}
              className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Browse Events
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className={`px-6 py-2 border rounded-lg transition-colors ${isDarkMode ? 'text-emerald-400 border-emerald-400 hover:bg-emerald-400/10' : 'text-emerald-500 border-emerald-500 hover:bg-emerald-50'
                }`}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const spotsLeft = event ? Math.max(0, event.capacity - (event.registeredCount || 0)) : 0;

  return (
    <div className={`min-h-screen py-4 md:py-8 transition-colors duration-300 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto px-3 md:px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center gap-2 mb-4 md:mb-6 min-h-[44px] min-w-[44px] transition-colors ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'
            }`}
        >
          <ArrowLeft size={20} />
          <span className="text-sm md:text-base font-bold uppercase tracking-widest">Back</span>
        </button>

        {/* Event Details Card */}
        <div className={`rounded-3xl shadow-2xl overflow-hidden border-2 mb-8 ${isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-white'
          }`}>
          {/* Event Image */}
          <div className="h-40 md:h-56 lg:h-72 bg-gradient-to-r from-emerald-500 to-emerald-600 relative overflow-hidden">
            {event.imageUrl && (
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end">
              <div className="p-4 md:p-6 lg:p-8 text-white w-full">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-emerald-500 rounded-full text-[10px] font-black uppercase tracking-widest">{event.category}</span>
                </div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-black mb-1 md:mb-2 tracking-tight">{event.title}</h1>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6 lg:p-8">
            {/* Event Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-500/5 border border-gray-500/10">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Date</p>
                  <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{new Date(event.date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-500/5 border border-gray-500/10">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Clock size={20} />
                </div>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Time</p>
                  <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{event.time}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-500/5 border border-gray-500/10">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <MapPin size={20} />
                </div>
                <div className="min-w-0">
                  <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Location</p>
                  <p className={`font-bold text-sm truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{event.location}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-500/5 border border-gray-500/10">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Users size={20} />
                </div>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Spots</p>
                  <p className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {spotsLeft} / {event.capacity}
                  </p>
                </div>
              </div>
            </div>

            {/* Registration Progress */}
            {event && !event.hasSeating && (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Registration Progress</span>
                  <span className={`text-[10px] font-black ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{Math.round((event.registeredCount / event.capacity) * 100)}% Full</span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                  <div
                    className="h-full bg-emerald-500 transition-all duration-1000"
                    style={{ width: `${(event.registeredCount / event.capacity) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Favorite & Share Buttons */}
            <div className="flex gap-4 mb-8">
              <button
                onClick={toggleFavorite}
                disabled={favoriteLoading}
                className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 border-2 active:scale-95 ${isFavorite
                    ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20'
                    : isDarkMode
                      ? 'bg-transparent border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                      : 'bg-white border-emerald-500 text-emerald-600 hover:bg-emerald-50'
                  }`}
              >
                {favoriteLoading ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Heart className={isFavorite ? 'fill-current animate-bounce' : ''} size={18} />
                    {isFavorite ? 'Remove Favorite' : 'Add to Collection'}
                  </>
                )}
              </button>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">About this event</h3>
              <p className="text-gray-600">{event.description}</p>
            </div>

            {/* Seating Chart or Guest Selection */}
            {event.hasSeating && event.seatingLayout ? (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Select Your Seats</h3>

                {/* Check if it's concert areas or individual seats */}
                {event.seatingLayout.areas && event.seatingLayout.areas.length > 0 ? (
                  <>
                    <EventSeatingViewer
                      seatingLayout={event.seatingLayout}
                      eventId={String(event._id)}
                      selectedAreaIds={selectedSeatIds}
                      onAreaClick={(areaId) => {
                        const area = event.seatingLayout?.areas?.find((a: any) => a.id === areaId);
                        if (!area) return;

                        // Check if area is full
                        if (area.booked >= area.capacity) {
                          toast.error('This area is full');
                          return;
                        }

                        // Toggle area selection
                        if (selectedSeatIds.includes(areaId)) {
                          setSelectedSeatIds(prev => prev.filter(id => id !== areaId));
                        } else {
                          setSelectedSeatIds([areaId]); // Only one area at a time
                        }
                      }}
                    />

                    {/* Guest count selector for area */}
                    {selectedSeatIds.length > 0 && (
                      <div className={`mt-4 p-4 rounded-lg border ${isDarkMode ? 'bg-emerald-950/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200'}`}>
                        <h4 className={`font-semibold mb-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>Number of Guests:</h4>
                        <select
                          value={numberOfGuests}
                          onChange={(e) => setNumberOfGuests(Number(e.target.value))}
                          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        >
                          {(() => {
                            const area = event.seatingLayout!.areas.find((a: any) => a.id === selectedSeatIds[0]);
                            const availableSpots = area ? area.capacity - (area.booked || 0) : 0;
                            return [...Array(Math.min(10, availableSpots))].map((_, i) => (
                              <option key={i + 1} value={i + 1}>
                                {i + 1} {i === 0 ? 'Guest' : 'Guests'}
                              </option>
                            ));
                          })()}
                        </select>
                      </div>
                    )}
                  </>
                ) : event.seatingLayout.seats && event.seatingLayout.seats.length > 0 ? (
                  <>
                    {/* Check if seats have x, y coordinates (individual seats) or rowLabel (grid seats) */}
                    {event.seatingLayout.seats[0] && 'x' in event.seatingLayout.seats[0] && 'y' in event.seatingLayout.seats[0] ? (
                      <IndividualSeatingChart
                        seats={event.seatingLayout.seats as any}
                        selectedSeatIds={selectedSeatIds}
                        onSeatClick={(seat: any) => handleSeatClick(seat)}
                      />
                    ) : (
                      <div className="bg-gray-950 rounded-lg p-4">
                        <SeatingChart
                          layout={seatsToRows(event.seatingLayout.seats)}
                          selectedSeatIds={selectedSeatIds}
                          onSeatClick={handleSeatClick}
                        />
                      </div>
                    )}

                    {/* Selected Seats Summary */}
                    {selectedSeatIds.length > 0 && (
                      <div className={`mt-4 p-4 rounded-lg border ${isDarkMode ? 'bg-emerald-950/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200'}`}>
                        <h4 className={`font-semibold mb-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>Selected Seats:</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedSeatIds.map(seatId => {
                            const seat = event.seatingLayout!.seats.find((s: any) => s.id === seatId);
                            return seat ? (
                              <span key={seatId} className="px-3 py-1 bg-emerald-600 text-white rounded-full text-sm">
                                {(seat as any).label || seat.id} ({seat.tier}) - ₹{seat.price}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No seating layout available
                  </div>
                )}
              </div>
            ) : (

              <div className="mb-6">
                {event.tickets && event.tickets.length > 0 && (
                  <>
                    <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Select Tickets</h3>
                    <div className="space-y-4">
                      {event.tickets.map(ticket => (
                        <div key={ticket._id} className={`flex justify-between items-center p-4 border rounded-lg hover:border-emerald-500 transition ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                          <div>
                            <h4 className="font-semibold">{ticket.name}</h4>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{ticket.description}</p>
                            <p className={`font-bold mt-1 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>₹{ticket.price}</p>
                            <p className={`text-xs mt-1 ${ticket.quantity - ticket.sold > 0 ? (isDarkMode ? 'text-gray-400' : 'text-gray-500') : 'text-red-500 font-medium'}`}>
                              {ticket.quantity - ticket.sold > 0 ? `${ticket.quantity - ticket.sold} left` : 'Sold Out'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => updateTicketQuantity(ticket._id, -1)}
                              disabled={!selectedTickets[ticket._id]}
                              className={`w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-50 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-semibold">{selectedTickets[ticket._id] || 0}</span>
                            <button
                              onClick={() => updateTicketQuantity(ticket._id, 1, ticket.quantity - ticket.sold)}
                              disabled={ticket.quantity - ticket.sold <= (selectedTickets[ticket._id] || 0)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-50 ${isDarkMode ? 'bg-emerald-950 text-emerald-400 hover:bg-emerald-900 disabled:bg-gray-850 disabled:text-gray-600' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 disabled:bg-gray-100 disabled:text-gray-400'}`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {(!event.tickets || event.tickets.length === 0) && (
                  <>
                    <label className={`block text-sm font-semibold mb-2 mt-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Number of Guests</label>
                    <select
                      value={numberOfGuests}
                      onChange={(e) => setNumberOfGuests(Number(e.target.value))}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    >
                      {spotsLeft > 0 ? [...Array(Math.min(10, spotsLeft))].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} {i === 0 ? 'Guest' : 'Guests'}
                        </option>
                      )) : <option value={1}>No spots available</option>}
                    </select>
                  </>
                )}

              </div>
            )}

            {/* Add-on Services */}
            {event.addOns && event.addOns.length > 0 && (
              <div className={`mb-6 pt-6 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Add-on Services</h3>
                <div className="space-y-4">
                  {event.addOns.map(addon => (
                    <div key={addon._id} className={`flex justify-between items-center p-4 border rounded-lg hover:border-emerald-500 transition ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-950'}`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{addon.name}</h4>
                          {addon.isRequired && <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-orange-950/40 text-orange-400' : 'bg-orange-100 text-orange-700'}`}>Required</span>}
                        </div>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{addon.description}</p>
                        <p className={`font-bold mt-1 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>₹{addon.price}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateAddOnQuantity(addon._id, -1)}
                          disabled={!selectedAddOns[addon._id]}
                          className={`w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-50 ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-semibold">{selectedAddOns[addon._id] || 0}</span>
                        <button
                          onClick={() => updateAddOnQuantity(addon._id, 1)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-emerald-950 text-emerald-400 hover:bg-emerald-900' : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Price Summary */}
            <div className={`mb-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-gray-50'}`}>
              {event.hasSeating && event.seatingLayout ? (
                <>
                  {(() => {
                    const hasAreas = event.seatingLayout.areas && event.seatingLayout.areas.length > 0;
                    const isAreaSelected = hasAreas && event.seatingLayout.areas?.some((area: any) => selectedSeatIds.includes(area.id));

                    if (isAreaSelected) {
                      const selectedArea = event.seatingLayout.areas?.find((area: any) => selectedSeatIds.includes(area.id));
                      return (
                        <>
                          <div className="flex justify-between items-center mb-2">
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Selected Area</span>
                            <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedArea?.name || selectedArea?.label || 'Area'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Guests</span>
                            <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{numberOfGuests}</span>
                          </div>
                          <div className={`flex justify-between items-center mt-2 pt-2 border-t ${isDarkMode ? 'border-gray-850' : 'border-gray-200'}`}>
                            <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Total</span>
                            <span className={`text-2xl font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                              ₹{(selectedArea?.price || 0) * numberOfGuests}
                            </span>
                          </div>
                        </>
                      );
                    } else {
                      return (
                        <>
                          <div className="flex justify-between items-center">
                            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Selected Seats</span>
                            <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{selectedSeatIds.length}</span>
                          </div>
                          <div className={`flex justify-between items-center mt-2 pt-2 border-t ${isDarkMode ? 'border-gray-850' : 'border-gray-200'}`}>
                            <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Total</span>
                            <span className={`text-2xl font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                              ₹{event.seatingLayout.seats
                                .filter((seat: any) => selectedSeatIds.includes(seat.id))
                                .reduce((sum: number, seat: any) => sum + seat.price, 0)}
                            </span>
                          </div>
                        </>
                      );
                    }
                  })()}
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    {/* Ticket Summary */}

                    {event.tickets && event.tickets.length > 0 ? (
                      Object.keys(selectedTickets).map(ticketId => {
                        const qty = selectedTickets[ticketId];
                        if (qty === 0) return null;
                        const ticket = event.tickets?.find(t => t._id === ticketId);
                        return (
                          <div key={ticketId} className="flex justify-between text-sm">
                            <span className={isDarkMode ? 'text-gray-450' : 'text-gray-600'}>{ticket?.name} x {qty}</span>
                            <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>₹{(ticket?.price || 0) * qty}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className={isDarkMode ? 'text-gray-450' : 'text-gray-600'}>Price per person</span>
                        <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{event.price}</span>
                      </div>
                    )}

                    {/* Add-on Summary */}
                    {Object.keys(selectedAddOns).map(addOnId => {
                      const qty = selectedAddOns[addOnId];
                      if (qty === 0) return null;
                      const addon = event.addOns?.find(a => a._id === addOnId);
                      return (
                        <div key={addOnId} className={`flex justify-between text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <span>+ {addon?.name} x {qty}</span>
                          <span className={isDarkMode ? 'text-white' : 'text-gray-905'}>₹{(addon?.price || 0) * qty}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className={`flex justify-between items-center mt-3 pt-3 border-t ${isDarkMode ? 'border-gray-850' : 'border-gray-200'}`}>
                    <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Total</span>
                    <span className={`text-2xl font-bold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      ₹{(() => {
                        let total = 0;
                        if (event.tickets && event.tickets.length > 0) {
                          total += Object.keys(selectedTickets).reduce((sum, tid) => {
                            const t = event.tickets?.find(tk => tk._id === tid);
                            return sum + (t?.price || 0) * (selectedTickets[tid] || 0);
                          }, 0);
                        } else {
                          total += event.price * numberOfGuests;
                        }

                        total += Object.keys(selectedAddOns).reduce((sum, aid) => {
                          const a = event.addOns?.find(ad => ad._id === aid);
                          return sum + (a?.price || 0) * (selectedAddOns[aid] || 0);
                        }, 0);

                        return total;
                      })()}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Continue to Preview Button */}
            <button
              onClick={handleProceedToPreview}
              disabled={
                (!event.hasSeating && spotsLeft === 0) ||
                (event.hasSeating && selectedSeatIds.length === 0)
              }
              className="w-full bg-emerald-500 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-600 flex items-center justify-center gap-2"
            >
              {!event.hasSeating && spotsLeft === 0 ? (
                'Event Full'
              ) : event.hasSeating && selectedSeatIds.length === 0 ? (
                'Select Seats to Continue'
              ) : (
                'Continue to Preview'
              )}
            </button>
          </div>
        </div>

        {/* Reviews Section */}
        <div className={`rounded-2xl shadow-lg mt-8 ${isDarkMode ? 'bg-gray-900 text-white border-2 border-gray-800' : 'bg-white text-gray-900'}`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                <MessageSquare className="text-emerald-500 animate-pulse" size={24} />
                Event Reviews
              </h2>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${isDarkMode ? 'bg-emerald-950/30' : 'bg-emerald-50'}`}>
                {(() => {
                  const avgRating = reviews.length > 0
                    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                    : 0;
                  return avgRating > 0 ? (
                    <>
                      <StarRating rating={avgRating} size={20} />
                      <span className={`text-xl font-bold ${isDarkMode ? 'text-emerald-300' : 'text-emerald-900'}`}>{avgRating.toFixed(1)}</span>
                    </>
                  ) : null;
                })()}
                <span className={`text-sm font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>({reviews?.length || 0} reviews)</span>
              </div>
            </div>

            {/* Review Submission Form */}
            <div id="review-form" className={`mb-10 rounded-3xl p-6 border-2 ${isDarkMode ? 'bg-gray-950/50 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
              <h3 className={`text-xs font-black uppercase tracking-widest mb-6 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                {editingReviewId ? 'AMEND YOUR MARK' : 'LEAVE YOUR MARK'}
              </h3>
              <form onSubmit={handleReviewSubmit} className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'} tracking-tight uppercase`}>
                    {editingReviewId ? 'REVISE LOGGED EXPEDITION' : 'LOG YOUR EXPEDITION'}
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
                            <Star size={28} className="text-emerald-400 fill-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                          ) : (hoverRating || newRating) >= star - 0.5 ? (
                            <div className="relative">
                              <Star size={28} className={`${isDarkMode ? 'text-gray-700' : 'text-gray-300'}`} />
                              <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                                <Star size={28} className="text-emerald-400 fill-emerald-400" />
                              </div>
                            </div>
                          ) : (
                            <Star size={28} className={`${isDarkMode ? 'text-gray-700' : 'text-gray-300'}`} />
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
                    placeholder="What were the highlights of your event expedition?"
                    className={`w-full p-5 pr-14 border-2 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[120px] text-base font-medium transition-all ${
                      isDarkMode ? 'bg-transparent border-gray-800 text-white placeholder-gray-500' : 'bg-white border-gray-100 text-gray-900'
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
                          ? 'bg-transparent border-gray-800 hover:border-emerald-500 hover:bg-emerald-500/5' 
                          : 'bg-gray-55 border-gray-200 hover:border-emerald-500 hover:bg-emerald-50'
                      }`}>
                        <Camera className="text-gray-500 mb-1" size={24} />
                        <span className="text-[10px] font-bold text-gray-550 uppercase">Add Photo</span>
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
                      {isSubmittingReview ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send size={18} />
                      )}
                      {editingReviewId ? 'UPDATE REPORT' : 'POST REVIEW'}
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
                        isDarkMode ? 'border-gray-700 text-gray-400 hover:bg-gray-800/30' : 'border-gray-200 text-gray-500 hover:bg-gray-100'
                      } transition-colors active:scale-95`}
                    >
                      CANCEL
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
              <div className={`text-center py-16 rounded-3xl border-2 border-dashed ${isDarkMode ? 'bg-gray-950/20 border-gray-800' : 'bg-gray-50 border-gray-100'}`}>
                <p className={`text-lg font-bold opacity-40 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>No reviews yet. Be the first to attend!</p>
              </div>
            ) : (
              <div className="space-y-8">
                {reviews.map((review) => (
                  <div key={review._id} className={`p-6 rounded-3xl border-2 transition-all ${isDarkMode ? 'bg-gray-950/30 border-gray-800 hover:border-emerald-500/20' : 'bg-white border-gray-50 hover:border-emerald-100'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        {review.userPhoto && review.userPhoto.includes('http') ? (
                          <img 
                            src={normalizeImageUrl(review.userPhoto)} 
                            alt={review.userName} 
                            className="w-12 h-12 rounded-2xl object-cover shadow-lg"
                            onError={(e) => {
                              // If image fails to load, show initials
                              e.currentTarget.style.display = 'none';
                              const initialsDiv = e.currentTarget.nextElementSibling as HTMLElement;
                              if (initialsDiv) initialsDiv.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div 
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg ${
                            isDarkMode ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white'
                          }`}
                          style={{ display: review.userPhoto && review.userPhoto.includes('http') ? 'none' : 'flex' }}
                        >
                          {review.userName?.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2) || 'U'}
                        </div>
                        <div>
                          <div className={`font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{review.userName || 'Anonymous'}</div>
                          <div className={`text-[10px] font-bold uppercase tracking-widest opacity-40 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            AUTHENTICATED EXPLORER • {new Date(review.createdAt).toLocaleDateString()}
                          </div>
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
                              title="Edit Review"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteReview(review._id)}
                              className={`p-2 rounded-xl transition-all ${isDarkMode ? 'bg-gray-800 text-rose-400 hover:bg-gray-700' : 'bg-gray-50 text-rose-600 hover:bg-gray-100'}`}
                              title="Delete Review"
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

                    {/* Like/Dislike buttons */}
                    <div className="flex items-center gap-4 mt-3">
                      <button
                        onClick={() => handleLikeReview(review._id)}
                        className={`flex items-center gap-1.5 text-sm transition-colors ${review.likes?.includes(auth.currentUser?.uid || '')
                          ? 'text-emerald-500 font-bold'
                          : isDarkMode ? 'text-gray-400 hover:text-emerald-500' : 'text-gray-500 hover:text-emerald-600'
                          }`}
                      >
                        <ThumbsUp size={16} className={review.likes?.includes(auth.currentUser?.uid || '') ? 'fill-emerald-500 text-emerald-500' : ''} />
                        <span>{review.likes?.length || 0}</span>
                      </button>
                      <button
                        onClick={() => handleDislikeReview(review._id)}
                        className={`flex items-center gap-1.5 text-sm transition-colors ${review.dislikes?.includes(auth.currentUser?.uid || '')
                          ? 'text-rose-500 font-bold'
                          : isDarkMode ? 'text-gray-400 hover:text-rose-500' : 'text-gray-500 hover:text-rose-600'
                          }`}
                      >
                        <ThumbsDown size={16} className={review.dislikes?.includes(auth.currentUser?.uid || '') ? 'fill-rose-500 text-rose-500' : ''} />
                        <span>{review.dislikes?.length || 0}</span>
                      </button>
                    </div>

                    {review.reply && (
                      <div className={`mt-6 rounded-2xl p-5 border-l-4 border-emerald-500 ${isDarkMode ? 'bg-emerald-950/20 text-emerald-400 border-emerald-800' : 'bg-emerald-50/50 text-emerald-800'}`}>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">Organizer Response</div>
                        <p className="text-sm font-medium italic">
                          "{typeof review.reply === 'object' ? review.reply.text : review.reply}"
                        </p>
                      </div>
                    )}

                    {/* Nested Sub-reviews Timeline */}
                    {review.subReviews && review.subReviews.length > 0 && (
                      <div className="mt-6 pl-4 border-l-2 border-emerald-500/20 space-y-6">
                        <div className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} mb-2`}>
                          Subsequent Event Visits ({review.subReviews.length})
                        </div>
                        {review.subReviews.map((sub: any, sIdx: number) => (
                          <div key={sub._id || sIdx} className="relative pl-6 before:absolute before:left-0 before:top-2 before:w-2 before:h-2 before:rounded-full before:bg-emerald-500">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                                  isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                }`}>
                                  Visit #{sIdx + 2}
                                </span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider opacity-40 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                  {new Date(sub.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <StarRating rating={sub.rating} size={11} />
                                {localStorage.getItem('userData') && JSON.parse(localStorage.getItem('userData')!).uid === review.userId && (
                                  <div className="flex items-center gap-1.5">
                                    <button 
                                      onClick={() => handleEditReview({
                                        ...sub,
                                        _id: sub._id,
                                        userId: review.userId,
                                        userName: review.userName,
                                        userPhoto: review.userPhoto
                                      })}
                                      className={`p-1.5 rounded-lg transition-all ${isDarkMode ? 'bg-gray-800 text-emerald-400 hover:bg-gray-700' : 'bg-gray-50 text-emerald-600 hover:bg-gray-100'}`}
                                      title="Edit this visit review"
                                    >
                                      <Edit2 size={11} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteReview(sub._id)}
                                      className={`p-1.5 rounded-lg transition-all ${isDarkMode ? 'bg-gray-800 text-rose-400 hover:bg-gray-700' : 'bg-gray-50 text-rose-600 hover:bg-gray-100'}`}
                                      title="Delete this visit review"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <p className={`text-sm font-medium leading-relaxed mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{sub.comment}</p>
                            
                            {/* Sub-review Images */}
                            {sub.images && sub.images.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-2">
                                {sub.images.map((img: string, idx: number) => (
                                  <div 
                                    key={idx} 
                                    className="relative group cursor-zoom-in w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border border-transparent hover:border-emerald-500 transition-all"
                                    onClick={() => setActiveLightbox({ 
                                      images: sub.images, 
                                      index: idx,
                                      comment: sub.comment,
                                      userName: `${review.userName} (Visit #${sIdx + 2})`
                                    })}
                                  >
                                    <img 
                                      src={normalizeImageUrl(img)} 
                                      alt={`Sub review ${idx}`} 
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <Maximize2 className="text-white" size={14} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lightbox Modal */}
        {activeLightbox && (
          <div className="fixed inset-0 bg-black/90 z-50 flex flex-col justify-between p-4 md:p-8 animate-fade-in backdrop-blur-md">
            <button 
              onClick={() => setActiveLightbox(null)}
              className="absolute top-4 right-4 md:top-8 md:right-8 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all hover:scale-110 active:scale-95"
            >
              <X size={24} />
            </button>
            <div className="flex-1 flex items-center justify-center min-h-0 relative">
              <button 
                onClick={() => setActiveLightbox({ ...activeLightbox, index: (activeLightbox.index - 1 + activeLightbox.images.length) % activeLightbox.images.length })}
                className="absolute left-0 md:left-4 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all hover:scale-110 active:scale-95"
              >
                &larr;
              </button>
              <img 
                src={normalizeImageUrl(activeLightbox.images[activeLightbox.index])} 
                alt="Enlarged review" 
                className="max-w-full max-h-[70vh] md:max-h-[75vh] object-contain rounded-3xl shadow-2xl border border-white/10"
              />
              <button 
                onClick={() => setActiveLightbox({ ...activeLightbox, index: (activeLightbox.index + 1) % activeLightbox.images.length })}
                className="absolute right-0 md:right-4 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all hover:scale-110 active:scale-95"
              >
                &rarr;
              </button>
            </div>
            
            {activeLightbox.comment && (
              <div className="max-w-3xl mx-auto w-full text-center bg-white/5 border border-white/10 backdrop-blur-md p-6 rounded-3xl mb-4">
                {activeLightbox.userName && (
                  <div className="mb-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 text-emerald-400">Scout: {activeLightbox.userName}</span>
                  </div>
                )}
                <p className="text-white text-base font-semibold leading-relaxed">
                  "{activeLightbox.comment}"
                </p>
              </div>
            )}
            
            <div className="flex justify-center gap-3 overflow-x-auto py-2">
              {activeLightbox.images.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveLightbox({ ...activeLightbox, index: idx })}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
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
    </div >
  );
};

export default EventRegistration;
