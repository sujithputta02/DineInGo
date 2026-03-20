import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Clock, Users, MapPin, Loader, ArrowLeft, Heart, CheckCircle, MessageSquare, Star, Send, ThumbsUp, ThumbsDown } from 'lucide-react';
import { toast } from 'react-toastify';
import SeatingChart from '../components/SeatingChart';
import IndividualSeatingChart from '../components/IndividualSeatingChart';
import EventSeatingViewer from '../components/EventSeatingViewer';
import StarRating from '../components/StarRating';
import EmojiPicker from '../components/EmojiPicker';
import { seatsToRows } from '../utils/seatUtils';
import { Seat, SeatingLayout } from '../types/seating';
import { io, Socket } from 'socket.io-client';

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
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);


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
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001');
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/v1/events/${id}`);

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
            `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/v1/events/${id}/recalculate-areas`,
            { method: 'POST' }
          );
          // Re-fetch with fresh counts
          const fresh = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/v1/events/${id}`);
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/v1/events/${id}/reviews`);
      const data = await response.json();
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/v1/events/reviews/${reviewId}/like`, {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/v1/events/reviews/${reviewId}/dislike`, {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/v1/events/${id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: auth.currentUser.uid,
          userName: auth.currentUser.displayName || 'Anonymous',
          userPhoto: auth.currentUser.photoURL,
          rating: newRating,
          comment: newComment
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.message && data.message.includes('updated')) {
          toast.success('Review updated successfully!');
        } else {
          toast.success('Review submitted successfully!');
        }
        setNewRating(0);
        setNewComment('');
        fetchReviews();
      } else {
        const error = await response.json();
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Event not found</h2>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/events')}
              className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600"
            >
              Browse Events
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-emerald-500 hover:text-emerald-600 px-6 py-2 border border-emerald-500 rounded-lg"
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
    <div className="min-h-screen bg-gray-50 py-4 md:py-8">
      <div className="max-w-4xl mx-auto px-3 md:px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 md:mb-6 min-h-[44px] min-w-[44px]"
        >
          <ArrowLeft size={20} />
          <span className="text-sm md:text-base">Back</span>
        </button>

        {/* Event Details Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Event Image */}
          <div className="h-40 md:h-56 lg:h-64 bg-gradient-to-r from-emerald-500 to-emerald-600 relative">
            {event.imageUrl && (
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-end">
              <div className="p-3 md:p-4 lg:p-6 text-white w-full">
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-1 md:mb-2">{event.title}</h1>
                <p className="text-xs md:text-sm text-emerald-100">{event.category}</p>
              </div>
            </div>
          </div>

          <div className="p-3 md:p-4 lg:p-6">
            {/* Event Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="text-emerald-500" size={20} />
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-semibold">{new Date(event.date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="text-emerald-500" size={20} />
                <div>
                  <p className="text-sm text-gray-500">Time</p>
                  <p className="font-semibold">{event.time}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="text-emerald-500" size={20} />
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-semibold">{event.location}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Users className="text-emerald-500" size={20} />
                <div>
                  <p className="text-sm text-gray-500">Availability</p>
                  <p className="font-semibold">
                    {spotsLeft} / {event.capacity} spots left
                  </p>
                </div>
              </div>
            </div>

            {/* Add to Favorites Button */}
            <button
              onClick={toggleFavorite}
              disabled={favoriteLoading}
              className={`w-full mb-4 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${isFavorite
                ? 'bg-red-50 text-red-600 border-2 border-red-600 hover:bg-red-100'
                : 'bg-white text-emerald-600 border-2 border-emerald-600 hover:bg-emerald-50'
                }`}
            >
              {favoriteLoading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Heart className={isFavorite ? 'fill-current' : ''} size={20} />
                  {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                </>
              )}
            </button>

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
                      <div className="mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                        <h4 className="font-semibold text-emerald-800 mb-2">Number of Guests:</h4>
                        <select
                          value={numberOfGuests}
                          onChange={(e) => setNumberOfGuests(Number(e.target.value))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                      <div className="mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                        <h4 className="font-semibold text-emerald-800 mb-2">Selected Seats:</h4>
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
                    <h3 className="text-lg font-semibold mb-4">Select Tickets</h3>
                    <div className="space-y-4">
                      {event.tickets.map(ticket => (
                        <div key={ticket._id} className="flex justify-between items-center p-4 border rounded-lg hover:border-emerald-500 transition bg-white">
                          <div>
                            <h4 className="font-semibold">{ticket.name}</h4>
                            <p className="text-sm text-gray-500">{ticket.description}</p>
                            <p className="text-emerald-600 font-bold mt-1">₹{ticket.price}</p>
                            <p className={`text-xs mt-1 ${ticket.quantity - ticket.sold > 0 ? 'text-gray-500' : 'text-red-500 font-medium'}`}>
                              {ticket.quantity - ticket.sold > 0 ? `${ticket.quantity - ticket.sold} left` : 'Sold Out'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => updateTicketQuantity(ticket._id, -1)}
                              disabled={!selectedTickets[ticket._id]}
                              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-50"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-semibold">{selectedTickets[ticket._id] || 0}</span>
                            <button
                              onClick={() => updateTicketQuantity(ticket._id, 1, ticket.quantity - ticket.sold)}
                              disabled={ticket.quantity - ticket.sold <= (selectedTickets[ticket._id] || 0)}
                              className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200 disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-400"
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
                    <label className="block text-sm font-semibold mb-2 mt-4">Number of Guests</label>
                    <select
                      value={numberOfGuests}
                      onChange={(e) => setNumberOfGuests(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              <div className="mb-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Add-on Services</h3>
                <div className="space-y-4">
                  {event.addOns.map(addon => (
                    <div key={addon._id} className="flex justify-between items-center p-4 border rounded-lg hover:border-emerald-500 transition bg-white">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{addon.name}</h4>
                          {addon.isRequired && <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Required</span>}
                        </div>
                        <p className="text-sm text-gray-500">{addon.description}</p>
                        <p className="text-emerald-600 font-bold mt-1">₹{addon.price}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateAddOnQuantity(addon._id, -1)}
                          disabled={!selectedAddOns[addon._id]}
                          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 disabled:opacity-50"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-semibold">{selectedAddOns[addon._id] || 0}</span>
                        <button
                          onClick={() => updateAddOnQuantity(addon._id, 1)}
                          className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200"
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
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
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
                            <span className="text-gray-600">Selected Area</span>
                            <span className="font-semibold">{selectedArea?.name || selectedArea?.label || 'Area'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Guests</span>
                            <span className="font-semibold">{numberOfGuests}</span>
                          </div>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                            <span className="font-semibold">Total</span>
                            <span className="text-2xl font-bold text-emerald-600">
                              ₹{(selectedArea?.price || 0) * numberOfGuests}
                            </span>
                          </div>
                        </>
                      );
                    } else {
                      return (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-600">Selected Seats</span>
                            <span className="font-semibold">{selectedSeatIds.length}</span>
                          </div>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                            <span className="font-semibold">Total</span>
                            <span className="text-2xl font-bold text-emerald-600">
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
                            <span className="text-gray-600">{ticket?.name} x {qty}</span>
                            <span>₹{(ticket?.price || 0) * qty}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Price per person</span>
                        <span className="font-semibold">₹{event.price}</span>
                      </div>
                    )}

                    {/* Add-on Summary */}
                    {Object.keys(selectedAddOns).map(addOnId => {
                      const qty = selectedAddOns[addOnId];
                      if (qty === 0) return null;
                      const addon = event.addOns?.find(a => a._id === addOnId);
                      return (
                        <div key={addOnId} className="flex justify-between text-sm text-gray-500">
                          <span>+ {addon?.name} x {qty}</span>
                          <span>₹{(addon?.price || 0) * qty}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                    <span className="font-semibold">Total</span>
                    <span className="text-2xl font-bold text-emerald-600">
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
              className="w-full bg-emerald-500 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        <div className="bg-white rounded-2xl shadow-lg mt-8">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <MessageSquare className="text-emerald-500" size={24} />
                Event Reviews
              </h2>
              <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl">
                {(() => {
                  const avgRating = reviews.length > 0
                    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                    : 0;
                  return avgRating > 0 ? (
                    <>
                      <StarRating rating={avgRating} size={20} />
                      <span className="text-xl font-bold text-emerald-900">{avgRating.toFixed(1)}</span>
                    </>
                  ) : null;
                })()}
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
                          <Star size={28} className="text-emerald-400 fill-emerald-400" />
                        ) : (hoverRating || newRating) >= star - 0.5 ? (
                          <div className="relative">
                            <Star size={28} className="text-gray-300" />
                            <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                              <Star size={28} className="text-emerald-400 fill-emerald-400" />
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
                    placeholder="Tell us about your experience at this event..."
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
                <p className="text-gray-500">No reviews yet. Be the first to attend!</p>
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

                    {/* Like/Dislike buttons */}
                    <div className="flex items-center gap-4 mt-3">
                      <button
                        onClick={() => handleLikeReview(review._id)}
                        className={`flex items-center gap-1 text-sm transition-colors ${review.likes?.includes(auth.currentUser?.uid || '')
                          ? 'text-emerald-600 font-semibold'
                          : 'text-gray-500 hover:text-emerald-600'
                          }`}
                      >
                        <ThumbsUp size={16} className={review.likes?.includes(auth.currentUser?.uid || '') ? 'fill-emerald-600' : ''} />
                        <span>{review.likes?.length || 0}</span>
                      </button>
                      <button
                        onClick={() => handleDislikeReview(review._id)}
                        className={`flex items-center gap-1 text-sm transition-colors ${review.dislikes?.includes(auth.currentUser?.uid || '')
                          ? 'text-red-600 font-semibold'
                          : 'text-gray-500 hover:text-red-600'
                          }`}
                      >
                        <ThumbsDown size={16} className={review.dislikes?.includes(auth.currentUser?.uid || '') ? 'fill-red-600' : ''} />
                        <span>{review.dislikes?.length || 0}</span>
                      </button>
                    </div>

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
      </div>
    </div >
  );
};

export default EventRegistration;
