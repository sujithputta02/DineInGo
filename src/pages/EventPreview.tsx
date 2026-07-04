import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../config/api';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Clock, Users, MapPin, Loader, ArrowLeft, Ticket, CreditCard, X, Info, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import mixpanel from 'mixpanel-browser';

interface Event {
  _id: string;
  title: string;
  description?: string;
  date: string;
  startDate?: string;
  endDate?: string;
  time: string;
  location: string;
  capacity: number;
  registeredCount: number;
  price: number;
  imageUrl?: string;
  category?: string;
  organizer?: string;
  hasSeating?: boolean;
  seatingLayout?: any;
}

const EventPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const auth = useAuth();

  const [event, setEvent] = useState<Event | null>(location.state?.event || null);
  const [loading, setLoading] = useState(!location.state?.event);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: auth.currentUser?.displayName || '',
    email: auth.currentUser?.email || '',
    phoneNumber: '',
    specialRequest: ''
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentCardNumber, setPaymentCardNumber] = useState('4242 •••• •••• 4242');
  const [paymentExpiry, setPaymentExpiry] = useState('12/28');
  const [paymentCvv, setPaymentCvv] = useState('***');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
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

  const selectedSeatIds = location.state?.selectedSeatIds || [];
  const numberOfGuests = location.state?.numberOfGuests || parseInt(searchParams.get('guests') || '1');
  const totalAmount = location.state?.totalAmount || 0;
  const selectedTickets = location.state?.selectedTickets || [];
  const selectedAddOns = location.state?.selectedAddOns || [];

  useEffect(() => {
    if (!event && id) {
      fetchEvent();
    }
  }, [id, event]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/events/${id}`);
      if (!response.ok) throw new Error('Failed to fetch event');
      const data = await response.json();
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Failed to load event details');
      navigate(`/event/${id}/register`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = () => {
    if (!auth.currentUser || !event) return;
    if (!formData.fullName || !formData.email || !formData.phoneNumber) {
      toast.error('Please fill in all required fields');
      return;
    }
    setShowPaymentModal(true);
  };

  const executeBookingCompletion = async () => {
    setIsProcessingPayment(true);
    setTimeout(async () => {
      setShowPaymentModal(false);
      setIsProcessingPayment(false);
      setSubmitting(true);

      try {
        const bookingData = {
          userId: auth.currentUser!.uid,
          eventId: event!._id,
          eventName: event!.title,
          date: new Date(event!.date).toISOString(),
          time: event!.time,
          guests: numberOfGuests,
          status: 'confirmed',
          totalAmount,
          selectedSeats: event!.hasSeating ? selectedSeatIds : undefined,
          selectedTickets: selectedTickets.length > 0 ? selectedTickets : undefined,
          selectedAddOns: selectedAddOns.length > 0 ? selectedAddOns : undefined,
          fullName: formData.fullName,
          email: formData.email,
          phoneNumber: formData.phoneNumber,
          specialRequest: formData.specialRequest
        };

        console.log('Sending booking data:', bookingData);

        const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(bookingData)
        });

        const data = await response.json();

        if (response.ok) {
          try {
            const isAreaBooking = event!.hasSeating &&
              event!.seatingLayout?.areas &&
              event!.seatingLayout.areas.length > 0 &&
              selectedSeatIds.length > 0;

            let updatePayload: any;
            if (isAreaBooking) {
              updatePayload = {
                areaId: selectedSeatIds[0],
                guests: numberOfGuests,
                userId: auth.currentUser!.uid
              };
            } else if (event!.hasSeating) {
              updatePayload = { seatIds: selectedSeatIds, userId: auth.currentUser!.uid };
            } else {
              updatePayload = { guests: numberOfGuests };
            }

            const eventResponse = await fetch(`${API_CONFIG.BASE_URL}/api/v1/events/${event!._id}/register`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(updatePayload)
            });

            const eventData = await eventResponse.json();

            if (!eventResponse.ok) {
              if (eventResponse.status === 409) {
                toast.error('Some seats were just booked by another user. Please select different seats.');
                setTimeout(() => {
                  navigate(`/event/${event!._id}/register`);
                }, 2000);
                return;
              } else if (eventResponse.status === 400) {
                toast.error(eventData.message || 'Not enough spots available');
                setTimeout(() => {
                  navigate(`/event/${event!._id}/register`);
                }, 2000);
                return;
              }
              throw new Error(eventData.message || 'Failed to update event seats');
            }
          } catch (err: any) {
            console.error('Error updating event:', err);
            toast.warn('Reservation saved, but seat status update failed. Support has been notified.');
          }

          toast.success('Event booked successfully!');

          mixpanel.track('Purchase', {
            'item_id': event!._id,
            'item_name': event!.title,
            'item_type': 'event',
            'amount': totalAmount,
            'currency': 'INR',
            'guests': numberOfGuests,
            'date': new Date(event!.date).toISOString().split('T')[0],
            'time': event!.time
          });

          mixpanel.track('Conversion', {
            'type': 'booking',
            'category': 'event'
          });

          navigate('/dashboard', {
            state: {
              bookingSuccess: true,
              newBooking: data
            }
          });
        } else {
          throw new Error(data.message || 'Failed to confirm booking');
        }
      } catch (error: any) {
        console.error('Error confirming booking:', error);
        toast.error(error.message || 'Failed to confirm booking. Please try again.');
      } finally {
        setSubmitting(false);
      }
    }, 1500);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <Loader className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-950 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Event not found</h2>
          <button
            onClick={() => navigate('/events')}
            className="bg-emerald-500 text-white px-6 py-2 rounded-lg hover:bg-emerald-600"
          >
            Browse Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 py-8 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <div className="max-w-4xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center gap-2 mb-6 transition-colors ${
            isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className={`rounded-2xl shadow-lg overflow-hidden transition-all border-2 ${
          isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-white'
        }`}>
          {/* Header */}
          <div className={`p-6 text-white ${isDarkMode ? 'bg-gradient-to-r from-purple-900/40 to-purple-800/40' : 'bg-gradient-to-r from-purple-600 to-purple-700'}`}>
            <h1 className="text-3xl font-bold mb-2">Event Registration Preview</h1>
            <p className={isDarkMode ? 'text-purple-300' : 'text-purple-100'}>Please review your booking details before confirming</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Event Details */}
            <div>
              <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Event Details</h2>
              <div className={`rounded-lg p-4 space-y-3 border-2 ${
                isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-100'
              }`}>
                <div className="flex items-start gap-3">
                  <Ticket className="text-purple-600 mt-1" size={20} />
                  <div>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Event</p>
                    <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{event.title}</p>
                    {event.category && (
                      <span className={`inline-block mt-1 px-2 py-1 text-xs rounded ${
                        isDarkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {event.category}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="text-purple-600" size={20} />
                  <div>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Date</p>
                    <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      {event.startDate && event.endDate ? (
                        (() => {
                          const start = new Date(event.startDate);
                          const end = new Date(event.endDate);
                          const isSameDay = start.toDateString() === end.toDateString();

                          if (isSameDay) {
                            return start.toLocaleDateString();
                          } else {
                            const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                            return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (${daysDiff} days)`;
                          }
                        })()
                      ) : (
                        new Date(event.date).toLocaleDateString()
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="text-purple-600" size={20} />
                  <div>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Time</p>
                    <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{event.time}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="text-purple-600" size={20} />
                  <div>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Location</p>
                    <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{event.location}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="text-purple-600" size={20} />
                  <div>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Attendees</p>
                    <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{numberOfGuests} {numberOfGuests === 1 ? 'Person' : 'People'}</p>
                  </div>
                </div>

                {selectedTickets.length > 0 && (
                  <div className={`flex items-start gap-3 border-t pt-2 mt-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <Ticket className="text-purple-600 mt-1" size={20} />
                    <div className="flex-1">
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Tickets</p>
                      <div className="space-y-1">
                        {selectedTickets.map((t: any) => (
                          <div key={t.ticketId} className="flex justify-between text-sm">
                            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-800'}>{t.name} x {t.quantity}</span>
                            <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{t.price * t.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {selectedAddOns.length > 0 && (
                  <div className={`flex items-start gap-3 border-t pt-2 mt-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                    <CreditCard className="text-purple-600 mt-1" size={20} />
                    <div className="flex-1">
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>Add-ons</p>
                      <div className="space-y-1">
                        {selectedAddOns.map((a: any) => (
                          <div key={a.addOnId} className="flex justify-between text-sm">
                            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-800'}>{a.name} x {a.quantity}</span>
                            <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{a.price * a.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {event.hasSeating && selectedSeatIds.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Ticket className="text-purple-600 mt-1" size={20} />
                    <div>
                      <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {event.seatingLayout?.areas && event.seatingLayout.areas.length > 0 ? 'Selected Area' : 'Selected Seats'}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedSeatIds.map((seatId: string) => (
                          <span key={seatId} className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm font-medium">
                            {seatId}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Contact Information</h2>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
                      isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
                      isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
                      isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Special Requests (Optional)
                  </label>
                  <textarea
                    value={formData.specialRequest}
                    onChange={(e) => setFormData({ ...formData, specialRequest: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors ${
                      isDarkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    rows={3}
                    placeholder="Any special requests or dietary requirements?"
                  />
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div>
              <h2 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Payment Summary</h2>
              <div className={`rounded-lg p-4 space-y-2 border-2 ${
                isDarkMode ? 'bg-purple-900/10 border-purple-900/40' : 'bg-purple-50 border-purple-100'
              }`}>
                <div className="flex justify-between items-center">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                    {event.hasSeating
                      ? (event.seatingLayout?.areas && event.seatingLayout.areas.length > 0)
                        ? `${numberOfGuests} Guest${numberOfGuests > 1 ? 's' : ''} (Area)`
                        : `${selectedSeatIds.length} Seat${selectedSeatIds.length > 1 ? 's' : ''}`
                      : `${numberOfGuests} Ticket${numberOfGuests > 1 ? 's' : ''}`}
                  </span>
                  <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₹{totalAmount}</span>
                </div>
                <div className={`flex justify-between items-center pt-2 border-t ${isDarkMode ? 'border-purple-900/40' : 'border-purple-200'}`}>
                  <span className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Total Amount</span>
                  <span className="font-bold text-2xl text-purple-600">₹{totalAmount}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => navigate(-1)}
                className={`flex-1 px-6 py-3 border-2 rounded-lg font-semibold transition-colors ${
                  isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmBooking}
                disabled={submitting || !formData.fullName || !formData.email || !formData.phoneNumber}
                className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard size={20} />
                    Confirm Booking
                  </>
                )}
              </button>
            </div>

            {/* Terms */}
            <div className="text-center text-sm text-gray-500">
              <p>By confirming, you agree to our terms and conditions.</p>
              <p className="mt-1">Cancellations must be made at least 2 hours in advance.</p>
            </div>
          </div>
        </div>
      </div>
      {showPaymentModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !isProcessingPayment && setShowPaymentModal(false)} />
          
          <div className={`relative z-10 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border-2 transition-all duration-300 transform scale-100 ${
            isDarkMode 
              ? 'bg-slate-900 border-slate-800 text-white shadow-black/80' 
              : 'bg-white border-gray-100 text-slate-900 shadow-emerald-500/5'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Checkout Portal</span>
                <h3 className="text-lg font-black uppercase tracking-wider mt-0.5">Stripe Protocol</h3>
              </div>
              <button 
                onClick={() => !isProcessingPayment && setShowPaymentModal(false)}
                className={`p-2 rounded-xl transition-all ${
                  isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-gray-100 text-slate-500'
                }`}
                disabled={isProcessingPayment}
              >
                <X size={20} />
              </button>
            </div>

            {/* Simulated Payment Alert Banner */}
            <div className="mb-5 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-start gap-2 text-left">
              <Info size={16} className="shrink-0 mt-0.5 text-amber-500" />
              <div className="text-[10px]">
                <span className="font-bold">Beta Simulation:</span> Payments are mocked during the DineInGo developer preview. Do not enter real card details.
              </div>
            </div>

            {/* Total summary card */}
            <div className={`p-4 rounded-[1.5rem] mb-5 border ${
              isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-gray-50 border-gray-100'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-400 font-medium">Description</span>
                <span className="text-[10px] text-slate-400 font-medium">Amount</span>
              </div>
              <div className="flex items-start justify-between">
                <div className="text-left">
                  <h4 className="font-bold text-xs line-clamp-1">{event?.title}</h4>
                  <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                    {new Date(event?.date || '').toLocaleDateString()} • {event?.time} • {numberOfGuests} Guests
                  </p>
                </div>
                <span className="font-black text-xs text-emerald-500 whitespace-nowrap">
                  ₹{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Fields */}
            <div className="space-y-3.5 text-left">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Card Number</label>
                <div className="relative">
                  <input
                    type="text"
                    value={paymentCardNumber}
                    onChange={(e) => setPaymentCardNumber(e.target.value)}
                    disabled={isProcessingPayment}
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold tracking-wide transition-all ${
                      isDarkMode
                        ? 'bg-slate-950/50 border-slate-800 focus:border-emerald-500/50 text-white'
                        : 'bg-white border-gray-200 focus:border-emerald-500 text-slate-900'
                    }`}
                  />
                  <CreditCard className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Expiry Date</label>
                  <input
                    type="text"
                    value={paymentExpiry}
                    onChange={(e) => setPaymentExpiry(e.target.value)}
                    disabled={isProcessingPayment}
                    placeholder="MM/YY"
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold tracking-wide transition-all ${
                      isDarkMode
                        ? 'bg-slate-950/50 border-slate-800 focus:border-emerald-500/50 text-white'
                        : 'bg-white border-gray-200 focus:border-emerald-500 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">CVV</label>
                  <input
                    type="password"
                    value={paymentCvv}
                    onChange={(e) => setPaymentCvv(e.target.value)}
                    disabled={isProcessingPayment}
                    placeholder="***"
                    className={`w-full px-4 py-2.5 rounded-xl border text-xs font-semibold tracking-wide transition-all ${
                      isDarkMode
                        ? 'bg-slate-950/50 border-slate-800 focus:border-emerald-500/50 text-white'
                        : 'bg-white border-gray-200 focus:border-emerald-500 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Authorize button */}
            <button
              onClick={executeBookingCompletion}
              disabled={isProcessingPayment}
              className={`w-full mt-6 flex items-center justify-center gap-3 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 border-2 ${
                isProcessingPayment
                  ? 'bg-slate-800 border-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-500 border-emerald-500 text-white shadow-xl shadow-emerald-500/20 hover:bg-emerald-600'
              }`}
            >
              {isProcessingPayment ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Authorizing...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Pay ₹{totalAmount.toFixed(2)}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventPreview;
