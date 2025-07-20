import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getMockRestaurantById } from '../services/restaurantService';
import { bookingsApi } from '../services/api';
import { auth } from '../firebase';
import socketService from '../utils/socketService';
import { toast } from 'react-toastify';

const TableSelection: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>('');  
  const [reservedTables, setReservedTables] = useState<string[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [unavailableTables, setUnavailableTables] = useState<string[]>([]);

  // Use the correct restaurantId (ObjectId) for all API calls
  const [restaurantId, setRestaurantId] = useState<string>(id || '');

  // Fetch restaurant data
  useEffect(() => {
    if (id) {
      const restaurant = getMockRestaurantById(id);
      if (restaurant) {
        setRestaurantName(restaurant.name || 'Restaurant');
        // If the mock restaurant has a real _id, use it for API calls
        if (restaurant._id) {
          setRestaurantId(restaurant._id);
        }
      } else {
        setRestaurantName('Restaurant');
      }
    }
  }, [id]);

  // Real-time fetch reserved tables for selected date/time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const fetchReserved = async () => {
      if (!restaurantId) return;
      const date = searchParams.get('date');
      const time = searchParams.get('time');
      if (!date || !time) return;
      setLoadingTables(true);
      try {
        const bookings = await bookingsApi.getTableBookings(restaurantId, date, time);
        setReservedTables((bookings || []).filter((b: any) => b.status === 'reserved').map((b: any) => b.tableId));
      } catch {
        setReservedTables([]);
      }
      setLoadingTables(false);
    };
    fetchReserved();
    interval = setInterval(fetchReserved, 10000);
    return () => clearInterval(interval);
  }, [restaurantId, searchParams]);

  // Real-time fetch unavailable tables for selected date/time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const fetchUnavailable = async () => {
      if (!restaurantId) return;
      const date = searchParams.get('date');
      const time = searchParams.get('time');
      if (!date || !time) return;
      setLoadingTables(true);
      try {
        // Use Booking collection for confirmed tables
        const bookedTables = await bookingsApi.getBookedTables(restaurantId, date, time);
        setUnavailableTables(Array.isArray(bookedTables) ? bookedTables : []);
      } catch {
        setUnavailableTables([]);
      }
      setLoadingTables(false);
    };
    fetchUnavailable();
    interval = setInterval(fetchUnavailable, 10000);
    return () => clearInterval(interval);
  }, [restaurantId, searchParams]);

  // Real-time Socket.IO event listeners
  useEffect(() => {
    // Connect to Socket.IO
    const socket = socketService.connect();
    // Join restaurant room for real-time updates
    if (socket && restaurantId) {
      socket.emit('joinRestaurant', restaurantId);
    }
    // Real-time event handlers
    const handleTableEvent = () => {
      // Refetch unavailable tables on any table event
      fetchUnavailable();
    };
    if (socket) {
      socket.on('tableBlocked', handleTableEvent);
      socket.on('tableConfirmed', handleTableEvent);
      socket.on('tableCancelled', handleTableEvent);
      socket.on('tableAutoConfirmed', handleTableEvent);
      socket.on('bookingUpdated', handleTableEvent);
    }
    return () => {
      if (socket) {
        socket.off('tableBlocked', handleTableEvent);
        socket.off('tableConfirmed', handleTableEvent);
        socket.off('tableCancelled', handleTableEvent);
        socket.off('tableAutoConfirmed', handleTableEvent);
        socket.off('bookingUpdated', handleTableEvent);
        socketService.disconnect();
      }
    };
  }, [restaurantId, searchParams]);

  // Table layout configuration
  const floors = {
    ground: Array(8).fill(null).map((_, i) => `G${i + 1}`),
    first: Array(8).fill(null).map((_, i) => `F${i + 1}`),
    second: Array(8).fill(null).map((_, i) => `S${i + 1}`),
    third: Array(8).fill(null).map((_, i) => `T${i + 1}`)
  };

  const handleProceed = async () => {
    if (!selectedTable) {
      alert('Please select a table to proceed');
      return;
    }
    setLoadingTables(true); // Immediate UI feedback
    setTimeout(async () => {
    const user = auth.currentUser;
    if (!user) {
      alert('You must be logged in to reserve a table.');
        setLoadingTables(false);
      return;
    }
    const date = searchParams.get('date');
    const time = searchParams.get('time');
    const guests = Number(searchParams.get('guests')) || 1;
    // Reserve the table in real time
    try {
      await bookingsApi.reserveTable({
          restaurantId: restaurantId!,
        tableId: selectedTable,
        date: date!,
        time: time!,
        userId: user.uid,
        guests,
        status: 'reserved'
      });
    } catch (err) {
      alert('Failed to reserve table. Please try again.');
        setLoadingTables(false);
      return;
    }
    // Build query params from form data
    const params = new URLSearchParams();
    if (searchParams.get('fullName')) params.set('fullName', searchParams.get('fullName') || '');
    if (searchParams.get('email')) params.set('email', searchParams.get('email') || '');
    if (searchParams.get('phoneNumber')) params.set('phoneNumber', searchParams.get('phoneNumber') || '');
    if (searchParams.get('occasion')) params.set('occasion', searchParams.get('occasion') || '');
    if (searchParams.get('specialRequest')) params.set('specialRequest', searchParams.get('specialRequest') || '');
    if (date) params.set('date', date);
    if (time) params.set('time', time);
    if (searchParams.get('guests')) params.set('guests', searchParams.get('guests') || '');
    searchParams.getAll('items').forEach(item => {
      params.append('items', item);
    });
    params.set('table', selectedTable);
    params.set('restaurantName', restaurantName);
    try {
      const formData = {
        fullName: searchParams.get('fullName') || '',
        email: searchParams.get('email') || '',
        phoneNumber: searchParams.get('phoneNumber') || '',
        occasion: searchParams.get('occasion') || '',
        specialRequest: searchParams.get('specialRequest') || '',
        date: date || '',
        time: time || '',
        guests: searchParams.get('guests') || '',
        table: selectedTable,
        restaurantName: restaurantName
      };
      sendEmail(formData);
    } catch (error) {
      console.error('Error sending email:', error);
    }
      setLoadingTables(false);
      navigate(`/restaurant/${restaurantId}/reservation?${params.toString()}`);
    }, 0);
  };

  const sendEmail = async (data: any) => {
    try {
      const response = await fetch('http://localhost:5000/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit',
        body: JSON.stringify({
          subject: `New Reservation - ${data.restaurantName}`,
          message: JSON.stringify(data),
          from: data.email,
          formData: data,
          type: 'reservation',
          restaurantId: restaurantId
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send email: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Helper to check if a table is reserved
  const isTableReserved = (tableId: string) => reservedTables.includes(tableId);

  // Helper to check if a table is unavailable
  const isTableUnavailable = (tableId: string) => Array.isArray(unavailableTables) && unavailableTables.includes(tableId);

  // Block table immediately on selection
  const handleTableSelect = async (table: string) => {
    if (isTableUnavailable(table) || loadingTables) {
      toast.error('This table is already booked or pending confirmation for the selected slot. Please choose another table.');
      return;
    }
    setSelectedTable(table); // Immediate UI feedback
    setTimeout(async () => {
      const user = auth.currentUser;
      if (!user) {
        alert('You must be logged in to block a table.');
        setSelectedTable(null);
        return;
      }
      const date = searchParams.get('date');
      const time = searchParams.get('time');
      const guests = Number(searchParams.get('guests')) || 1;
      try {
        await bookingsApi.reserveTable({
          restaurantId: restaurantId!,
          tableId: table,
          date: date!,
          time: time!,
          userId: user.uid,
          guests,
          status: 'blocked'
        });
      } catch (err) {
        alert('Failed to block table. Please try again.');
        setSelectedTable(null);
      }
    }, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Back Navigation */}
      <div className="mb-8">
        <button 
          onClick={() => navigate(`/restaurant/${id}/preview?${searchParams.toString()}`)}
          className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-700" />
          <span className="text-gray-700 font-medium">Back to Preview</span>
        </button>
      </div>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-2xl font-semibold mb-6">Select Your Table</h2>
          <p className="text-gray-600 mb-8">Choose a table from our available seating options.</p>
          <div className="space-y-8">
            {/* Ground Floor */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Ground Floor</h3>
              <div className="grid grid-cols-4 gap-4">
                {floors.ground.map((table) => (
                  <button
                    key={table}
                    onClick={() => handleTableSelect(table)}
                    disabled={isTableUnavailable(table) || loadingTables}
                    className={`p-4 text-center border rounded-xl transition-colors ${
                      isTableUnavailable(table)
                        ? 'bg-gray-300 text-gray-400 border-gray-300 cursor-not-allowed'
                        : selectedTable === table
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'border-gray-200 hover:border-emerald-500 hover:bg-emerald-50'
                    }`}
                  >
                    Table {table}
                    {isTableUnavailable(table) && <span className="block text-xs text-red-500 mt-1">Unavailable</span>}
                  </button>
                ))}
              </div>
            </div>
            {/* First Floor */}
            <div>
              <h3 className="text-lg font-semibold mb-4">First Floor</h3>
              <div className="grid grid-cols-4 gap-4">
                {floors.first.map((table) => (
                  <button
                    key={table}
                    onClick={() => handleTableSelect(table)}
                    disabled={isTableUnavailable(table) || loadingTables}
                    className={`p-4 text-center border rounded-xl transition-colors ${
                      isTableUnavailable(table)
                        ? 'bg-gray-300 text-gray-400 border-gray-300 cursor-not-allowed'
                        : selectedTable === table
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'border-gray-200 hover:border-emerald-500 hover:bg-emerald-50'
                    }`}
                  >
                    Table {table}
                    {isTableUnavailable(table) && <span className="block text-xs text-red-500 mt-1">Unavailable</span>}
                  </button>
                ))}
              </div>
            </div>
            {/* Second Floor */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Second Floor</h3>
              <div className="grid grid-cols-4 gap-4">
                {floors.second.map((table) => (
                  <button
                    key={table}
                    onClick={() => handleTableSelect(table)}
                    disabled={isTableUnavailable(table) || loadingTables}
                    className={`p-4 text-center border rounded-xl transition-colors ${
                      isTableUnavailable(table)
                        ? 'bg-gray-300 text-gray-400 border-gray-300 cursor-not-allowed'
                        : selectedTable === table
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'border-gray-200 hover:border-emerald-500 hover:bg-emerald-50'
                    }`}
                  >
                    Table {table}
                    {isTableUnavailable(table) && <span className="block text-xs text-red-500 mt-1">Unavailable</span>}
                  </button>
                ))}
              </div>
            </div>
            {/* Third Floor */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Third Floor</h3>
              <div className="grid grid-cols-4 gap-4">
                {floors.third.map((table) => (
                  <button
                    key={table}
                    onClick={() => handleTableSelect(table)}
                    disabled={isTableUnavailable(table) || loadingTables}
                    className={`p-4 text-center border rounded-xl transition-colors ${
                      isTableUnavailable(table)
                        ? 'bg-gray-300 text-gray-400 border-gray-300 cursor-not-allowed'
                        : selectedTable === table
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'border-gray-200 hover:border-emerald-500 hover:bg-emerald-50'
                    }`}
                  >
                    Table {table}
                    {isTableUnavailable(table) && <span className="block text-xs text-red-500 mt-1">Unavailable</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-8">
            <button
              onClick={handleProceed}
              className={`px-6 py-3 rounded-xl transition-colors ${
                selectedTable
                  ? 'bg-black text-white hover:bg-gray-800'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Proceed to Confirmation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableSelection; 