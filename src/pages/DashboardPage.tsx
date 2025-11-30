import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { bookingsApi } from '../services/api';
import { toast } from 'react-toastify';
import UserActivityFeed from '../components/UserActivityFeed';
import Notifications from '../components/Notifications';
import WalletSection from '../components/WalletSection';
import EmailTestButton from '../components/EmailTestButton';
import Header from '../components/Header';
import AIChatbot from '../components/AIChatbot';
import { UserData } from '../types';
import dayjs from 'dayjs';
import { CreditCard, FileText, Apple, Chrome, Calendar, Clock, Users, MapPin, Loader } from 'lucide-react';
import { walletService } from '../services/walletService';
import { useLocation, useNavigate } from 'react-router-dom';

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
}

interface DashboardPageProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  userData: UserData;
  setUserData: React.Dispatch<React.SetStateAction<UserData>>;
  handleLogout: () => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({
  isDarkMode,
  toggleDarkMode,
  userData,
  setUserData,
  handleLogout
}) => {
  const auth = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard'); // Default to dashboard

  const fetchBookingsFromAPI = async () => {
    try {
      if (!auth.currentUser) {
        console.error('No authenticated user found');
        setBookings([]);
        return;
      }
      setIsLoading(true);
      try {
        // Fetch bookings from the API
        const fetchedBookings = await bookingsApi.getAll();
        setBookings(fetchedBookings);
      } catch (error) {
        setBookings([]);
        toast.error('Failed to fetch bookings. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      setEventsLoading(true);
      const response = await fetch('http://localhost:5000/api/events');
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const data = await response.json();
      // Ensure we're using the real data from the database
      const eventsData = data.data || data;
      console.log('Fetched events with real counts:', eventsData.map((e: any) => ({
        title: e.title,
        capacity: e.capacity,
        registeredCount: e.registeredCount,
        spotsLeft: e.capacity - (e.registeredCount || 0)
      })));
      setEvents(eventsData);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    const handleBookingSuccess = () => {
      if (location.state?.bookingSuccess) {
        // Show success toast
        if (location.state.newBooking) {
          const bookingName =
            location.state.newBooking.restaurantName ||
            location.state.newBooking.eventName ||
            location.state.newBooking.restaurantId?.name ||
            location.state.newBooking.eventId?.title ||
            'your reservation';
          toast.success(
            `Reservation confirmed at ${bookingName}!`,
            {
              position: "top-center",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
            }
          );
        }
        // Clear the state to prevent showing the toast again on refresh
        navigate(location.pathname, { replace: true, state: {} });
        // Fetch latest bookings from API to ensure we have the most up-to-date data
        fetchBookingsFromAPI();
      }
    };
    // Initial check for booking success when component mounts or location changes
    handleBookingSuccess();
    
    // Fetch events on mount
    fetchEvents();
    
    // Set up an interval to refresh bookings and events periodically
    const intervalId = setInterval(() => {
      if (auth.currentUser) {
        if (activeSection === 'bookings') {
          console.log('Auto-refreshing bookings from API...');
          fetchBookingsFromAPI();
        }
        // Always refresh events to show real-time availability
        console.log('Auto-refreshing events to show real availability...');
        fetchEvents();
      }
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(intervalId);
  }, [location, auth.currentUser, activeSection]);

  const handleConfirm = async (bookingId: string) => {
    setConfirmingId(bookingId);
    try {
      // Update booking status to confirmed
      await bookingsApi.update(bookingId, { status: 'confirmed' });
      
      // Find the booking to get table details
      const booking = bookings.find(b => b._id === bookingId);
      
      // If booking has table information, also update TableBooking collection
      if (booking && booking.table && booking.restaurantId) {
        const restaurantId = booking.restaurantId?._id || booking.restaurantId;
        await bookingsApi.confirmTable({
          restaurantId,
          tableId: booking.table,
          date: booking.date,
          time: booking.time,
          userId: auth.currentUser?.uid || booking.userId
        });
      }
      
      toast.success('Booking confirmed successfully!');
      fetchBookingsFromAPI();
    } catch (error: any) {
      console.error('Failed to confirm booking:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to confirm booking';
      toast.error(errorMessage);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCancel = async (booking: any) => {
    const isEvent = !!(booking.eventId || booking.eventName);
    const bookingType = isEvent ? 'event registration' : 'table booking';
    
    // Confirm cancellation
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel this ${bookingType}? This action cannot be undone.`
    );
    
    if (!confirmCancel) {
      return;
    }

    setCancellingId(booking._id);
    try {
      console.log('Cancelling booking:', booking);
      
      // Check if it's an event booking
      if (isEvent) {
        // For events, just update the booking status
        await bookingsApi.update(booking._id, { status: 'cancelled' });
        
        // Update event registered count
        if (booking.eventId) {
          try {
            const eventId = typeof booking.eventId === 'object' ? booking.eventId._id : booking.eventId;
            await fetch(`http://localhost:5000/api/events/${eventId}/unregister`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ guests: booking.guests || 1 })
            });
          } catch (err) {
            console.error('Failed to update event count:', err);
          }
        }
        
        toast.success('Event registration cancelled successfully!');
      } else {
        // For restaurants, handle table cancellation
        // Format date properly
        let dateStr = booking.date;
        if (booking.date instanceof Date) {
          dateStr = booking.date.toISOString().split('T')[0];
        } else if (typeof booking.date === 'string') {
          if (booking.date.includes('T')) {
            dateStr = booking.date.split('T')[0];
          } else if (booking.date.includes('/')) {
            const parts = booking.date.split('/');
            if (parts.length === 3) {
              const month = parts[0].padStart(2, '0');
              const day = parts[1].padStart(2, '0');
              const year = parts[2];
              dateStr = `${year}-${month}-${day}`;
            }
          }
        }
        
        let restaurantId = booking.restaurantId;
        if (typeof restaurantId === 'object' && restaurantId !== null) {
          restaurantId = restaurantId._id || restaurantId.id;
        }
        
        const tableId = booking.table || booking.tableId || booking.tableNumber;
        
        if (!tableId) {
          // If no table, just update booking status
          await bookingsApi.update(booking._id, { status: 'cancelled' });
          toast.success('Booking cancelled successfully!');
        } else {
          const cancelData = {
            restaurantId: String(restaurantId),
            tableId: String(tableId),
            date: dateStr,
            time: booking.time,
            userId: booking.userId || auth.currentUser?.uid
          };
          
          await bookingsApi.cancelTable(cancelData);
          toast.success('Table booking cancelled successfully!');
        }
      }
      
      // Refresh bookings
      setTimeout(() => {
        fetchBookingsFromAPI();
      }, 500);
      
    } catch (error: any) {
      console.error('Failed to cancel booking:', error);
      
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          'Failed to cancel booking. Please try again.';
      toast.error(errorMessage);
    } finally {
      setCancellingId(null);
    }
  };

  const handleAddToAppleWallet = async (booking: any) => {
    try {
      console.log('Generating Apple Wallet pass for booking:', booking._id);
      const { passUrl, passData } = await walletService.generateAppleWalletPass(booking);
      
      // Create a temporary link to download the pass
      const link = document.createElement('a');
      link.href = passUrl;
      link.download = `DineInGo-Booking-${booking._id || booking.id}.pkpass`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
      setTimeout(() => URL.revokeObjectURL(passUrl), 100);
      
      toast.success('Apple Wallet pass downloaded! Open the file to add to your wallet.');
    } catch (error) {
      console.error('Error generating Apple Wallet pass:', error);
      toast.error('Failed to generate Apple Wallet pass');
    }
  };

  const handleAddToGoogleWallet = async (booking: any) => {
    try {
      console.log('Generating Google Wallet pass for booking:', booking._id);
      const { passUrl } = await walletService.generateGoogleWalletPass(booking);
      
      // Open Google Wallet save URL in a new tab
      const newWindow = window.open(passUrl, '_blank');
      
      if (newWindow) {
        toast.success('Opening Google Wallet... Click "Save to Phone" to add the pass.');
      } else {
        toast.error('Please allow popups to add to Google Wallet');
      }
    } catch (error) {
      console.error('Error generating Google Wallet pass:', error);
      toast.error('Failed to generate Google Wallet pass');
    }
  };

  const handleGenerateInvoice = async (booking: any) => {
    try {
      const invoice = await walletService.generateInvoice(booking);
      
      // Send invoice via email
      await walletService.sendInvoiceEmail(invoice, booking);
      
      toast.success('Invoice generated and sent via email!');
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    }
  };

  return (
    <>
      <Header handleLogout={handleLogout} />
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Notifications */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Latest Updates</h2>
              <Notifications />
            </div>

            {/* Bookings */}
            <div>
              <h2 className="text-2xl font-bold mb-6">My Bookings</h2>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No bookings found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => {
                    const name = booking.restaurantName || booking.eventName || booking.restaurantId?.name || booking.eventId?.title || 'Unknown';
                    const type = booking.restaurantId || booking.restaurantName ? 'Restaurant Booking' : booking.eventId || booking.eventName ? 'Event Registration' : 'Booking';
                    const isEvent = !!(booking.eventId || booking.eventName);
                    // Allow cancellation only if booking is more than 2 hours away
                    const canCancel = booking.status === 'confirmed' && dayjs().isBefore(dayjs(`${booking.date} ${booking.time}`).subtract(2, 'hours'));
                    
                    return (
                      <div key={booking._id} className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="text-lg font-semibold">{name}</div>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                isEvent ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {type}
                              </span>
                            </div>
                            <div className="text-gray-700 text-sm">
                              <span className="font-medium">Date:</span> {new Date(booking.date).toLocaleDateString()} | 
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
                              <span className="font-medium">Status:</span> <span className={
                                booking.status === 'pending' ? 'text-yellow-600 font-semibold' : 
                                booking.status === 'confirmed' ? 'text-green-600 font-semibold' : 
                                'text-red-600 font-semibold'
                              }>{booking.status.toUpperCase()}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            {/* Wallet Actions */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAddToAppleWallet(booking)}
                                className="flex items-center gap-1 px-3 py-1 bg-black text-white rounded text-sm hover:bg-gray-800 transition-colors"
                                title="Add to Apple Wallet"
                              >
                                <Apple className="w-3 h-3" />
                                Apple
                              </button>
                              <button
                                onClick={() => handleAddToGoogleWallet(booking)}
                                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                                title="Add to Google Wallet"
                              >
                                <Chrome className="w-3 h-3" />
                                Google
                              </button>
                              <button
                                onClick={() => handleGenerateInvoice(booking)}
                                className="flex items-center gap-1 px-3 py-1 bg-emerald-500 text-white rounded text-sm hover:bg-emerald-600 transition-colors"
                                title="Generate Invoice"
                              >
                                <FileText className="w-3 h-3" />
                                Invoice
                              </button>
                            </div>
                            
                            {/* Booking Actions */}
                            <div className="flex gap-2">
                              {booking.status === 'pending' && (
                                <>
                                  <button
                                    className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => handleConfirm(booking._id)}
                                    disabled={confirmingId === booking._id || cancellingId === booking._id}
                                  >
                                    {confirmingId === booking._id ? 'Confirming...' : 'Confirm'}
                                  </button>
                                  <button
                                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => handleCancel(booking)}
                                    disabled={cancellingId === booking._id || confirmingId === booking._id}
                                  >
                                    {cancellingId === booking._id ? 'Cancelling...' : 'Cancel'}
                                  </button>
                                </>
                              )}
                              {booking.status === 'confirmed' && canCancel && (
                                <button
                                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  onClick={() => handleCancel(booking)}
                                  disabled={cancellingId === booking._id}
                                >
                                  {cancellingId === booking._id ? 'Cancelling...' : 'Cancel'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Explore Events Section */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Explore Events</h2>
              {eventsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-8 h-8 animate-spin text-emerald-500" />
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No events available at the moment.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.map((event) => {
                    const spotsLeft = event.capacity - (event.registeredCount || 0);
                    
                    return (
                      <div
                        key={event._id}
                        onClick={() => navigate(`/event/${event._id}/register`)}
                        className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer transform transition-all hover:scale-105 hover:shadow-xl"
                      >
                        {/* Event Image */}
                        <div className="h-48 bg-gradient-to-r from-emerald-500 to-emerald-600 relative">
                          {event.imageUrl && (
                            <img
                              src={event.imageUrl}
                              alt={event.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full text-sm font-semibold text-emerald-600">
                            {event.category}
                          </div>
                        </div>

                        {/* Event Details */}
                        <div className="p-6">
                          <h3 className="text-xl font-bold mb-3 text-gray-800">{event.title}</h3>
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar size={16} className="text-emerald-500" />
                              <span className="text-sm">{new Date(event.date).toLocaleDateString()}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-gray-600">
                              <Clock size={16} className="text-emerald-500" />
                              <span className="text-sm">{event.time}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPin size={16} className="text-emerald-500" />
                              <span className="text-sm truncate">{event.location}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-gray-600">
                              <Users size={16} className="text-emerald-500" />
                              <span className="text-sm">{spotsLeft} spots left</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                            <div>
                              <span className="text-2xl font-bold text-emerald-600">₹{event.price}</span>
                              <span className="text-sm text-gray-500 ml-1">per person</span>
                            </div>
                            <button className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-600 transition-colors">
                              Register
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <WalletSection />
            <UserActivityFeed />
            <EmailTestButton />
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardPage; 