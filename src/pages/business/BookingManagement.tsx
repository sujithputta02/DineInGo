import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
  Search,
  Download,
  RefreshCw,
  Eye,
  MessageSquare,
  Star,
  DollarSign
} from 'lucide-react';
import { businessApi } from '../../services/api';

// Types for booking management
interface Booking {
  _id: string;
  bookingNumber?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  businessId: string;
  businessName?: string;
  businessType: 'restaurant' | 'event';
  date: string;
  time: string;
  duration?: number;
  seats: number;
  tableNumber?: string;
  seatNumbers?: string[];
  specialRequests?: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'no-show';
  amount: number;
  paymentStatus: 'paid' | 'pending' | 'refunded';
  createdAt: string;
  updatedAt: string;
  rating?: number;
  review?: string;
}

interface BookingFilters {
  status: string;
  businessType: string;
  dateRange: string;
  paymentStatus: string;
}

const BookingManagement: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<BookingFilters>({
    status: 'all',
    businessType: 'all',
    dateRange: 'all',
    paymentStatus: 'all'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  // Filter bookings when search term or filters change
  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load businesses first to get all business IDs
      const response = await businessApi.getOwnerBusinesses();
      // Extract businesses array from response (handle direct array, businesses property, or data property)
      const businessData = Array.isArray(response) ? response : (response.businesses || response.data || []);

      // Load bookings for all businesses
      const allBookings: Booking[] = [];
      for (const business of businessData) {
        try {
          const bizId = business.id || business._id;
          if (!bizId) continue;

          const bookingsResponse = await businessApi.getBookings(bizId);
          // Handle both direct array and object with bookings property
          const businessBookings = Array.isArray(bookingsResponse) ? bookingsResponse : (bookingsResponse.bookings || bookingsResponse.data || []);

          // Add business name to bookings and handle legacy field mapping
          const bookingsWithBusinessName = businessBookings.map((booking: any) => ({
            ...booking,
            businessName: business.name,
            businessType: business.type,
            // Map legacy fields if new ones are missing
            customerName: booking.customerName || booking.fullName || 'Guest',
            customerEmail: booking.customerEmail || booking.email || '',
            bookingNumber: booking.bookingNumber || booking._id.slice(-6)
          }));
          allBookings.push(...bookingsWithBusinessName);
        } catch (err) {
          console.error(`Error loading bookings for business ${business._id}:`, err);
        }
      }

      setBookings(allBookings);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = bookings.filter(booking => {
      // Safe check for missing properties before searching
      const customerName = (booking.customerName || '').toLowerCase();
      const customerEmail = (booking.customerEmail || '').toLowerCase();
      const businessName = (booking.businessName || '').toLowerCase();
      const bookingNumber = (booking.bookingNumber || '').toLowerCase();
      const s = searchTerm.toLowerCase();

      const matchesSearch =
        customerName.includes(s) ||
        bookingNumber.includes(s) ||
        businessName.includes(s) ||
        customerEmail.includes(s);

      const matchesStatus = filters.status === 'all' || booking.status === filters.status;
      const matchesBusinessType = filters.businessType === 'all' || booking.businessType === filters.businessType;
      const matchesPaymentStatus = filters.paymentStatus === 'all' || booking.paymentStatus === filters.paymentStatus;

      // Date range filtering
      let matchesDateRange = true;
      if (filters.dateRange !== 'all') {
        const bookingDate = new Date(booking.date);
        const today = new Date();
        const daysDiff = Math.ceil((bookingDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

        switch (filters.dateRange) {
          case 'today':
            matchesDateRange = daysDiff === 0;
            break;
          case 'tomorrow':
            matchesDateRange = daysDiff === 1;
            break;
          case 'this-week':
            matchesDateRange = daysDiff >= 0 && daysDiff <= 7;
            break;
          case 'this-month':
            matchesDateRange = daysDiff >= 0 && daysDiff <= 30;
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesBusinessType && matchesPaymentStatus && matchesDateRange;
    });

    setFilteredBookings(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'no-show': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'refunded': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle size={16} className="text-green-600" />;
      case 'pending': return <AlertCircle size={16} className="text-yellow-600" />;
      case 'cancelled': return <XCircle size={16} className="text-red-600" />;
      case 'completed': return <CheckCircle size={16} className="text-blue-600" />;
      case 'no-show': return <XCircle size={16} className="text-gray-600" />;
      default: return <AlertCircle size={16} className="text-gray-600" />;
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      // This would typically call the booking API to update status
      // For now, update locally
      setBookings(prev => prev.map(booking =>
        booking._id === bookingId
          ? { ...booking, status: newStatus as any, updatedAt: new Date().toISOString() }
          : booking
      ));
    } catch (error) {
      console.error('Error updating booking status:', error);
      alert('Failed to update booking status');
    }
  };

  const handleRefresh = () => {
    loadData();
  };

  const exportBookings = () => {
    // Create CSV content
    const headers = ['Booking Number', 'Customer Name', 'Business', 'Date', 'Time', 'Seats', 'Amount', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredBookings.map(booking => [
        booking.bookingNumber || booking._id,
        booking.customerName,
        booking.businessName || 'Unknown',
        booking.date,
        booking.time,
        booking.seats,
        booking.amount,
        booking.status
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bookings.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const BookingModal = () => {
    if (!selectedBooking) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-slate-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-slate-900">Booking Details</h2>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle size={24} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Booking Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-4">Booking Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Booking Number</label>
                    <p className="text-slate-900">{selectedBooking.bookingNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Business</label>
                    <p className="text-slate-900">{selectedBooking.businessName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Date & Time</label>
                    <p className="text-slate-900">{selectedBooking.date} at {selectedBooking.time}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Seats</label>
                    <p className="text-slate-900">{selectedBooking.seats} seats</p>
                  </div>
                  {selectedBooking.tableNumber && (
                    <div>
                      <label className="text-sm font-medium text-slate-600">Table</label>
                      <p className="text-slate-900">{selectedBooking.tableNumber}</p>
                    </div>
                  )}
                  {selectedBooking.seatNumbers && (
                    <div>
                      <label className="text-sm font-medium text-slate-600">Seat Numbers</label>
                      <p className="text-slate-900">{selectedBooking.seatNumbers.join(', ')}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-4">Customer Information</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Name</label>
                    <p className="text-slate-900">{selectedBooking.customerName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Email</label>
                    <p className="text-slate-900 flex items-center gap-2">
                      <Mail size={16} />
                      {selectedBooking.customerEmail}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Phone</label>
                    <p className="text-slate-900 flex items-center gap-2">
                      <Phone size={16} />
                      {selectedBooking.customerPhone}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Status</label>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedBooking.status)}
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedBooking.status)}`}>
                        {selectedBooking.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div>
              <h3 className="text-lg font-medium text-slate-900 mb-4">Payment Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Amount</label>
                  <p className="text-slate-900 flex items-center gap-2">
                    <DollarSign size={16} />
                    ₹{selectedBooking.amount}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Payment Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(selectedBooking.paymentStatus)}`}>
                    {selectedBooking.paymentStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Special Requests */}
            {selectedBooking.specialRequests && (
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-4">Special Requests</h3>
                <p className="text-slate-700 bg-slate-50 p-3 rounded-lg">{selectedBooking.specialRequests}</p>
              </div>
            )}

            {/* Review */}
            {selectedBooking.rating && selectedBooking.review && (
              <div>
                <h3 className="text-lg font-medium text-slate-900 mb-4">Customer Review</h3>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="text-yellow-500 fill-current" size={16} />
                    <span className="font-medium">{selectedBooking.rating}/5</span>
                  </div>
                  <p className="text-slate-700">{selectedBooking.review}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <select
                value={selectedBooking.status}
                onChange={(e) => updateBookingStatus(selectedBooking._id, e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no-show">No Show</option>
              </select>
              <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                <MessageSquare size={16} />
                Contact Customer
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                <Edit size={16} />
                Edit Booking
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Booking Management</h1>
            <p className="text-slate-600">Manage all your customer bookings</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={exportBookings}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="mt-4 text-slate-600">Loading bookings...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">{error}</div>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search bookings..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no-show">No Show</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Business Type</label>
                  <select
                    value={filters.businessType}
                    onChange={(e) => setFilters(prev => ({ ...prev, businessType: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="all">All Types</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="event">Event</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="tomorrow">Tomorrow</option>
                    <option value="this-week">This Week</option>
                    <option value="this-month">This Month</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Payment</label>
                  <select
                    value={filters.paymentStatus}
                    onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="all">All Payments</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bookings Table */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Booking
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Business
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Details
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {filteredBookings.map(booking => (
                      <tr key={booking._id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-slate-900">{booking.bookingNumber || booking._id.slice(-6)}</div>
                            <div className="text-sm text-slate-500">{new Date(booking.createdAt).toLocaleDateString()}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-slate-900">{booking.customerName}</div>
                            <div className="text-sm text-slate-500">{booking.customerEmail}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm text-slate-900">{booking.businessName || 'Unknown Business'}</div>
                            <div className="text-sm text-slate-500 capitalize">{booking.businessType}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm text-slate-900 flex items-center gap-1">
                              <Calendar size={14} />
                              {booking.date}
                            </div>
                            <div className="text-sm text-slate-500 flex items-center gap-1">
                              <Clock size={14} />
                              {booking.time}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm text-slate-900 flex items-center gap-1">
                              <Users size={14} />
                              {booking.seats} seats
                            </div>
                            {booking.tableNumber && (
                              <div className="text-sm text-slate-500">Table {booking.tableNumber}</div>
                            )}
                            {booking.seatNumbers && (
                              <div className="text-sm text-slate-500">{booking.seatNumbers.join(', ')}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-slate-900">₹{booking.amount}</div>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(booking.paymentStatus)}`}>
                              {booking.paymentStatus}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(booking.status)}
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedBooking(booking);
                                setShowBookingModal(true);
                              }}
                              className="text-emerald-600 hover:text-emerald-900"
                            >
                              <Eye size={16} />
                            </button>
                            <button className="text-slate-600 hover:text-slate-900">
                              <Edit size={16} />
                            </button>
                            <button className="text-red-600 hover:text-red-900">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredBookings.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="mx-auto h-12 w-12 text-slate-400" />
                  <h3 className="mt-2 text-sm font-medium text-slate-900">No bookings found</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {searchTerm || Object.values(filters).some(f => f !== 'all')
                      ? 'Try adjusting your search or filter criteria.'
                      : 'No bookings have been made yet.'
                    }
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Booking Modal */}
        {showBookingModal && <BookingModal />}
      </div>
    </div>
  );
};

export default BookingManagement;