import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Clock, Users, MapPin, Loader, ArrowLeft, Heart } from 'lucide-react';
import { toast } from 'react-toastify';
import SeatingChart from '../components/SeatingChart';
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

  const fetchEvent = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${id}`);

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
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Failed to load event details. Redirecting to events page...');
      setTimeout(() => navigate('/events'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const checkIfFavorite = async () => {
    if (!auth.currentUser) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/favorites/${auth.currentUser.uid}`);
      const data = await response.json();

      if (data.favorites) {
        const isFav = data.favorites.some((fav: any) => fav.eventId === id);
        setIsFavorite(isFav);
      }
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

    if (!event) return;

    setFavoriteLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: auth.currentUser.uid,
          eventId: event._id,
          type: 'event'
        })
      });

      const data = await response.json();

      if (response.ok) {
        setIsFavorite(!isFavorite);
        toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
      } else {
        throw new Error(data.message || 'Failed to update favorites');
      }
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
      const selectedSeats = event.seatingLayout.seats.filter(seat =>
        selectedSeatIds.includes(seat.id)
      );
      totalAmount = selectedSeats.reduce((sum, seat) => sum + seat.price, 0);
      finalGuests = selectedSeatIds.length;
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        {/* Event Details Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Event Image */}
          <div className="h-64 bg-gradient-to-r from-emerald-500 to-emerald-600 relative">
            {event.imageUrl && (
              <img
                src={event.imageUrl}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-end">
              <div className="p-6 text-white">
                <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
                <p className="text-emerald-100">{event.category}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Event Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                <div className="bg-gray-950 rounded-lg p-4">
                  <SeatingChart
                    layout={seatsToRows(event.seatingLayout.seats)}
                    selectedSeatIds={selectedSeatIds}
                    onSeatClick={handleSeatClick}
                  />
                </div>

                {/* Selected Seats Summary */}
                {selectedSeatIds.length > 0 && (
                  <div className="mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                    <h4 className="font-semibold text-emerald-800 mb-2">Selected Seats:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedSeatIds.map(seatId => {
                        const seat = event.seatingLayout!.seats.find(s => s.id === seatId);
                        return seat ? (
                          <span key={seatId} className="px-3 py-1 bg-emerald-600 text-white rounded-full text-sm">
                            {seat.id} ({seat.tier}) - ₹{seat.price}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (

              <div className="mb-6">
                {event.tickets && event.tickets.length > 0 ? (
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
                ) : (
                  <>
                    <label className="block text-sm font-semibold mb-2">Number of Guests</label>
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
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Selected Seats</span>
                    <span className="font-semibold">{selectedSeatIds.length}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200">
                    <span className="font-semibold">Total</span>
                    <span className="text-2xl font-bold text-emerald-600">
                      ₹{event.seatingLayout.seats
                        .filter(seat => selectedSeatIds.includes(seat.id))
                        .reduce((sum, seat) => sum + seat.price, 0)}
                    </span>
                  </div>
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
      </div>
    </div >
  );
};

export default EventRegistration;
