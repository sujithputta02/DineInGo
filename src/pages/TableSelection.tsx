import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Store, Wine, X, ChevronRight } from 'lucide-react';
import { getRestaurantById } from '../services/restaurantService';
import { bookingsApi } from '../services/api';
import { auth } from '../firebase';
import socketService from '../utils/socketService';
import { toast } from 'react-toastify';
import { DinoStepper } from '../components/DinoStepper';

interface TableData {
  id: string;
  x: number;
  y: number;
  seats: number;
}

interface FeatureData {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

interface Floor {
  id: string;
  name: string;
  tables: string[];
  layout: TableData[];
  features: FeatureData[];
}

// Module-level sub-components — must NOT be inside TableSelection to avoid Vite TDZ errors
function FeatureRenderer({ feature }: { feature: any }) {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${feature.x}%`,
    top: `${feature.y}%`,
    width: `${feature.width}%`,
    height: `${feature.height}%`,
    transform: `translate(-50%, -50%)`,
  };

  switch (feature.type) {
    case 'reception':
      return (
        <div style={style} className="flex flex-col items-center justify-center bg-slate-800 rounded-lg border-2 border-slate-600 shadow-xl">
          <Store size={14} className="text-amber-500 mb-1" />
          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{feature.label}</span>
        </div>
      );
    case 'window':
      return (
        <div style={style} className="bg-cyan-900/20 border border-cyan-500/30 backdrop-blur-sm flex items-center justify-center overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent"></div>
          <div className="w-full h-[1px] bg-cyan-500/20 absolute top-1/3"></div>
          <div className="w-full h-[1px] bg-cyan-500/20 absolute top-2/3"></div>
        </div>
      );
    case 'entrance':
      return (
        <div style={style} className="flex flex-col items-center justify-end pb-1 border-b-4 border-emerald-500">
          <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-[0.2em]">ENTRANCE</span>
        </div>
      );
    case 'bar':
      return (
        <div style={style} className="bg-slate-800 rounded-xl flex items-center justify-center shadow-lg border-b-4 border-slate-900">
          <Wine size={14} className="text-purple-400 mr-2" />
          <span className="text-purple-200 text-xs font-bold tracking-widest uppercase">{feature.label}</span>
        </div>
      );
    case 'plant':
      return (
        <div style={style} className="bg-emerald-900/50 rounded-full border border-emerald-800/50 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
        </div>
      );
    case 'wall':
      return (
        <div style={style} className="bg-slate-800 border-x border-slate-700 shadow-inner"></div>
      );
    default:
      return null;
  }
}

function TableRenderer({ tableData, selectedTable, unavailableTables, loadingTables, onTableSelect }: {
  tableData: any;
  selectedTable: string | null;
  unavailableTables: string[];
  loadingTables: boolean;
  onTableSelect: (id: string) => void;
}) {
  const isSelected = selectedTable === tableData.id;
  const isUnavailable = Array.isArray(unavailableTables) && unavailableTables.includes(tableData.id);

  let bgGradient = "";
  let borderColor = "";
  let textColor = "";

  if (isUnavailable) {
    bgGradient = "bg-slate-900";
    borderColor = "border-slate-800";
    textColor = "text-slate-700";
  } else if (isSelected) {
    bgGradient = "bg-emerald-500";
    borderColor = "border-emerald-400";
    textColor = "text-white";
  } else {
    bgGradient = "bg-gradient-to-br from-slate-600 to-slate-800";
    borderColor = "border-slate-500";
    textColor = "text-slate-300";
  }

  return (
    <div
      className="absolute flex items-center justify-center transition-all duration-300"
      style={{ left: `${tableData.x}%`, top: `${tableData.y}%`, transform: 'translate(-50%, -50%)', zIndex: 10 }}
    >
      {Array.from({ length: tableData.seats }).map((_: unknown, i: number) => {
        const angle = (i * (360 / tableData.seats)) * (Math.PI / 180);
        const radius = 60;
        return (
          <div
            key={`chair-indicator-${tableData.id}-${i}`}
            className={`absolute w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-500' : 'bg-slate-600'} opacity-40`}
            style={{ top: `${50 + (radius * Math.sin(angle))}%`, left: `${50 + (radius * Math.cos(angle))}%`, transform: 'translate(-50%, -50%)' }}
          />
        );
      })}
      <button
        onClick={() => onTableSelect(tableData.id)}
        disabled={isUnavailable || loadingTables}
        className={`relative flex items-center justify-center border-t-2 border-b-4 ${borderColor} ${bgGradient} ${textColor}
          shadow-lg transition-all active:scale-95 active:border-b-0 active:translate-y-1
          w-12 md:w-16 h-12 md:h-16 rounded-lg`}
      >
        <div className="flex flex-col items-center leading-none">
          <span className="font-bold text-sm md:text-base drop-shadow-md">{tableData.id}</span>
          {tableData.seats > 0 && <span className="text-[9px] opacity-60 mt-0.5">{tableData.seats}</span>}
        </div>
      </button>
    </div>
  );
}

const TableSelection: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>('');
  const [reservedTables, setReservedTables] = useState<string[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [unavailableTables, setUnavailableTables] = useState<string[]>([]);
  const [businessFloorPlan, setBusinessFloorPlan] = useState<any>(null);
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

  // Use the correct restaurantId (ObjectId) for all API calls
  const [restaurantId, setRestaurantId] = useState<string>(id || '');

  // Default mock floor plan for demonstration purposes (IDs 1-6)
  const DEFAULT_MOCK_FLOOR_PLAN = {
    floors: [
      {
        id: 'ground',
        name: 'Ground Floor',
        tables: [
          { id: 'T1', x: 25, y: 35, seats: 2 },
          { id: 'T2', x: 25, y: 55, seats: 2 },
          { id: 'T3', x: 25, y: 75, seats: 2 },
          { id: 'T4', x: 50, y: 45, seats: 4 },
          { id: 'T5', x: 50, y: 70, seats: 4 },
          { id: 'T6', x: 75, y: 35, seats: 6 },
          { id: 'T7', x: 75, y: 60, seats: 2 },
          { id: 'T8', x: 75, y: 80, seats: 4 },
        ],
        features: [
          { type: 'reception', x: 10, y: 50, width: 8, height: 15, label: 'Host' },
          { type: 'entrance', x: 5, y: 50, width: 2, height: 10 },
          { type: 'bar', x: 50, y: 15, width: 40, height: 10, label: 'MAIN BAR' },
          { type: 'window', x: 98, y: 50, width: 2, height: 80 },
          { type: 'plant', x: 90, y: 15, width: 5, height: 5 },
          { type: 'plant', x: 90, y: 85, width: 5, height: 5 },
        ]
      },
      {
        id: 'first',
        name: 'First Floor',
        tables: [
          { id: 'F1', x: 30, y: 30, seats: 4 },
          { id: 'F2', x: 30, y: 50, seats: 4 },
          { id: 'F3', x: 30, y: 70, seats: 4 },
          { id: 'F4', x: 70, y: 30, seats: 2 },
          { id: 'F5', x: 70, y: 50, seats: 2 },
          { id: 'F6', x: 70, y: 70, seats: 2 },
          { id: 'F7', x: 50, y: 50, seats: 8 },
        ],
        features: [
          { type: 'window', x: 2, y: 50, width: 2, height: 80 },
          { type: 'window', x: 98, y: 50, width: 2, height: 80 },
          { type: 'bar', x: 50, y: 85, width: 30, height: 8, label: 'LOUNGE' },
          { type: 'wall', x: 50, y: 10, width: 40, height: 2 },
          { type: 'plant', x: 10, y: 10, width: 5, height: 5 },
          { type: 'plant', x: 90, y: 10, width: 5, height: 5 },
        ]
      },
      {
        id: 'rooftop',
        name: 'Rooftop',
        tables: [
          { id: 'R1', x: 20, y: 30, seats: 2 },
          { id: 'R2', x: 40, y: 30, seats: 2 },
          { id: 'R3', x: 60, y: 30, seats: 2 },
          { id: 'R4', x: 80, y: 30, seats: 2 },
          { id: 'R5', x: 20, y: 70, seats: 4 },
          { id: 'R6', x: 40, y: 70, seats: 4 },
          { id: 'R7', x: 60, y: 70, seats: 4 },
          { id: 'R8', x: 80, y: 70, seats: 4 },
        ],
        features: [
          { type: 'bar', x: 50, y: 50, width: 15, height: 15, label: 'SKY BAR' },
          { type: 'plant', x: 10, y: 10, width: 6, height: 6 },
          { type: 'plant', x: 90, y: 10, width: 6, height: 6 },
          { type: 'plant', x: 10, y: 90, width: 6, height: 6 },
          { type: 'plant', x: 90, y: 90, width: 6, height: 6 },
          { type: 'window', x: 50, y: 2, width: 90, height: 2 }, // Open edge
          { type: 'window', x: 50, y: 98, width: 90, height: 2 }, // Open edge
        ]
      }
    ]
  };

  // Fetch restaurant data
  useEffect(() => {
    const fetchRestaurant = async () => {
      if (id) {
        const restaurant = await getRestaurantById(id);
        if (restaurant) {
          setRestaurantName(restaurant.name || 'Restaurant');
          // Use the restaurant ID for API calls (could be ObjectId or mock ID)
          setRestaurantId(id);

          // Check if this is a business restaurant with floor plan
          if (restaurant.floorPlan) {
            setBusinessFloorPlan(restaurant.floorPlan);
            console.log('Business floor plan loaded:', restaurant.floorPlan);
          } else if (['1', '2', '3', '4', '5', '6'].includes(id)) {
            // Fallback for mock restaurants
            setBusinessFloorPlan(DEFAULT_MOCK_FLOOR_PLAN);
            console.log('Using default mock floor plan for ID:', id);
          }
        } else {
          setRestaurantName('Restaurant');
        }
      }
    };
    fetchRestaurant();
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

  // Function to fetch unavailable tables immediately (for real-time updates)
  const fetchUnavailableTablesNow = async () => {
    if (!restaurantId) return;
    const date = searchParams.get('date');
    const time = searchParams.get('time');
    if (!date || !time) return;

    console.log('Fetching unavailable tables for:', { restaurantId, date, time });
    try {
      // Use Booking collection for confirmed tables (excludes cancelled)
      const bookedTables = await bookingsApi.getBookedTables(restaurantId, date, time);
      console.log('Fetched booked tables:', bookedTables);
      setUnavailableTables(Array.isArray(bookedTables) ? bookedTables : []);
    } catch (error) {
      console.error('Error fetching unavailable tables:', error);
      setUnavailableTables([]);
    }
  };

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
        // Use Booking collection for confirmed tables (excludes cancelled)
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
    if (!restaurantId) return;

    // Connect to Socket.IO
    const socket = socketService.connect();

    if (!socket) {
      console.error('Failed to connect to socket service');
      return;
    }

    // Join restaurant room for real-time updates
    socket.emit('joinRestaurant', restaurantId);
    console.log('Joined restaurant room:', restaurantId);

    // Real-time event handlers
    const handleTableEvent = (data: any) => {
      console.log('Table event received:', data);
      const date = searchParams.get('date');
      const time = searchParams.get('time');

      // Only update if the event is for the current date/time
      if (data.date === date && data.time === time) {
        console.log('Event matches current date/time, refetching tables...');

        // Refetch unavailable tables immediately
        fetchUnavailableTablesNow();

        // For cancelled tables, also refetch after a short delay to ensure DB is updated
        if (data.status === 'cancelled') {
          setTimeout(() => {
            console.log('Refetching tables after cancellation...');
            fetchUnavailableTablesNow();
          }, 500);
        }

        // Show toast notification
        if (data.tableId) {
          let message = 'Table updated';
          if (data.status === 'reserved') {
            message = 'Table reserved';
            toast.warning(`${message}: ${data.tableId}`, { autoClose: 2000 });
          } else if (data.status === 'confirmed') {
            message = 'Table confirmed';
            toast.info(`${message}: ${data.tableId}`, { autoClose: 2000 });
          } else if (data.status === 'cancelled') {
            message = 'Table now available';
            toast.success(`${message}: ${data.tableId}`, { autoClose: 3000 });
          } else {
            toast.info(`${message}: ${data.tableId}`, { autoClose: 2000 });
          }
        }
      } else {
        console.log('Event date/time does not match current selection, ignoring');
      }
    };

    socket.on('tableBlocked', handleTableEvent);
    socket.on('tableConfirmed', handleTableEvent);
    socket.on('tableCancelled', handleTableEvent);
    socket.on('tableAutoConfirmed', handleTableEvent);
    socket.on('bookingUpdated', handleTableEvent);

    return () => {
      if (socket) {
        socket.off('tableBlocked', handleTableEvent);
        socket.off('tableConfirmed', handleTableEvent);
        socket.off('tableCancelled', handleTableEvent);
        socket.off('tableAutoConfirmed', handleTableEvent);
        socket.off('bookingUpdated', handleTableEvent);
        socket.emit('leaveRestaurant', restaurantId);
        console.log('Left restaurant room:', restaurantId);
      }
    };
  }, [restaurantId, searchParams, fetchUnavailableTablesNow]);

  // Floor data with visual layout
  const [activeFloorId, setActiveFloorId] = useState<string>('ground');

  const floors = useMemo<Floor[]>(() => {
    if (businessFloorPlan && businessFloorPlan.floors && Array.isArray(businessFloorPlan.floors)) {
      return businessFloorPlan.floors.map((floor: any) => ({
        id: floor.id,
        name: floor.name,
        tables: floor.tables.map((t: any) => t.id),
        layout: floor.tables,
        features: floor.features || []
      }));
    }
    return [];
  }, [businessFloorPlan]);

  // Update active floor if current one is invalid
  useEffect(() => {
    if (floors.length > 0 && !floors.find(f => f.id === activeFloorId)) {
      setActiveFloorId(floors[0].id);
    }
  }, [floors, activeFloorId]);

  const activeFloor = useMemo(() => floors.find(f => f.id === activeFloorId), [floors, activeFloorId]);

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

      console.log('Reserving table:', { restaurantId, tableId: selectedTable, date, time, userId: user.uid });

      // Reserve the table in real time
      try {
        const result = await bookingsApi.reserveTable({
          restaurantId: restaurantId!,
          tableId: selectedTable,
          date: date!,
          time: time!,
          userId: user.uid,
          guests,
          status: 'reserved'
        });
        console.log('Table reserved successfully:', result);
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
      setLoadingTables(false);
      navigate(`/restaurant/${restaurantId}/reservation?${params.toString()}`);

    }, 0);
  };



  // Helper to check if a table is reserved
  const isTableReserved = (tableId: string) => reservedTables.includes(tableId);

  // Helper to check if a table is unavailable
  const isTableUnavailable = (tableId: string) => Array.isArray(unavailableTables) && unavailableTables.includes(tableId);

  // Select table (visual only, no blocking until proceed)
  const handleTableSelect = (table: string) => {
    if (isTableUnavailable(table) || loadingTables) {
      toast.error('This table is already booked. Please choose another table.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      toast.error('You must be logged in to select a table.');
      return;
    }

    // Just update the selected table visually
    // Don't block it until user clicks "Proceed"
    setSelectedTable(table);
  };

  return (
    <div className={`flex flex-col h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-200' : 'bg-gray-50 text-gray-800'}`}>
      {/* Header */}
      <header className={`backdrop-blur-xl border-b px-6 py-4 flex justify-between items-center z-30 shadow-lg transition-all ${
        isDarkMode ? 'bg-slate-900/80 border-slate-700/50 text-white' : 'bg-white border-gray-100 text-gray-900'
      }`}>
        <button
          onClick={() => navigate(`/restaurant/${id}/preview?${searchParams.toString()}`)}
          className={`flex items-center gap-3 px-5 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 border-2 ${
            isDarkMode ? 'bg-slate-800/50 border-white/10 text-white hover:bg-slate-700' : 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100'
          }`}
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <div className="text-center">
          <h2 className={`text-xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{restaurantName}</h2>
          <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Table Selection</p>
        </div>

        {/* Floor Tabs */}
        <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-700 overflow-x-auto max-w-[200px] md:max-w-none gap-1">
          {floors.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFloorId(f.id)}
              className={`px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${activeFloorId === f.id
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
            >
              {f.name}
            </button>
          ))}
        </div>
      </header>

      {/* Dino Progress Tracker */}
      <div className="bg-slate-800/30 border-b border-slate-700/30 py-2">
        <DinoStepper currentStep={3} />
      </div>

      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* MAP CANVAS */}
        <div className="flex-1 relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden flex flex-col items-center justify-center p-4 md:p-8">
          {/* Floor Container */}
          <div className="relative w-full max-w-[700px] aspect-[4/3] bg-slate-800/30 rounded-2xl border border-slate-700/50 shadow-2xl backdrop-blur-sm transition-all duration-500 p-4">
            {/* Features Layer */}
            {activeFloor?.features.map((feat, idx) => (
              <FeatureRenderer key={`feature-${feat.type}-${idx}`} feature={feat} />
            ))}

            {/* Tables Layer */}
            {activeFloor?.layout.map((table: any) => (
              <TableRenderer 
                key={table.id} 
                tableData={table}
                selectedTable={selectedTable}
                unavailableTables={unavailableTables}
                loadingTables={loadingTables}
                onTableSelect={handleTableSelect}
              />
            ))}
          </div>

          {/* Legend */}
          <div className={`mt-8 backdrop-blur-3xl rounded-[2rem] px-8 py-4 flex items-center gap-8 shadow-2xl transition-all border-2 ${
            isDarkMode ? 'bg-slate-900/80 border-white/10' : 'bg-white/90 border-gray-100'
          }`}>
            <div className="flex items-center gap-3 whitespace-nowrap">
              <div className={`w-4 h-4 rounded-md border-2 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-200 border-gray-300'}`}></div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Available</span>
            </div>
            <div className="flex items-center gap-3 whitespace-nowrap">
              <div className="w-4 h-4 rounded-md bg-emerald-500 border-2 border-emerald-400"></div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Selected</span>
            </div>
            <div className="flex items-center gap-3 whitespace-nowrap">
              <div className={`w-4 h-4 rounded-md border-2 ${isDarkMode ? 'bg-slate-900 border-slate-950' : 'bg-gray-400 border-gray-500'}`}></div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Booked</span>
            </div>
          </div>
        </div>

        {/* SIDEBAR SUMMARY */}
        {selectedTable && (
          <div className="absolute bottom-0 w-full md:static md:w-80 bg-slate-800/95 backdrop-blur-md border-t md:border-t-0 md:border-l border-slate-700/50 flex flex-col z-40 shadow-2xl animate-in slide-in-from-bottom md:slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-700/50">
              <h2 className="text-xl font-bold text-white tracking-tight">Your Selection</h2>
              <p className="text-sm text-slate-400 mt-1">1 table selected</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl flex justify-between items-center hover:bg-slate-900/70 transition-colors">
                <div>
                  <div className="font-bold text-white">{selectedTable}</div>
                  <div className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2">
                    {activeFloor?.name} • {activeFloor?.layout.find(t => t.id === selectedTable)?.seats || 0} Guests
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTable(null)}
                  className="w-8 h-8 flex items-center justify-center bg-slate-700/50 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-6 bg-slate-900/50 border-t border-slate-700/50">
              <button
                onClick={handleProceed}
                disabled={!selectedTable || loadingTables}
                className={`w-full py-4 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 transform ${selectedTable && !loadingTables
                  ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 active:scale-95'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
              >
                {loadingTables ? 'Processing...' : 'Confirm Booking'}
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TableSelection; 