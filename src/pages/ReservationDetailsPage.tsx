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
import { DinoStepper } from '../components/DinoStepper';
import mixpanel from 'mixpanel-browser';

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
        
        // Mixpanel Tracking
        mixpanel.track('Purchase', {
          'item_id': restaurant?.id || id,
          'item_name': restaurant?.name || searchParams.get('restaurantName') || searchParams.get('eventName'),
          'item_type': type,
          'amount': getTotalPrice() || parseFloat(searchParams.get('eventPrice') || '0'),
          'currency': 'INR',
          'guests': bookingData.guests,
          'date': bookingData.date,
          'time': bookingData.time
        });

        mixpanel.track('Conversion', {
          'type': 'booking',
          'category': type
        });

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
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-gray-950' : 'bg-gradient-to-b from-gray-50 to-gray-100'}`}>
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
            className={`rounded-[3rem] p-12 max-w-md w-full mx-4 shadow-2xl relative z-10 text-center border-2 ${
              isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-white'
            }`}
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
              className={`text-3xl font-black tracking-tight mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              {type === 'restaurant' ? 'Mission Success!' : 'Registration Complete!'}
            </motion.h3>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className={`text-sm font-bold leading-relaxed mb-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
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
            <p className={`text-[10px] font-black uppercase tracking-widest mt-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Redirecting to dashboard...</p>
          </motion.div>
        </div>
      )}

      {/* Back Navigation */}
      <div className="absolute top-4 left-4 z-30">
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center gap-3 px-6 py-3 backdrop-blur-xl rounded-[2rem] shadow-2xl transition-all font-black uppercase tracking-widest text-[10px] active:scale-95 border-2 ${
            isDarkMode ? 'bg-black/60 border-white/10 text-white hover:bg-black/80' : 'bg-white/90 border-transparent text-gray-700 hover:bg-white'
          }`}
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
      </div>

      <div className="max-w-3xl mx-auto pt-24 px-4 pb-12 space-y-12">
        <DinoStepper currentStep={4} />
        <div className={`rounded-[3rem] shadow-2xl overflow-hidden transition-all border-2 ${
          isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-white'
        }`}>
          {/* Header */}
          <div className={`p-10 ${isDarkMode ? 'bg-gradient-to-r from-gray-800 to-gray-900' : 'bg-gradient-to-r from-emerald-600 to-emerald-500'} text-white`}>
            <h1 className="text-3xl md:text-4xl font-black mb-4 tracking-tight leading-none">
              {type === 'restaurant' ? 'Final Confirmation' : 'Confirm Registration'}
            </h1>
            {type === 'restaurant' && restaurant?.name && (
              <p className="text-lg font-bold opacity-80 mb-2 uppercase tracking-widest">{restaurant.name}</p>
            )}
            <p className="text-sm font-medium opacity-60">
              {type === 'restaurant'
                ? 'Review your mission summary before final engagement.'
                : 'Review your registration details before confirming.'}
            </p>
          </div>

          {/* Restaurant/Event Info */}
          <div className="p-10">
            <div className={`flex items-center gap-8 mb-12 p-6 rounded-[2rem] border-2 transition-all ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'
            }`}>
              <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0">
                <img
                  src={type === 'restaurant' ? restaurant?.image : searchParams.get('eventImage') || ''}
                  alt={type === 'restaurant' ? restaurant?.name : searchParams.get('eventName') || 'Event'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className={`text-2xl font-black tracking-tight mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {type === 'restaurant' ? restaurant?.name : searchParams.get('eventName')}
                </h2>
                {type === 'restaurant' ? (
                  <div className={`flex items-center gap-2 text-sm font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <MapPin size={16} className="text-emerald-500" />
                    <span>{restaurant?.location.city}, {restaurant?.location.state}</span>
                  </div>
                ) : (
                  <div className={`flex items-center gap-2 text-sm font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <Calendar size={16} className="text-emerald-500" />
                    <span>{searchParams.get('date')} at {searchParams.get('time')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Reservation/Registration Details */}
            <div className={`border-t-2 border-b-2 py-10 mb-10 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
              <h3 className={`text-lg font-black uppercase tracking-widest mb-6 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                {type === 'restaurant' ? 'Reservation Manifest' : 'Event Manifest'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div className={`p-5 rounded-2xl border-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-50'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Date</p>
                  <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{searchParams.get('date')}</p>
                </div>
                <div className={`p-5 rounded-2xl border-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-50'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Time</p>
                  <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{searchParams.get('time')}</p>
                </div>
                {type === 'restaurant' && (
                  <div className={`p-5 rounded-2xl border-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-50'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Personnel</p>
                    <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{searchParams.get('guests')} Guests</p>
                  </div>
                )}
                {type === 'event' && (
                  <>
                    <div className={`p-5 rounded-2xl border-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-50'}`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Category</p>
                      <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{searchParams.get('eventCategory')}</p>
                    </div>
                    <div className={`p-5 rounded-2xl border-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-50'}`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Valuation</p>
                      <p className={`font-bold text-emerald-500`}>₹{searchParams.get('eventPrice')}</p>
                    </div>
                    <div className={`p-5 rounded-2xl border-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-50'}`}>
                      <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Organizer</p>
                      <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{searchParams.get('eventOrganizer')}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Guest Details */}
            <div className="mb-10">
              <h3 className={`text-lg font-black uppercase tracking-widest mb-6 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                Personnel Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`p-5 rounded-2xl border-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-50'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Full Name</p>
                  <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{searchParams.get('fullName')}</p>
                </div>
                <div className={`p-5 rounded-2xl border-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-50'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Email</p>
                  <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{searchParams.get('email')}</p>
                </div>
                <div className={`p-5 rounded-2xl border-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-50'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Phone Number</p>
                  <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{searchParams.get('phoneNumber')}</p>
                </div>
                {searchParams.get('occasion') && (
                  <div className={`p-5 rounded-2xl border-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-50'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Occasion</p>
                    <p className={`font-bold capitalize ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{searchParams.get('occasion')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Special Requests */}
            {searchParams.get('specialRequest') && (
              <div className="mb-10">
                <h3 className={`text-lg font-black uppercase tracking-widest mb-6 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Mission Intel
                </h3>
                <div className={`p-6 rounded-[2rem] border-2 transition-all ${
                  isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-100 text-gray-600'
                }`}>
                  <p className="text-sm font-bold leading-relaxed">{searchParams.get('specialRequest')}</p>
                </div>
              </div>
            )}

            {/* Selected Menu Items */}
            <div className={`mt-10 pt-10 border-t-2 ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <h3 className={`text-xl font-black uppercase tracking-widest flex items-center gap-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  Provisioning Details
                </h3>
                <div className="text-right">
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Total Valuation</p>
                  <p className="text-2xl font-black text-emerald-500">₹{getTotalPrice()}</p>
                </div>
              </div>
              
              <div className={`rounded-[2rem] p-8 border-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-50'}`}>
                <div className="space-y-4">
                  {Object.entries(selectedMenuItems).map(([itemId, count]) => {
                    const item = restaurant?.menu?.find(m => m.id === itemId);
                    if (!item) return null;
                    return (
                      <div key={itemId} className={`flex items-center gap-6 p-4 rounded-2xl border-2 transition-all ${
                        isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-white shadow-sm'
                      }`}>
                        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-lg font-black truncate mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.name}</h4>
                          <div className="flex items-center gap-4">
                            <p className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">{count}X</p>
                            <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>₹{item.price} each</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{item.price * count}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Confirmation Button */}
            <div className="flex flex-col gap-6 mt-12">
              {/* Wallet Actions */}
              <div className={`rounded-[2rem] p-8 border-2 transition-all ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-emerald-50 border-emerald-100'
              }`}>
                <h3 className={`text-lg font-black uppercase tracking-widest mb-6 flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-emerald-900'}`}>
                  <CreditCard className="w-5 h-5 text-emerald-500" />
                  Digital Protocols
                </h3>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={handleAddToAppleWallet}
                    className="flex items-center gap-3 px-6 py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-900 transition-all active:scale-95 shadow-xl"
                  >
                    <Apple className="w-4 h-4" />
                    Apple Wallet
                  </button>
                  <button
                    onClick={handleAddToGoogleWallet}
                    className="flex items-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all active:scale-95 shadow-xl"
                  >
                    <Chrome className="w-4 h-4" />
                    Google Wallet
                  </button>
                  <button
                    onClick={handleGenerateInvoice}
                    className="flex items-center gap-3 px-6 py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-600 transition-all active:scale-95 shadow-xl"
                  >
                    <FileText className="w-4 h-4" />
                    Invoice Memo
                  </button>
                </div>
              </div>

              {/* Confirm Button */}
              <div className="flex justify-end pt-6">
                <button
                  onClick={handleConfirmReservation}
                  disabled={isConfirming}
                  className={`group relative py-5 px-16 rounded-[2rem] font-black uppercase tracking-widest text-sm transition-all shadow-2xl active:scale-95 overflow-hidden ${
                    isConfirming
                      ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      : 'bg-black text-white hover:bg-gray-900'
                    }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <span className="relative flex items-center justify-center gap-4">
                    {isConfirming ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Processing engagement...</span>
                      </>
                    ) : (
                      <>
                        <span>{type === 'restaurant' ? 'Initiate Engagement' : 'Confirm Registration'}</span>
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </span>
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