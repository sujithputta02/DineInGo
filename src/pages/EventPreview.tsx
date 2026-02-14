import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Clock, Users, MapPin, Loader, ArrowLeft, Ticket, CreditCard } from 'lucide-react';
import { toast } from 'react-toastify';

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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${id}`);
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

  const handleConfirmBooking = async () => {
    if (!auth.currentUser || !event) return;

    // Validate form
    if (!formData.fullName || !formData.email || !formData.phoneNumber) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      const bookingData = {
        userId: auth.currentUser.uid,
        eventId: event._id,
        eventName: event.title,
        date: new Date(event.date).toISOString(),
        time: event.time,
        guests: numberOfGuests,
        status: 'confirmed',
        totalAmount,
        selectedSeats: event.hasSeating ? selectedSeatIds : undefined,
        selectedTickets: selectedTickets.length > 0 ? selectedTickets : undefined,
        selectedAddOns: selectedAddOns.length > 0 ? selectedAddOns : undefined,
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        specialRequest: formData.specialRequest
      };

      console.log('Sending booking data:', bookingData);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookingData)
      });

      const data = await response.json();

      if (response.ok) {
        // Update event (register count and seat status)
        try {
          const updatePayload = event.hasSeating
            ? { seatIds: selectedSeatIds, userId: auth.currentUser.uid }
            : { guests: numberOfGuests };

          const eventResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${event._id}/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatePayload)
          });

          const eventData = await eventResponse.json();

          if (!eventResponse.ok) {
            // Handle conflict - seats were taken by someone else
            if (eventResponse.status === 409) {
              toast.error('Some seats were just booked by another user. Please select different seats.');
              setTimeout(() => {
                navigate(`/event/${event._id}/register`);
              }, 2000);
              return;
            } else if (eventResponse.status === 400) {
              toast.error(eventData.message || 'Not enough spots available');
              setTimeout(() => {
                navigate(`/event/${event._id}/register`);
              }, 2000);
              return;
            }
            throw new Error(eventData.message || 'Failed to register for event');
          }
        } catch (err: any) {
          console.error('Failed to update event:', err);
          toast.error(err.message || 'Failed to complete registration');
          return;
        }

        toast.success('Successfully registered for the event!');
        navigate('/dashboard', {
          state: {
            bookingSuccess: true,
            newBooking: data
          }
        });
      } else {
        console.error('Booking error response:', data);
        throw new Error(data.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Error registering for event:', error);
      toast.error(error.message || 'Failed to register for event');
    } finally {
      setSubmitting(false);
    }
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

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white">
            <h1 className="text-3xl font-bold mb-2">Event Registration Preview</h1>
            <p className="text-purple-100">Please review your booking details before confirming</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Event Details */}
            <div>
              <h2 className="text-xl font-bold mb-4 text-gray-800">Event Details</h2>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Ticket className="text-purple-600 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Event</p>
                    <p className="font-semibold text-gray-800">{event.title}</p>
                    {event.category && (
                      <span className="inline-block mt-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                        {event.category}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="text-purple-600" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-semibold text-gray-800">{new Date(event.date).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="text-purple-600" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Time</p>
                    <p className="font-semibold text-gray-800">{event.time}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="text-purple-600" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-semibold text-gray-800">{event.location}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="text-purple-600" size={20} />
                  <div>
                    <p className="text-sm text-gray-500">Attendees</p>
                    <p className="font-semibold text-gray-800">{numberOfGuests} {numberOfGuests === 1 ? 'Person' : 'People'}</p>
                  </div>
                </div>

                {selectedTickets.length > 0 && (
                  <div className="flex items-start gap-3 border-t border-gray-100 pt-2 mt-2">
                    <Ticket className="text-purple-600 mt-1" size={20} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 mb-1">Tickets</p>
                      <div className="space-y-1">
                        {selectedTickets.map((t: any) => (
                          <div key={t.ticketId} className="flex justify-between text-sm">
                            <span className="text-gray-800">{t.name} x {t.quantity}</span>
                            <span className="font-medium">₹{t.price * t.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {selectedAddOns.length > 0 && (
                  <div className="flex items-start gap-3 border-t border-gray-100 pt-2 mt-2">
                    <CreditCard className="text-purple-600 mt-1" size={20} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500 mb-1">Add-ons</p>
                      <div className="space-y-1">
                        {selectedAddOns.map((a: any) => (
                          <div key={a.addOnId} className="flex justify-between text-sm">
                            <span className="text-gray-800">{a.name} x {a.quantity}</span>
                            <span className="font-medium">₹{a.price * a.quantity}</span>
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
                      <p className="text-sm text-gray-500">Selected Seats</p>
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
              <h2 className="text-xl font-bold mb-4 text-gray-800">Contact Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Special Requests (Optional)
                  </label>
                  <textarea
                    value={formData.specialRequest}
                    onChange={(e) => setFormData({ ...formData, specialRequest: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows={3}
                    placeholder="Any special requests or dietary requirements?"
                  />
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div>
              <h2 className="text-xl font-bold mb-4 text-gray-800">Payment Summary</h2>
              <div className="bg-purple-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">
                    {event.hasSeating ? `${selectedSeatIds.length} Seat${selectedSeatIds.length > 1 ? 's' : ''}` : `${numberOfGuests} Ticket${numberOfGuests > 1 ? 's' : ''}`}
                  </span>
                  <span className="font-semibold">₹{totalAmount}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-purple-200">
                  <span className="font-bold text-lg">Total Amount</span>
                  <span className="font-bold text-2xl text-purple-600">₹{totalAmount}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => navigate(-1)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
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
    </div>
  );
};

export default EventPreview;
