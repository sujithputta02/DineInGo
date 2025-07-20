import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { bookingsApi } from '../services/api';
import { toast } from 'react-hot-toast';
import UserActivityFeed from '../components/UserActivityFeed';
import Notifications from '../components/Notifications';
import WalletSection from '../components/WalletSection';
import EmailTestButton from '../components/EmailTestButton';
import Header from '../components/Header';
import { UserData } from '../types';
import dayjs from 'dayjs';
import { CreditCard, FileText, Apple, Chrome } from 'lucide-react';
import { walletService } from '../services/walletService';
import { useLocation, useNavigate } from 'react-router-dom';

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
  const [isLoading, setIsLoading] = useState(false);
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
    // Set up an interval to refresh bookings periodically
    const intervalId = setInterval(() => {
      if (auth.currentUser && activeSection === 'bookings') {
        console.log('Auto-refreshing bookings from API...');
    fetchBookingsFromAPI();
      }
    }, 30000);
    return () => clearInterval(intervalId);
  }, [location, auth.currentUser, activeSection]);

  const handleConfirm = async (bookingId: string) => {
    setConfirmingId(bookingId);
    try {
      await bookingsApi.update(bookingId, { status: 'confirmed' });
      toast.success('Booking confirmed!');
      fetchBookingsFromAPI();
    } catch (error) {
      toast.error('Failed to confirm booking.');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCancel = async (booking: any) => {
    setCancellingId(booking._id);
    try {
      // Call cancel API (adjust endpoint as needed)
      await bookingsApi.cancelTable({
        restaurantId: booking.restaurantId?._id || booking.restaurantId,
        tableId: booking.tableId,
        date: booking.date,
        time: booking.time,
        userId: booking.userId
      });
      toast.success('Booking cancelled!');
      fetchBookingsFromAPI();
    } catch (error) {
      toast.error('Failed to cancel booking.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleAddToAppleWallet = async (booking: any) => {
    try {
      const { passUrl } = await walletService.generateAppleWalletPass(booking);
      
      // Create a temporary link to download the pass
      const link = document.createElement('a');
      link.href = passUrl;
      link.download = `dineingo-booking-${booking.id || booking._id}.pkpass`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Apple Wallet pass generated!');
    } catch (error) {
      console.error('Error generating Apple Wallet pass:', error);
      toast.error('Failed to generate Apple Wallet pass');
    }
  };

  const handleAddToGoogleWallet = async (booking: any) => {
    try {
      const { passUrl } = await walletService.generateGoogleWalletPass(booking);
      
      // Open Google Wallet in a new tab
      window.open(passUrl, '_blank');
      
      toast.success('Google Wallet pass generated!');
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
                    const type = booking.restaurantId ? 'Restaurant' : booking.eventId ? 'Event' : '';
                    const canCancel = booking.status === 'confirmed' && dayjs().isBefore(dayjs(`${booking.date} ${booking.time}`).subtract(1, 'hour'));
                    
                    return (
                      <div key={booking._id} className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div className="flex-1">
                            <div className="text-lg font-semibold">{name}</div>
                            <div className="text-gray-500 text-sm mb-2">{type}</div>
                            <div className="text-gray-700">Date: {new Date(booking.date).toLocaleDateString()} | Time: {booking.time}</div>
                            <div className="text-gray-700">Guests: {booking.numberOfGuests}</div>
                            <div className="text-gray-700">Status: <span className={
                              booking.status === 'pending' ? 'text-yellow-600' : booking.status === 'confirmed' ? 'text-green-600' : 'text-red-600'
                            }>{booking.status}</span></div>
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
                                <button
                                  className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
                                  onClick={() => handleConfirm(booking._id)}
                                  disabled={confirmingId === booking._id}
                                >
                                  {confirmingId === booking._id ? 'Confirming...' : 'Confirm'}
                                </button>
                              )}
                              {canCancel && (
                                <button
                                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
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