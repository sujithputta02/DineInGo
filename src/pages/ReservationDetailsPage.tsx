import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Clock, Users, Check, Info, CreditCard, Apple, Chrome, FileText } from 'lucide-react';
import { getRestaurantById, getMockRestaurantById } from '../services/restaurantService';
import type { Restaurant } from '../types';
import { auth } from '../firebase';
import { bookingsApi } from '../services/api';
import { walletService } from '../services/walletService';
import { toast } from 'react-toastify';

const ReservationDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const type = searchParams.get('type') || 'restaurant';
  const [selectedMenuItems, setSelectedMenuItems] = useState<{ [key: string]: number }>({});
  const [showMenuItems, setShowMenuItems] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Try to fetch restaurant data
        try {
          const data = await getRestaurantById(id || '');
          if (data) {
            setRestaurant(data);
          } else {
            // If API returns null/undefined, try mock data
            const mockData = getMockRestaurantById(id || '');
            if (mockData) {
              console.log('Using mock restaurant data as fallback');
              setRestaurant(mockData);
            } else {
              throw new Error('Restaurant not found');
            }
          }
        } catch (error) {
          console.error('Error:', error);
          // Try mock data as fallback
          const mockData = getMockRestaurantById(id || '');
          if (mockData) {
            console.log('Using mock restaurant data as fallback after API error');
            setRestaurant(mockData);
          } else {
            setError('Failed to fetch restaurant');
          }
        }

        // Parse selected menu items from URL
        const items = searchParams.getAll('items');
        const menuItems: { [key: string]: number } = {};
        items.forEach(item => {
          const [itemId, count] = item.split(':');
          menuItems[itemId] = parseInt(count);
        });
        setSelectedMenuItems(menuItems);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to fetch restaurant');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, type, searchParams]);

  const getTotalPrice = () => {
    if (!restaurant?.menu) return 0;
    return Object.entries(selectedMenuItems).reduce((sum, [itemId, count]) => {
      const item = restaurant.menu?.find(m => m.id === itemId);
      return sum + (item?.price || 0) * count;
    }, 0);
  };

  const handleAddToAppleWallet = async () => {
    try {
      const bookingData = {
        id: `temp-${Date.now()}`,
        restaurantName: restaurant?.name,
        date: searchParams.get('date') || '',
        time: searchParams.get('time') || '',
        numberOfGuests: parseInt(searchParams.get('guests') || '1', 10),
        status: 'confirmed'
      };

      const { passUrl } = await walletService.generateAppleWalletPass(bookingData);

      // Create a temporary link to download the pass
      const link = document.createElement('a');
      link.href = passUrl;
      link.download = `dineingo-booking-${bookingData.id}.pkpass`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Apple Wallet pass generated!');
    } catch (error) {
      console.error('Error generating Apple Wallet pass:', error);
      toast.error('Failed to generate Apple Wallet pass');
    }
  };

  const handleAddToGoogleWallet = async () => {
    try {
      const bookingData = {
        id: `temp-${Date.now()}`,
        restaurantName: restaurant?.name,
        date: searchParams.get('date') || '',
        time: searchParams.get('time') || '',
        numberOfGuests: parseInt(searchParams.get('guests') || '1', 10),
        status: 'confirmed'
      };

      const { passUrl } = await walletService.generateGoogleWalletPass(bookingData);

      // Open Google Wallet in a new tab
      window.open(passUrl, '_blank');

      toast.success('Google Wallet pass generated!');
    } catch (error) {
      console.error('Error generating Google Wallet pass:', error);
      toast.error('Failed to generate Google Wallet pass');
    }
  };

  const handleGenerateInvoice = async () => {
    try {
      const bookingData = {
        id: `temp-${Date.now()}`,
        restaurantName: restaurant?.name,
        date: searchParams.get('date') || '',
        time: searchParams.get('time') || '',
        numberOfGuests: parseInt(searchParams.get('guests') || '1', 10),
        selectedItems: Object.entries(selectedMenuItems).map(([itemId, quantity]) => {
          const item = restaurant?.menu?.find(m => m.id === itemId);
          return item ? { id: itemId, name: item.name, price: item.price, quantity } : null;
        }).filter(Boolean),
        phoneNumber: searchParams.get('phoneNumber') || '',
        specialRequest: searchParams.get('specialRequest') || ''
      };

      const invoice = await walletService.generateInvoice(bookingData);

      // Send invoice via email
      await walletService.sendInvoiceEmail(invoice, bookingData);

      toast.success('Invoice generated and sent via email!');
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    }
  };

  const handleConfirmReservation = () => {
    setIsConfirming(true); // Immediate UI feedback
    setTimeout(async () => {
      try {
        // Get current user
        const user = auth.currentUser;
        if (!user) {
          throw new Error('You must be logged in to make a reservation');
        }
        // Build booking object from reservation details
        const bookingData = {
          restaurantId: restaurant?.id,
          restaurantName: restaurant?.name || searchParams.get('restaurantName') || 'Restaurant',
          date: searchParams.get('date') || '',
          time: searchParams.get('time') || '',
          guests: parseInt(searchParams.get('guests') || '1', 10),
          table: searchParams.get('table') || '',
          specialRequests: searchParams.get('specialRequest') || '',
          fullName: user.displayName || searchParams.get('fullName') || '',
          email: searchParams.get('email') || user.email || '',
          phoneNumber: searchParams.get('phoneNumber') || '',
          selectedItems: Object.entries(selectedMenuItems).map(([itemId, quantity]) => {
            const item = restaurant?.menu?.find(m => m.id === itemId);
            return item ? { id: itemId, name: item.name, price: item.price, quantity } : null;
          }).filter(Boolean),
          totalAmount: getTotalPrice()
        };
        // Save booking through API
        const savedBooking = await bookingsApi.create(bookingData);
        // Confirm the table booking in backend
        if (restaurant?.id && bookingData.table && bookingData.date && bookingData.time) {
          await bookingsApi.confirmTable({
            restaurantId: restaurant.id,
            tableId: bookingData.table,
            date: bookingData.date,
            time: bookingData.time,
            userId: user.uid
          });
        }
        // Show success overlay
        setShowSuccess(true);
        // Redirect to dashboard after a delay
        setTimeout(() => {
          navigate('/dashboard', {
            state: {
              bookingSuccess: true,
              newBooking: savedBooking
            }
          });
        }, 2000);
      } catch (error: any) {
        console.error('Error in booking process:', error);
        toast.error(error.message || 'Failed to save booking. Please try again.');
        setIsConfirming(false);
      }
    }, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Success Overlay */}
      {/* Success Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", duration: 0.8, bounce: 0.4 }}
            className="bg-white rounded-3xl p-10 max-w-md w-full mx-4 shadow-2xl relative z-10 text-center"
          >
            <div className="mx-auto flex items-center justify-center w-24 h-24 mb-6 relative">
              <motion.div
                className="absolute inset-0 bg-emerald-100 rounded-full"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
              />
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center relative z-10 shadow-lg shadow-emerald-200">
                <motion.svg
                  viewBox="0 0 24 24"
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <motion.path
                    d="M20 6L9 17l-5-5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  />
                </motion.svg>
              </div>
            </div>

            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-bold text-gray-900 mb-3"
            >
              {type === 'restaurant' ? 'Reservation Confirmed!' : 'Registration Confirmed!'}
            </motion.h3>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-gray-600 text-lg mb-4 leading-relaxed"
            >
              {type === 'restaurant'
                ? 'Your table has been strictly reserved. Get ready for a premium dining experience.'
                : 'Your spot is secured. We look forward to seeing you there.'}
            </motion.p>

            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ delay: 0.8, duration: 1.5 }}
              className="h-1.5 bg-gray-100 rounded-full overflow-hidden mx-auto w-48"
            >
              <motion.div
                className="h-full bg-emerald-500 rounded-full"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              />
            </motion.div>
            <p className="text-sm text-gray-400 mt-2">Redirecting to dashboard...</p>
          </motion.div>
        </div>
      )}

      {/* Back Navigation */}
      <div className="absolute top-4 left-4 z-30">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm hover:bg-white transition-all duration-300 hover:shadow-md"
        >
          <ArrowLeft size={20} className="text-gray-700" />
          <span className="text-gray-700 font-medium">Back</span>
        </button>
      </div>

      <div className="max-w-3xl mx-auto pt-20 px-4 pb-12">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-8">
            <h1 className="text-3xl font-bold mb-2">
              {type === 'restaurant' ? 'Confirm Your Reservation' : 'Confirm Your Registration'}
            </h1>
            {type === 'restaurant' && restaurant?.name && (
              <p className="text-xl font-semibold text-emerald-100 mb-2">{restaurant.name}</p>
            )}
            <p className="text-emerald-100">
              {type === 'restaurant'
                ? 'Please review your reservation details before confirming.'
                : 'Please review your registration details before confirming.'}
            </p>
          </div>

          {/* Restaurant/Event Info */}
          <div className="p-8">
            <div className="flex items-start gap-6 mb-8 p-4 bg-gray-50 rounded-xl">
              <img
                src={type === 'restaurant' ? restaurant?.image : searchParams.get('eventImage') || ''}
                alt={type === 'restaurant' ? restaurant?.name : searchParams.get('eventName') || 'Event'}
                className="w-24 h-24 rounded-xl object-cover shadow-md"
              />
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {type === 'restaurant' ? restaurant?.name : searchParams.get('eventName')}
                </h2>
                {type === 'restaurant' ? (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin size={16} className="text-emerald-500" />
                    <span>{restaurant?.location.city}, {restaurant?.location.state}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar size={16} className="text-emerald-500" />
                    <span>{searchParams.get('date')} at {searchParams.get('time')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Reservation/Registration Details */}
            <div className="border-t border-b border-gray-200 py-8 mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-500" />
                {type === 'restaurant' ? 'Reservation Details' : 'Event Details'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{searchParams.get('date')}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Time</p>
                  <p className="font-medium">{searchParams.get('time')}</p>
                </div>
                {type === 'restaurant' && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Number of Guests</p>
                    <p className="font-medium">{searchParams.get('guests')}</p>
                  </div>
                )}
                {type === 'event' && (
                  <>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Category</p>
                      <p className="font-medium">{searchParams.get('eventCategory')}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Price</p>
                      <p className="font-medium">₹{searchParams.get('eventPrice')}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Organizer</p>
                      <p className="font-medium">{searchParams.get('eventOrganizer')}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Guest Details */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-500" />
                Guest Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium">{searchParams.get('fullName')}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{searchParams.get('email')}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="font-medium">{searchParams.get('phoneNumber')}</p>
                </div>
                {searchParams.get('occasion') && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Occasion</p>
                    <p className="font-medium capitalize">{searchParams.get('occasion')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Special Requests */}
            {searchParams.get('specialRequest') && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-emerald-500" />
                  Special Requests
                </h3>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <p className="text-gray-600">{searchParams.get('specialRequest')}</p>
                </div>
              </div>
            )}

            {/* Selected Menu Items */}
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-emerald-500" />
                Your Order Details
              </h3>
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Total Items: {Object.keys(selectedMenuItems).length}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-600">Total Amount:</span>
                    <span className="ml-2 font-bold text-lg text-emerald-600">₹{getTotalPrice()}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  {Object.entries(selectedMenuItems).map(([itemId, count]) => {
                    const item = restaurant?.menu?.find(m => m.id === itemId);
                    if (!item) return null;
                    return (
                      <div key={itemId} className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.name}</h4>
                          <p className="text-sm text-gray-600 mb-1">{item.description}</p>
                          <div className="flex items-center gap-4">
                            <p className="text-sm text-gray-600">Quantity: {count}</p>
                            <p className="text-sm text-gray-600">₹{item.price} each</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-emerald-600">₹{item.price * count}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Confirmation Button */}
            <div className="flex flex-col gap-4">
              {/* Wallet Actions */}
              <div className="bg-emerald-50 rounded-xl p-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-500" />
                  Add to Digital Wallet
                </h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleAddToAppleWallet}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <Apple className="w-4 h-4" />
                    Add to Apple Wallet
                  </button>
                  <button
                    onClick={handleAddToGoogleWallet}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Chrome className="w-4 h-4" />
                    Add to Google Wallet
                  </button>
                  <button
                    onClick={handleGenerateInvoice}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Generate Invoice
                  </button>
                </div>
              </div>

              {/* Confirm Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleConfirmReservation}
                  disabled={isConfirming}
                  className={`px-8 py-3 rounded-xl transition-all duration-300 transform ${isConfirming
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-105 hover:shadow-lg'
                    }`}
                >
                  {isConfirming ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Confirming...</span>
                    </div>
                  ) : (
                    type === 'restaurant' ? 'Confirm Reservation' : 'Confirm Registration'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationDetailsPage; 