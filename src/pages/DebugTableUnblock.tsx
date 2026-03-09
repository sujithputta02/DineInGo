import { useState } from 'react';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const DebugTableUnblock = () => {
  const [restaurantId, setRestaurantId] = useState('');
  const [tableId, setTableId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const handleDebug = async () => {
    if (!restaurantId || !tableId) {
      toast.error('Please enter restaurant ID and table ID');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);
      if (time) params.append('time', time);
      
      const url = `${API_URL}/api/bookings/debug-table/${restaurantId}/${tableId}${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      
      setDebugInfo(data);
      toast.success('Debug info loaded');
    } catch (error) {
      console.error('Error fetching debug info:', error);
      toast.error('Failed to fetch debug info');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (!restaurantId || !tableId) {
      toast.error('Please enter restaurant ID and table ID');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/bookings/manual-unblock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          restaurantId,
          tableId,
          date: date || undefined,
          time: time || undefined
        })
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Successfully unblocked ${tableId}! Updated ${data.tableBookingsUpdated} bookings.`);
        // Refresh debug info
        handleDebug();
      } else {
        toast.error('Failed to unblock table');
      }
    } catch (error) {
      console.error('Error unblocking table:', error);
      toast.error('Failed to unblock table');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Table Unblock</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Table Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Restaurant ID *</label>
              <input
                type="text"
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter restaurant ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Table ID *</label>
              <input
                type="text"
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., T1, T2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Date (optional)</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Time (optional)</label>
              <input
                type="text"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 7:00 PM"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleDebug}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Debug Info'}
            </button>

            <button
              onClick={handleUnblock}
              disabled={loading}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Unblock Table'}
            </button>
          </div>
        </div>

        {debugInfo && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
            
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Table Bookings ({debugInfo.tableBookings?.length || 0})</h3>
              <div className="bg-gray-900 rounded p-4 overflow-x-auto">
                <pre className="text-sm">{JSON.stringify(debugInfo.tableBookings, null, 2)}</pre>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Main Bookings ({debugInfo.mainBookings?.length || 0})</h3>
              <div className="bg-gray-900 rounded p-4 overflow-x-auto">
                <pre className="text-sm">{JSON.stringify(debugInfo.mainBookings, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugTableUnblock;
