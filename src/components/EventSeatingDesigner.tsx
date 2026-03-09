import React, { useState, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  Eye, 
  Grid, 
  Users,
  X,
  ChevronRight,
  Ticket,
  DollarSign,
  Settings,
  Square,
  Music,
  Theater,
  Calendar,
  Copy
} from 'lucide-react';

// Types matching the customer event seating view
type SeatStatus = 'available' | 'selected' | 'booked';
type SeatTier = 'standard' | 'premium' | 'vip';

interface Seat {
  id: string;
  rowLabel: string;
  number: number;
  status: SeatStatus;
  tier: SeatTier;
  price: number;
  bookedBy?: string;
}

interface Row {
  rowLabel: string;
  seats: Seat[];
}

interface SeatingLayout {
  rows: number;
  columns: number;
  seats: Seat[];
}

// Types for event configuration
type EventType = 'seats-only' | 'registration-only' | 'seats-and-registration';
type AreaTier = 'standard' | 'premium' | 'vip';

// Pricing configuration for different tiers
interface TierPricing {
  standard: { price: number; defaultCapacity: number };
  premium: { price: number; defaultCapacity: number };
  vip: { price: number; defaultCapacity: number };
}

interface ConcertArea {
  id: string;
  tier: AreaTier;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  price: number;
  label: string;
}

interface IndividualSeat {
  id: string;
  x: number;
  y: number;
  tier: SeatTier;
  price: number;
  status: SeatStatus;
  label: string;
}

interface EventSeatingConfig {
  id: string;
  name: string;
  type: EventType;
  capacity: number;
  hasSeating: boolean;
  hasRegistration: boolean;
  seatingLayout?: SeatingLayout; // Traditional row-based seating
  individualSeats?: IndividualSeat[]; // Draggable individual seats
  concertAreas?: ConcertArea[]; // Registration areas
  basePrice: number;
  tierPricing: TierPricing; // Custom pricing for each tier
}

// Event templates for quick setup
const EVENT_TEMPLATES = [
  {
    id: 'theater-style',
    name: 'Theater Style',
    description: 'Traditional theater seating with rows',
    type: 'seats-only' as EventType,
    hasSeating: true,
    hasRegistration: false,
    rows: 12,
    columns: 20,
    basePrice: 100
  },
  {
    id: 'concert-hall',
    name: 'Concert Hall',
    description: 'Mixed seating with registration areas',
    type: 'seats-and-registration' as EventType,
    hasSeating: true,
    hasRegistration: true,
    rows: 15,
    columns: 25,
    basePrice: 150,
    areas: [
      { tier: 'vip', label: 'VIP Lounge', capacity: 50, x: 20, y: 15, width: 25, height: 20 },
      { tier: 'premium', label: 'Premium Area', capacity: 100, x: 70, y: 15, width: 25, height: 20 }
    ]
  },
  {
    id: 'conference',
    name: 'Conference',
    description: 'Business conference with individual seats',
    type: 'seats-only' as EventType,
    hasSeating: true,
    hasRegistration: false,
    individualSeats: [
      { id: 'S1', x: 30, y: 40, tier: 'vip', label: 'VIP-1' },
      { id: 'S2', x: 70, y: 40, tier: 'vip', label: 'VIP-2' },
      { id: 'S3', x: 20, y: 60, tier: 'premium', label: 'P-1' },
      { id: 'S4', x: 50, y: 60, tier: 'premium', label: 'P-2' },
      { id: 'S5', x: 80, y: 60, tier: 'premium', label: 'P-3' },
      { id: 'S6', x: 35, y: 80, tier: 'standard', label: 'S-1' },
      { id: 'S7', x: 65, y: 80, tier: 'standard', label: 'S-2' }
    ],
    basePrice: 75
  },
  {
    id: 'standing-concert',
    name: 'Standing Concert',
    description: 'Registration areas only',
    type: 'registration-only' as EventType,
    hasSeating: false,
    hasRegistration: true,
    basePrice: 50,
    areas: [
      { tier: 'vip', label: 'VIP Section', capacity: 100, x: 50, y: 20, width: 40, height: 25 },
      { tier: 'premium', label: 'Premium Area', capacity: 200, x: 25, y: 50, width: 50, height: 30 },
      { tier: 'standard', label: 'General Admission', capacity: 500, x: 10, y: 75, width: 80, height: 20 }
    ]
  },
  {
    id: 'festival',
    name: 'Festival',
    description: 'Large outdoor event with registration areas',
    type: 'registration-only' as EventType,
    hasSeating: false,
    hasRegistration: true,
    basePrice: 75,
    areas: [
      { tier: 'vip', label: 'VIP Lounge', capacity: 150, x: 70, y: 15, width: 25, height: 30 },
      { tier: 'premium', label: 'Premium Zone', capacity: 300, x: 40, y: 15, width: 25, height: 30 },
      { tier: 'standard', label: 'General Area', capacity: 1000, x: 10, y: 50, width: 80, height: 40 }
    ]
  },
  {
    id: 'gala-dinner',
    name: 'Gala Dinner',
    description: 'Individual table-style seating arrangement',
    type: 'seats-only' as EventType,
    hasSeating: true,
    hasRegistration: false,
    individualSeats: [
      { id: 'T1', x: 25, y: 30, tier: 'vip', label: 'VIP Table 1' },
      { id: 'T2', x: 75, y: 30, tier: 'vip', label: 'VIP Table 2' },
      { id: 'T3', x: 20, y: 55, tier: 'premium', label: 'Premium 1' },
      { id: 'T4', x: 50, y: 55, tier: 'premium', label: 'Premium 2' },
      { id: 'T5', x: 80, y: 55, tier: 'premium', label: 'Premium 3' },
      { id: 'T6', x: 35, y: 75, tier: 'standard', label: 'Standard 1' },
      { id: 'T7', x: 65, y: 75, tier: 'standard', label: 'Standard 2' }
    ],
    basePrice: 200
  }
];

// Seat tier templates for dragging
const SEAT_TIER_TEMPLATES = [
  { tier: 'standard' as SeatTier, label: 'Standard Seat' },
  { tier: 'premium' as SeatTier, label: 'Premium Seat' },
  { tier: 'vip' as SeatTier, label: 'VIP Seat' },
];

// Individual seat templates for dragging (like restaurant tables)
const INDIVIDUAL_SEAT_TEMPLATES = [
  { tier: 'standard' as SeatTier, label: 'Standard Seat' },
  { tier: 'premium' as SeatTier, label: 'Premium Seat' },
  { tier: 'vip' as SeatTier, label: 'VIP Seat' },
];

// Helper function to get seat color classes (matches customer view exactly)
const getSeatColorClass = (tier: SeatTier, status: SeatStatus, isSelected: boolean) => {
  if (status === 'booked') {
    return 'bg-gray-900 border-gray-800 cursor-not-allowed opacity-60 text-gray-600';
  }
  
  if (isSelected) {
    return 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.7)] z-10 transform scale-110';
  }
  
  switch (tier) {
    case 'vip':
      return 'bg-amber-600/90 border-amber-500 text-amber-100 hover:bg-amber-500 hover:border-amber-400 hover:shadow-[0_0_10px_rgba(245,158,11,0.4)]';
    case 'premium':
      return 'bg-emerald-700/80 border-emerald-600 text-emerald-100 hover:bg-emerald-600 hover:border-emerald-500 hover:shadow-[0_0_10px_rgba(16,185,129,0.4)]';
    case 'standard':
    default:
      return 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:border-slate-500';
  }
};

// Draggable Individual Seat Component (actual seat styling)
const DraggableIndividualSeat: React.FC<{
  seat: IndividualSeat;
  isSelected: boolean;
  isPreviewMode: boolean;
  onSelect: () => void;
  onDrag: (x: number, y: number) => void;
}> = ({ seat, isSelected, isPreviewMode, onSelect, onDrag }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPreviewMode) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    onSelect();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    const newX = Math.max(5, Math.min(95, seat.x + (deltaX / 8)));
    const newY = Math.max(5, Math.min(95, seat.y + (deltaY / 8)));
    onDrag(newX, newY);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart, seat.x, seat.y, onDrag]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Actual seat styling (like customer view seats)
  const getSeatColorClass = () => {
    if (seat.status === 'booked') {
      return 'bg-gray-900 border-gray-800 cursor-not-allowed opacity-60 text-gray-600';
    }
    
    if (isSelected && !isPreviewMode) {
      return 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.7)] z-10 transform scale-110';
    }
    
    switch (seat.tier) {
      case 'vip':
        return 'bg-amber-600/90 border-amber-500 text-amber-100 hover:bg-amber-500 hover:border-amber-400 hover:shadow-[0_0_10px_rgba(245,158,11,0.4)]';
      case 'premium':
        return 'bg-emerald-700/80 border-emerald-600 text-emerald-100 hover:bg-emerald-600 hover:border-emerald-500 hover:shadow-[0_0_10px_rgba(16,185,129,0.4)]';
      case 'standard':
      default:
        return 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:border-slate-500';
    }
  };

  const colorClass = getSeatColorClass();

  return (
    <div 
      className="absolute flex items-center justify-center transition-all duration-300"
      style={{ 
        left: `${seat.x}%`, 
        top: `${seat.y}%`, 
        transform: 'translate(-50%, -50%)',
        zIndex: isSelected ? 20 : 10,
        cursor: isPreviewMode ? 'default' : (isDragging ? 'grabbing' : 'grab')
      }}
    >
      <button
        onMouseDown={handleMouseDown}
        disabled={seat.status === 'booked'}
        className={`w-8 h-9 rounded-t-lg border-t-4 transition-all duration-200 ease-in-out text-[10px] font-bold ${colorClass} ${
          !isSelected && seat.status !== 'booked' && !isPreviewMode ? 'hover:-translate-y-1' : ''
        }`}
        title={`${seat.tier.toUpperCase()} - ₹${seat.price}`}
        style={{
          cursor: isPreviewMode ? 'default' : (seat.status === 'booked' ? 'not-allowed' : 'pointer')
        }}
      >
        {seat.status !== 'booked' && seat.label}
      </button>
    </div>
  );
};

// Draggable Concert Area Component (for standing events)
const DraggableConcertArea: React.FC<{
  area: ConcertArea;
  isSelected: boolean;
  isPreviewMode: boolean;
  onSelect: () => void;
  onDrag: (x: number, y: number) => void;
  onResize: (width: number, height: number) => void;
}> = ({ area, isSelected, isPreviewMode, onSelect, onDrag, onResize }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPreviewMode) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    onSelect();
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (isPreviewMode) return;
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({ 
      width: area.width, 
      height: area.height, 
      x: e.clientX, 
      y: e.clientY 
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      const newX = Math.max(area.width/2, Math.min(100 - area.width/2, area.x + (deltaX / 8)));
      const newY = Math.max(area.height/2, Math.min(100 - area.height/2, area.y + (deltaY / 8)));
      onDrag(newX, newY);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      const newWidth = Math.max(10, Math.min(50, resizeStart.width + (deltaX / 8)));
      const newHeight = Math.max(10, Math.min(40, resizeStart.height + (deltaY / 8)));
      onResize(newWidth, newHeight);
    }
  }, [isDragging, isResizing, dragStart, resizeStart, area, onDrag, onResize]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  React.useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Get area styling based on tier
  const getAreaStyling = () => {
    switch (area.tier) {
      case 'vip':
        return {
          bg: 'bg-amber-600/30',
          border: 'border-amber-500',
          text: 'text-amber-200',
          shadow: 'shadow-amber-500/20'
        };
      case 'premium':
        return {
          bg: 'bg-emerald-600/30',
          border: 'border-emerald-500',
          text: 'text-emerald-200',
          shadow: 'shadow-emerald-500/20'
        };
      case 'standard':
      default:
        return {
          bg: 'bg-slate-600/30',
          border: 'border-slate-500',
          text: 'text-slate-200',
          shadow: 'shadow-slate-500/20'
        };
    }
  };

  const styling = getAreaStyling();

  return (
    <div
      className={`absolute border-2 rounded-lg transition-all duration-200 ${styling.bg} ${styling.border} ${styling.text} ${styling.shadow} ${
        isSelected && !isPreviewMode ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900' : ''
      }`}
      style={{
        left: `${area.x}%`,
        top: `${area.y}%`,
        width: `${area.width}%`,
        height: `${area.height}%`,
        transform: 'translate(-50%, -50%)',
        cursor: isPreviewMode ? 'default' : (isDragging ? 'grabbing' : 'grab'),
        zIndex: isSelected ? 20 : 10
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Area Content */}
      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
        <div className="font-bold text-sm uppercase tracking-wider">{area.label}</div>
        <div className="text-xs opacity-80 mt-1">{area.tier.toUpperCase()}</div>
        <div className="text-xs opacity-60 mt-1">{area.capacity} people</div>
        <div className="text-xs font-medium mt-1">₹{area.price}</div>
      </div>

      {/* Resize Handle */}
      {isSelected && !isPreviewMode && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-tl-lg cursor-se-resize opacity-80 hover:opacity-100"
          onMouseDown={handleResizeMouseDown}
        >
          <div className="absolute bottom-1 right-1 w-1 h-1 bg-white rounded-full"></div>
        </div>
      )}
    </div>
  );
};

// Draggable Seat Component (matches customer styling exactly)
const DraggableSeat: React.FC<{
  seat: Seat;
  isSelected: boolean;
  isPreviewMode: boolean;
  onSelect: () => void;
  onDrag: (rowLabel: string, number: number) => void;
}> = ({ seat, isSelected, isPreviewMode, onSelect, onDrag }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPreviewMode) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    onSelect();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    // For seats, we don't allow free dragging, they stay in grid positions
    // This is just for selection feedback
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const colorClass = getSeatColorClass(seat.tier, seat.status, isSelected);

  return (
    <button
      onMouseDown={handleMouseDown}
      disabled={seat.status === 'booked'}
      className={`w-8 h-9 rounded-t-lg border-t-4 transition-all duration-200 ease-in-out text-[10px] font-bold ${colorClass} ${
        !isSelected && seat.status !== 'booked' && !isPreviewMode ? 'hover:-translate-y-1' : ''
      }`}
      title={`${seat.tier.toUpperCase()} - ₹${seat.price}`}
      style={{
        cursor: isPreviewMode ? 'default' : (seat.status === 'booked' ? 'not-allowed' : 'pointer')
      }}
    >
      {seat.status !== 'booked' && seat.number}
    </button>
  );
};

// Main Event Seating Designer Component
const EventSeatingDesigner: React.FC<{ 
  businessId?: string; 
  onSave?: (seatingLayout: any) => void;
  initialData?: any;
}> = ({ businessId, onSave, initialData }) => {
  const [eventConfig, setEventConfig] = useState<EventSeatingConfig>({
    id: 'event-1',
    name: 'Sample Event',
    type: 'seats-only',
    capacity: 100,
    hasSeating: true,
    hasRegistration: false,
    basePrice: 50,
    tierPricing: {
      standard: { price: 50, defaultCapacity: 300 },
      premium: { price: 100, defaultCapacity: 200 },
      vip: { price: 200, defaultCapacity: 100 }
    },
    seatingLayout: {
      rows: 8,
      columns: 10,
      seats: []
    },
    individualSeats: [],
    concertAreas: []
  });

  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [selectedIndividualSeats, setSelectedIndividualSeats] = useState<string[]>([]);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [nextAreaId, setNextAreaId] = useState(1);
  const [nextSeatId, setNextSeatId] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Load initial data if provided
  React.useEffect(() => {
    if (initialData) {
      console.log('Loading initial seating data:', initialData);
      
      // Check if initialData is wrapped in eventConfig (saved format)
      const configData = initialData.eventConfig || initialData;
      
      console.log('Config data to load:', {
        hasSeatingLayout: !!configData.seatingLayout,
        seatsCount: configData.seatingLayout?.seats?.length || 0,
        individualSeatsCount: configData.individualSeats?.length || 0,
        concertAreasCount: configData.concertAreas?.length || 0
      });
      
      setEventConfig(prev => ({
        ...prev,
        ...configData,
        // Ensure required fields have defaults
        tierPricing: configData.tierPricing || prev.tierPricing,
        seatingLayout: configData.seatingLayout || prev.seatingLayout,
        individualSeats: configData.individualSeats || [],
        concertAreas: configData.concertAreas || []
      }));
      
      // Also restore selected states if available
      if (initialData.selectedSeats) {
        setSelectedSeats(initialData.selectedSeats);
      }
      if (initialData.selectedIndividualSeats) {
        setSelectedIndividualSeats(initialData.selectedIndividualSeats);
      }
      if (initialData.selectedArea) {
        setSelectedArea(initialData.selectedArea);
      }
    }
  }, [initialData]);

  // Initialize seating layout
  React.useEffect(() => {
    if (eventConfig.hasSeating && eventConfig.seatingLayout && eventConfig.seatingLayout.seats.length === 0 && !initialData) {
      generateInitialSeating();
    }
  }, []);

  // Handle event type change
  const handleEventTypeChange = (type: EventType) => {
    setEventConfig(prev => ({
      ...prev,
      type,
      hasSeating: type === 'seats-only' || type === 'seats-and-registration',
      hasRegistration: type === 'registration-only' || type === 'seats-and-registration',
      concertAreas: (type === 'registration-only' || type === 'seats-and-registration') ? (prev.concertAreas || []) : [],
      individualSeats: (type === 'seats-only' || type === 'seats-and-registration') ? (prev.individualSeats || []) : []
    }));
    
    // Clear selections when switching types
    setSelectedSeats([]);
    setSelectedIndividualSeats([]);
    setSelectedArea(null);
  };

  // Add individual seat
  const addIndividualSeat = (tier: SeatTier) => {
    const timestamp = Date.now();
    const newSeat: IndividualSeat = {
      id: `seat-${nextSeatId}-${timestamp}`, // Ensure uniqueness
      x: 50,
      y: 50,
      tier,
      price: eventConfig.tierPricing[tier].price,
      status: 'available',
      label: `${tier.charAt(0).toUpperCase()}${nextSeatId}`
    };

    setEventConfig(prev => ({
      ...prev,
      individualSeats: [...(prev.individualSeats || []), newSeat]
    }));
    
    setNextSeatId(prev => prev + 1);
    setSelectedIndividualSeats([newSeat.id]);
  };

  // Update individual seat position
  const updateIndividualSeatPosition = (seatId: string, x: number, y: number) => {
    setEventConfig(prev => ({
      ...prev,
      individualSeats: prev.individualSeats?.map(seat =>
        seat.id === seatId ? { ...seat, x, y } : seat
      ) || []
    }));
  };

  // Update individual seat properties
  const updateIndividualSeatProperty = (seatId: string, property: keyof IndividualSeat, value: any) => {
    setEventConfig(prev => ({
      ...prev,
      individualSeats: prev.individualSeats?.map(seat =>
        seat.id === seatId ? { ...seat, [property]: value } : seat
      ) || []
    }));
  };

  // Handle individual seat selection (multiple selection)
  const handleIndividualSeatClick = (seat: IndividualSeat) => {
    if (seat.status === 'booked') return;

    if (isPreviewMode) {
      // In preview mode, behave like customer view
      if (selectedIndividualSeats.includes(seat.id)) {
        setSelectedIndividualSeats(prev => prev.filter(id => id !== seat.id));
      } else {
        setSelectedIndividualSeats(prev => [...prev, seat.id]);
      }
    } else {
      // In design mode, allow multiple selection
      if (selectedIndividualSeats.includes(seat.id)) {
        setSelectedIndividualSeats(prev => prev.filter(id => id !== seat.id));
      } else {
        setSelectedIndividualSeats(prev => [...prev, seat.id]);
      }
    }
  };

  // Bulk update selected individual seats
  const bulkUpdateIndividualSeats = (property: keyof IndividualSeat, value: any) => {
    if (selectedIndividualSeats.length === 0) return;

    setEventConfig(prev => ({
      ...prev,
      individualSeats: prev.individualSeats?.map(seat => {
        if (selectedIndividualSeats.includes(seat.id)) {
          if (property === 'tier') {
            // Only update tier, let owner decide on price
            return { ...seat, [property]: value };
          }
          return { ...seat, [property]: value };
        }
        return seat;
      }) || []
    }));
  };

  // Delete individual seat
  const deleteIndividualSeat = (seatId: string) => {
    setEventConfig(prev => ({
      ...prev,
      individualSeats: prev.individualSeats?.filter(seat => seat.id !== seatId) || []
    }));
    setSelectedIndividualSeats(prev => prev.filter(id => id !== seatId));
  };

  // Delete selected individual seats
  const deleteSelectedIndividualSeats = () => {
    setEventConfig(prev => ({
      ...prev,
      individualSeats: prev.individualSeats?.filter(seat => !selectedIndividualSeats.includes(seat.id)) || []
    }));
    setSelectedIndividualSeats([]);
  };

  // Add row (empty row, owner chooses seats)
  const addRow = () => {
    if (!eventConfig.seatingLayout) return;

    const { rows } = eventConfig.seatingLayout;
    const newRowLabel = String.fromCharCode(65 + rows);

    setEventConfig(prev => ({
      ...prev,
      seatingLayout: {
        ...prev.seatingLayout!,
        rows: rows + 1
        // Don't add seats automatically
      }
    }));
  };

  // Remove row (and all its seats)
  const removeRow = () => {
    if (!eventConfig.seatingLayout || eventConfig.seatingLayout.rows <= 0) return;

    const { rows } = eventConfig.seatingLayout;
    const lastRowLabel = String.fromCharCode(65 + rows - 1);

    setEventConfig(prev => ({
      ...prev,
      seatingLayout: {
        ...prev.seatingLayout!,
        rows: rows - 1,
        seats: prev.seatingLayout!.seats.filter(seat => seat.rowLabel !== lastRowLabel)
      }
    }));
  };

  // Clear all rows and seats
  const clearAllRows = () => {
    setEventConfig(prev => ({
      ...prev,
      seatingLayout: {
        ...prev.seatingLayout!,
        rows: 0,
        seats: []
      }
    }));
    setSelectedSeats([]);
  };

  // Add concert area
  const addConcertArea = (tier: AreaTier) => {
    const newArea: ConcertArea = {
      id: `area-${nextAreaId}`,
      tier,
      x: 50,
      y: 50,
      width: 30,
      height: 20,
      capacity: eventConfig.tierPricing[tier].defaultCapacity,
      price: eventConfig.tierPricing[tier].price,
      label: `${tier.toUpperCase()} Area`
    };

    setEventConfig(prev => ({
      ...prev,
      concertAreas: [...(prev.concertAreas || []), newArea]
    }));
    
    setNextAreaId(prev => prev + 1);
    setSelectedArea(newArea.id);
  };

  // Update concert area position
  const updateAreaPosition = (areaId: string, x: number, y: number) => {
    setEventConfig(prev => ({
      ...prev,
      concertAreas: prev.concertAreas?.map(area =>
        area.id === areaId ? { ...area, x, y } : area
      ) || []
    }));
  };

  // Update concert area size
  const updateAreaSize = (areaId: string, width: number, height: number) => {
    setEventConfig(prev => ({
      ...prev,
      concertAreas: prev.concertAreas?.map(area =>
        area.id === areaId ? { ...area, width, height } : area
      ) || []
    }));
  };

  // Update concert area properties
  const updateAreaProperty = (areaId: string, property: keyof ConcertArea, value: any) => {
    setEventConfig(prev => ({
      ...prev,
      concertAreas: prev.concertAreas?.map(area =>
        area.id === areaId ? { ...area, [property]: value } : area
      ) || []
    }));
  };

  // Delete concert area
  const deleteArea = (areaId: string) => {
    setEventConfig(prev => ({
      ...prev,
      concertAreas: prev.concertAreas?.filter(area => area.id !== areaId) || []
    }));
    setSelectedArea(null);
  };

  // Apply event template
  const applyEventTemplate = (template: typeof EVENT_TEMPLATES[0]) => {
    if (template.type === 'seats-only' && template.rows && template.columns) {
      // Traditional row-based seating
      setEventConfig(prev => ({
        ...prev,
        type: template.type,
        hasSeating: template.hasSeating,
        hasRegistration: template.hasRegistration || false,
        basePrice: template.basePrice,
        tierPricing: {
          standard: { price: template.basePrice, defaultCapacity: 300 },
          premium: { price: template.basePrice * 2, defaultCapacity: 200 },
          vip: { price: template.basePrice * 3, defaultCapacity: 100 }
        },
        seatingLayout: {
          rows: template.rows || 8,
          columns: template.columns || 10,
          seats: []
        },
        individualSeats: [],
        concertAreas: []
      }));
      generateInitialSeating();
    } else if (template.type === 'seats-only' && template.individualSeats) {
      // Individual draggable seats
      const tierPricing = {
        standard: { price: template.basePrice, defaultCapacity: 300 },
        premium: { price: template.basePrice * 2, defaultCapacity: 200 },
        vip: { price: template.basePrice * 3, defaultCapacity: 100 }
      };
      
      const seats = template.individualSeats.map((seat, index) => ({
        id: `seat-${index + 1}-${Date.now()}`, // Ensure uniqueness
        x: seat.x,
        y: seat.y,
        tier: seat.tier as SeatTier,
        price: tierPricing[seat.tier as SeatTier].price,
        status: 'available' as SeatStatus,
        label: seat.label
      }));

      setEventConfig(prev => ({
        ...prev,
        type: template.type,
        hasSeating: template.hasSeating,
        hasRegistration: template.hasRegistration || false,
        basePrice: template.basePrice,
        tierPricing,
        seatingLayout: undefined,
        individualSeats: seats,
        concertAreas: []
      }));
      
      setNextSeatId(seats.length + 1);
    } else if (template.type === 'registration-only') {
      // Registration areas only
      const tierPricing = {
        standard: { price: template.basePrice, defaultCapacity: 300 },
        premium: { price: template.basePrice * 2, defaultCapacity: 200 },
        vip: { price: template.basePrice * 3, defaultCapacity: 100 }
      };
      
      const areas = template.areas?.map((area, index) => ({
        id: `area-${index + 1}`,
        tier: area.tier as AreaTier,
        x: area.x,
        y: area.y,
        width: area.width,
        height: area.height,
        capacity: area.capacity,
        price: tierPricing[area.tier as AreaTier].price,
        label: area.label
      })) || [];

      setEventConfig(prev => ({
        ...prev,
        type: template.type,
        hasSeating: template.hasSeating,
        hasRegistration: template.hasRegistration || true,
        basePrice: template.basePrice,
        tierPricing,
        seatingLayout: undefined,
        individualSeats: [],
        concertAreas: areas
      }));
      
      setNextAreaId(areas.length + 1);
    } else if (template.type === 'seats-and-registration') {
      // Mixed: both seating and registration areas
      const tierPricing = {
        standard: { price: template.basePrice, defaultCapacity: 300 },
        premium: { price: template.basePrice * 2, defaultCapacity: 200 },
        vip: { price: template.basePrice * 3, defaultCapacity: 100 }
      };
      
      const areas = template.areas?.map((area, index) => ({
        id: `area-${index + 1}`,
        tier: area.tier as AreaTier,
        x: area.x,
        y: area.y,
        width: area.width,
        height: area.height,
        capacity: area.capacity,
        price: tierPricing[area.tier as AreaTier].price,
        label: area.label
      })) || [];

      setEventConfig(prev => ({
        ...prev,
        type: template.type,
        hasSeating: template.hasSeating,
        hasRegistration: template.hasRegistration || true,
        basePrice: template.basePrice,
        tierPricing,
        seatingLayout: {
          rows: template.rows || 8,
          columns: template.columns || 10,
          seats: []
        },
        individualSeats: [],
        concertAreas: areas
      }));
      
      generateInitialSeating();
      setNextAreaId(areas.length + 1);
    }
    
    setShowTemplates(false);
    setSelectedSeats([]);
    setSelectedIndividualSeats([]);
    setSelectedArea(null);
  };

  const generateInitialSeating = () => {
    if (!eventConfig.seatingLayout) return;

    // Don't automatically generate seats - let owner choose
    setEventConfig(prev => ({
      ...prev,
      seatingLayout: {
        ...prev.seatingLayout!,
        seats: [] // Start with empty seats
      }
    }));
  };

  // Clear seats from specific row
  const clearRowSeats = (rowLabel: string) => {
    if (!eventConfig.seatingLayout) return;

    setEventConfig(prev => ({
      ...prev,
      seatingLayout: {
        ...prev.seatingLayout!,
        seats: prev.seatingLayout!.seats.filter(seat => seat.rowLabel !== rowLabel)
      }
    }));
    
    // Clear selections for removed seats
    setSelectedSeats(prev => prev.filter(id => !id.startsWith(rowLabel + '-')));
  };

  // Add seats to specific row with chosen tier
  const addSeatsToRow = (rowLabel: string, tier: SeatTier, count: number = 10) => {
    if (!eventConfig.seatingLayout) return;

    // Get existing seats in this row to determine next seat number
    const existingRowSeats = eventConfig.seatingLayout.seats.filter(s => s.rowLabel === rowLabel);
    const maxSeatNumber = existingRowSeats.length > 0 
      ? Math.max(...existingRowSeats.map(s => s.number))
      : 0;

    const newSeats: Seat[] = [];
    const price = eventConfig.tierPricing[tier].price;

    for (let j = 1; j <= count; j++) {
      const seatNumber = maxSeatNumber + j;
      const seatId = `${rowLabel}-${seatNumber}`;
      
      // Check if seat ID already exists (safety check)
      const existingSeat = eventConfig.seatingLayout.seats.find(s => s.id === seatId);
      if (!existingSeat) {
        newSeats.push({
          id: seatId,
          rowLabel,
          number: seatNumber,
          status: 'available',
          tier,
          price,
        });
      }
    }

    setEventConfig(prev => ({
      ...prev,
      seatingLayout: {
        ...prev.seatingLayout!,
        seats: [...prev.seatingLayout!.seats, ...newSeats]
      }
    }));
  };

  // Save seating layout
  const saveSeatingLayout = async () => {
    if (!businessId && !onSave) {
      console.warn('No businessId provided and no onSave callback - cannot save seating layout');
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const seatingLayoutData = {
        eventConfig,
        selectedSeats,
        selectedIndividualSeats,
        selectedArea,
        metadata: {
          version: '1.0',
          lastModified: new Date().toISOString(),
          totalSeats: eventConfig.seatingLayout?.seats.length || 0,
          totalIndividualSeats: eventConfig.individualSeats?.length || 0,
          totalAreas: eventConfig.concertAreas?.length || 0
        }
      };

      if (onSave) {
        // Use callback if provided (for business onboarding)
        onSave(seatingLayoutData);
        setSaveMessage('Seating layout saved successfully!');
      } else if (businessId) {
        // Save to business API
        const { businessApi } = await import('../services/api');
        await businessApi.update(businessId, { seatingLayout: seatingLayoutData });
        setSaveMessage('Seating layout saved to business successfully!');
      }

      // Clear message after 3 seconds
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('Error saving seating layout:', error);
      setSaveMessage('Error saving seating layout. Please try again.');
      setTimeout(() => setSaveMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Convert seats to rows for display (matches customer view)
  const seatsToRows = (seats: Seat[]): Row[] => {
    const rowMap = new Map<string, Seat[]>();
    
    seats.forEach(seat => {
      if (!rowMap.has(seat.rowLabel)) {
        rowMap.set(seat.rowLabel, []);
      }
      rowMap.get(seat.rowLabel)!.push(seat);
    });
    
    const rows: Row[] = [];
    rowMap.forEach((seats, rowLabel) => {
      rows.push({
        rowLabel,
        seats: seats.sort((a, b) => a.number - b.number)
      });
    });
    
    return rows.sort((a, b) => a.rowLabel.localeCompare(b.rowLabel));
  };

  const handleSeatClick = (seat: Seat) => {
    if (seat.status === 'booked') return;

    if (isPreviewMode) {
      // In preview mode, behave like customer view
      if (selectedSeats.includes(seat.id)) {
        setSelectedSeats(prev => prev.filter(id => id !== seat.id));
      } else {
        setSelectedSeats(prev => [...prev, seat.id]);
      }
    } else {
      // In design mode, select for editing
      if (selectedSeats.includes(seat.id)) {
        setSelectedSeats(prev => prev.filter(id => id !== seat.id));
      } else {
        setSelectedSeats([seat.id]); // Single selection for editing
      }
    }
  };

  const updateSeatTier = (seatId: string, tier: SeatTier) => {
    if (!eventConfig.seatingLayout) return;

    const newPrice = eventConfig.tierPricing[tier].price;

    setEventConfig(prev => ({
      ...prev,
      seatingLayout: {
        ...prev.seatingLayout!,
        seats: prev.seatingLayout!.seats.map(seat =>
          seat.id === seatId ? { ...seat, tier, price: newPrice } : seat
        )
      }
    }));
  };

  // Update individual row seat property
  const updateSeatProperty = (seatId: string, property: keyof Seat, value: any) => {
    if (!eventConfig.seatingLayout) return;

    setEventConfig(prev => ({
      ...prev,
      seatingLayout: {
        ...prev.seatingLayout!,
        seats: prev.seatingLayout!.seats.map(seat =>
          seat.id === seatId ? { ...seat, [property]: value } : seat
        )
      }
    }));
  };

  const deleteSeat = (seatId: string) => {
    if (!eventConfig.seatingLayout) return;

    setEventConfig(prev => ({
      ...prev,
      seatingLayout: {
        ...prev.seatingLayout!,
        seats: prev.seatingLayout!.seats.filter(seat => seat.id !== seatId)
      }
    }));
    setSelectedSeats(prev => prev.filter(id => id !== seatId));
  };

  // Bulk update selected row seats
  const bulkUpdateRowSeats = (property: keyof Seat, value: any) => {
    if (selectedSeats.length === 0) return;

    setEventConfig(prev => ({
      ...prev,
      seatingLayout: prev.seatingLayout ? {
        ...prev.seatingLayout,
        seats: prev.seatingLayout.seats.map(seat => {
          if (selectedSeats.includes(seat.id)) {
            if (property === 'tier') {
              // Only update tier, let owner decide on price
              return { ...seat, [property]: value };
            }
            return { ...seat, [property]: value };
          }
          return seat;
        })
      } : undefined
    }));
  };

  const selectedSeat = selectedSeats.length === 1 && eventConfig.seatingLayout
    ? eventConfig.seatingLayout.seats.find(s => s.id === selectedSeats[0])
    : null;

  const layout = eventConfig.seatingLayout ? seatsToRows(eventConfig.seatingLayout.seats) : [];

  return (
    <div className="flex h-full min-h-[700px] bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Left Sidebar - Controls */}
      <div className="w-96 bg-white border-r border-slate-200 flex flex-col shadow-lg">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-teal-50">
          <h2 className="text-xl font-bold text-slate-800 mb-3">Event Seating Designer</h2>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                isPreviewMode 
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
              }`}
            >
              <Eye size={18} />
              {isPreviewMode ? 'Design Mode' : 'Preview'}
            </button>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                showGrid 
                  ? 'bg-slate-700 text-white' 
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-300'
              }`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-all text-sm font-semibold border border-blue-200"
            >
              <Copy size={18} />
              Templates
            </button>
          </div>
          
          {/* Save Button - Always Visible at Top */}
          <div className="space-y-2">
            {saveMessage && (
              <div className={`text-xs p-2 rounded-lg text-center ${
                saveMessage.includes('Error') 
                  ? 'bg-red-50 text-red-700 border border-red-200' 
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {saveMessage}
              </div>
            )}
            <button 
              onClick={saveSeatingLayout}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl text-base"
            >
              <Save size={20} />
              {isSaving ? 'Saving...' : 'Save Layout'}
            </button>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          {!isPreviewMode && (
          <>
            {/* Templates Section */}
            {showTemplates && (
              <div className="p-6 border-b border-slate-200 bg-slate-50">
                <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={16} />
                  Quick Start Templates
                </h3>
                <div className="space-y-3">
                  {EVENT_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => applyEventTemplate(template)}
                      className="w-full text-left p-4 bg-white hover:bg-emerald-50 rounded-xl transition-all border border-slate-200 hover:border-emerald-300 hover:shadow-md group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
                          {template.type === 'seats-only' ? <Theater size={18} className="text-emerald-700" /> : <Music size={18} className="text-emerald-700" />}
                        </div>
                        <div className="text-base font-semibold text-slate-800">{template.name}</div>
                      </div>
                      <div className="text-xs text-slate-400 mb-1">{template.description}</div>
                      <div className="text-xs text-slate-500">
                        {template.type === 'seats-only' 
                          ? `${template.rows ? `${template.rows}x${template.columns} seating` : `${template.individualSeats?.length || 0} individual seats`}` 
                          : `${template.areas?.length || 0} areas`
                        } • ₹{template.basePrice}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Event Type Selection */}
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider flex items-center gap-2">
                <Settings size={16} />
                EVENT TYPE
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => handleEventTypeChange('seats-only')}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all border-2 ${
                    eventConfig.type === 'seats-only' 
                      ? 'bg-emerald-50 border-emerald-500 shadow-md' 
                      : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm'
                  }`}
                >
                  <div className={`p-3 rounded-lg ${eventConfig.type === 'seats-only' ? 'bg-emerald-500' : 'bg-slate-100'}`}>
                    <Theater size={20} className={eventConfig.type === 'seats-only' ? 'text-white' : 'text-slate-600'} />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-base font-semibold text-slate-800">Seats Only</div>
                    <div className="text-sm text-slate-600">Traditional seating with assigned seats</div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleEventTypeChange('registration-only')}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all border-2 ${
                    eventConfig.type === 'registration-only' 
                      ? 'bg-emerald-50 border-emerald-500 shadow-md' 
                      : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm'
                  }`}
                >
                  <div className={`p-3 rounded-lg ${eventConfig.type === 'registration-only' ? 'bg-emerald-500' : 'bg-slate-100'}`}>
                    <Music size={20} className={eventConfig.type === 'registration-only' ? 'text-white' : 'text-slate-600'} />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-base font-semibold text-slate-800">Registration Only</div>
                    <div className="text-sm text-slate-600">General admission areas for registration</div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleEventTypeChange('seats-and-registration')}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all border-2 ${
                    eventConfig.type === 'seats-and-registration' 
                      ? 'bg-emerald-50 border-emerald-500 shadow-md' 
                      : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-sm'
                  }`}
                >
                  <div className={`p-3 rounded-lg ${eventConfig.type === 'seats-and-registration' ? 'bg-emerald-500' : 'bg-slate-100'}`}>
                    <Users size={20} className={eventConfig.type === 'seats-and-registration' ? 'text-white' : 'text-slate-600'} />
                  </div>
                  <div className="text-left flex-1">
                    <div className="text-base font-semibold text-slate-800">Seats + Registration</div>
                    <div className="text-sm text-slate-600">Both seating and registration areas</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Event Configuration */}
            <div className="p-6 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Event Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Event Name</label>
                  <input
                    type="text"
                    value={eventConfig.name}
                    onChange={(e) => setEventConfig(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Base Price (₹)</label>
                  <input
                    type="number"
                    min="1"
                    value={eventConfig.basePrice}
                    onChange={(e) => setEventConfig(prev => ({ ...prev, basePrice: parseInt(e.target.value) || 50 }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Tier Pricing Configuration */}
            <div className="p-4 border-b border-slate-700/50">
              <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Tier Pricing & Capacity</h3>
              <div className="space-y-4">
                {/* VIP Tier */}
                <div className="bg-amber-600/10 border border-amber-600/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 bg-amber-600 rounded"></div>
                    <span className="text-sm font-medium text-amber-400">VIP Tier</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Price (₹)</label>
                      <input
                        type="number"
                        min="1"
                        value={eventConfig.tierPricing.vip.price}
                        onChange={(e) => setEventConfig(prev => ({
                          ...prev,
                          tierPricing: {
                            ...prev.tierPricing,
                            vip: { ...prev.tierPricing.vip, price: parseInt(e.target.value) || 200 }
                          }
                        }))}
                        className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Default Capacity</label>
                      <input
                        type="number"
                        min="1"
                        value={eventConfig.tierPricing.vip.defaultCapacity}
                        onChange={(e) => setEventConfig(prev => ({
                          ...prev,
                          tierPricing: {
                            ...prev.tierPricing,
                            vip: { ...prev.tierPricing.vip, defaultCapacity: parseInt(e.target.value) || 100 }
                          }
                        }))}
                        className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Premium Tier */}
                <div className="bg-emerald-600/10 border border-emerald-600/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 bg-emerald-600 rounded"></div>
                    <span className="text-sm font-medium text-emerald-400">Premium Tier</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Price (₹)</label>
                      <input
                        type="number"
                        min="1"
                        value={eventConfig.tierPricing.premium.price}
                        onChange={(e) => setEventConfig(prev => ({
                          ...prev,
                          tierPricing: {
                            ...prev.tierPricing,
                            premium: { ...prev.tierPricing.premium, price: parseInt(e.target.value) || 100 }
                          }
                        }))}
                        className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Default Capacity</label>
                      <input
                        type="number"
                        min="1"
                        value={eventConfig.tierPricing.premium.defaultCapacity}
                        onChange={(e) => setEventConfig(prev => ({
                          ...prev,
                          tierPricing: {
                            ...prev.tierPricing,
                            premium: { ...prev.tierPricing.premium, defaultCapacity: parseInt(e.target.value) || 200 }
                          }
                        }))}
                        className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Standard Tier */}
                <div className="bg-slate-600/10 border border-slate-600/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 bg-slate-600 rounded"></div>
                    <span className="text-sm font-medium text-slate-400">Standard Tier</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Price (₹)</label>
                      <input
                        type="number"
                        min="1"
                        value={eventConfig.tierPricing.standard.price}
                        onChange={(e) => setEventConfig(prev => ({
                          ...prev,
                          tierPricing: {
                            ...prev.tierPricing,
                            standard: { ...prev.tierPricing.standard, price: parseInt(e.target.value) || 50 }
                          }
                        }))}
                        className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Default Capacity</label>
                      <input
                        type="number"
                        min="1"
                        value={eventConfig.tierPricing.standard.defaultCapacity}
                        onChange={(e) => setEventConfig(prev => ({
                          ...prev,
                          tierPricing: {
                            ...prev.tierPricing,
                            standard: { ...prev.tierPricing.standard, defaultCapacity: parseInt(e.target.value) || 300 }
                          }
                        }))}
                        className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Individual Seats (for seats-only events) */}
            {eventConfig.hasSeating && (eventConfig.type === 'seats-only' || eventConfig.type === 'seats-and-registration') && (
              <div className="p-4 border-b border-slate-700/50">
                <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Individual Seats</h3>
                <div className="space-y-2 mb-4">
                  <button
                    onClick={() => addIndividualSeat('vip')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                    Add VIP Seat
                  </button>
                  <button
                    onClick={() => addIndividualSeat('premium')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                    Add Premium Seat
                  </button>
                  <button
                    onClick={() => addIndividualSeat('standard')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-600/20 hover:bg-slate-600/30 text-slate-400 rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                    Add Standard Seat
                  </button>
                </div>
                
                {/* Individual Seats List */}
                {eventConfig.individualSeats && eventConfig.individualSeats.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Existing Seats</h4>
                    {eventConfig.individualSeats.map((seat) => (
                      <div key={seat.id} className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedIndividualSeats.includes(seat.id)}
                            onChange={() => {
                              if (selectedIndividualSeats.includes(seat.id)) {
                                setSelectedIndividualSeats(prev => prev.filter(id => id !== seat.id));
                              } else {
                                setSelectedIndividualSeats(prev => [...prev, seat.id]);
                              }
                            }}
                            className="w-3 h-3 rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
                          />
                          <div className={`w-3 h-3 rounded border ${
                            seat.tier === 'vip' ? 'bg-amber-600 border-amber-500' :
                            seat.tier === 'premium' ? 'bg-emerald-600 border-emerald-500' :
                            'bg-slate-600 border-slate-500'
                          }`} />
                          <span className={`text-sm ${selectedIndividualSeats.includes(seat.id) ? 'text-emerald-400 font-medium' : 'text-slate-300'}`}>
                            {seat.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => deleteIndividualSeat(seat.id)}
                            className="p-1 text-red-400 hover:bg-red-600/20 rounded"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Bulk Operations for Individual Seats */}
                    {selectedIndividualSeats.length > 0 && (
                      <div className="mt-3 p-3 bg-emerald-900/20 rounded-lg border border-emerald-700/50">
                        <h4 className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-2">
                          Bulk Update ({selectedIndividualSeats.length} seats)
                        </h4>
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-1">
                            <button
                              onClick={() => bulkUpdateIndividualSeats('tier', 'vip')}
                              className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded text-xs"
                            >
                              → VIP
                            </button>
                            <button
                              onClick={() => bulkUpdateIndividualSeats('tier', 'premium')}
                              className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded text-xs"
                            >
                              → Premium
                            </button>
                            <button
                              onClick={() => bulkUpdateIndividualSeats('tier', 'standard')}
                              className="px-2 py-1 bg-slate-600/20 hover:bg-slate-600/30 text-slate-400 rounded text-xs"
                            >
                              → Standard
                            </button>
                          </div>
                          
                          {/* Bulk Price Controls */}
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-emerald-400">Set Custom Price (₹)</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="1"
                                placeholder="Enter price"
                                className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 text-xs"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    const price = parseInt((e.target as HTMLInputElement).value);
                                    if (price > 0) {
                                      bulkUpdateIndividualSeats('price', price);
                                      (e.target as HTMLInputElement).value = '';
                                    }
                                  }
                                }}
                              />
                              <button
                                onClick={(e) => {
                                  const input = (e.target as HTMLElement).parentElement?.querySelector('input') as HTMLInputElement;
                                  const price = parseInt(input?.value || '0');
                                  if (price > 0) {
                                    bulkUpdateIndividualSeats('price', price);
                                    input.value = '';
                                  }
                                }}
                                className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded text-xs"
                              >
                                Apply
                              </button>
                            </div>
                            
                            {/* Quick Price Buttons */}
                            <div className="grid grid-cols-3 gap-1">
                              <button
                                onClick={() => bulkUpdateIndividualSeats('price', eventConfig.tierPricing.vip.price)}
                                className="px-2 py-1 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 rounded text-xs"
                              >
                                VIP: ₹{eventConfig.tierPricing.vip.price}
                              </button>
                              <button
                                onClick={() => bulkUpdateIndividualSeats('price', eventConfig.tierPricing.premium.price)}
                                className="px-2 py-1 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 rounded text-xs"
                              >
                                Premium: ₹{eventConfig.tierPricing.premium.price}
                              </button>
                              <button
                                onClick={() => bulkUpdateIndividualSeats('price', eventConfig.tierPricing.standard.price)}
                                className="px-2 py-1 bg-slate-600/10 hover:bg-slate-600/20 text-slate-400 rounded text-xs"
                              >
                                Standard: ₹{eventConfig.tierPricing.standard.price}
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={deleteSelectedIndividualSeats}
                            className="w-full px-2 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs"
                          >
                            Delete Selected
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Concert Areas (for registration events) */}
            {eventConfig.hasRegistration && (eventConfig.type === 'registration-only' || eventConfig.type === 'seats-and-registration') && (
              <div className="p-4 border-b border-slate-700/50">
                <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Concert Areas</h3>
                <div className="space-y-2 mb-4">
                  <button
                    onClick={() => addConcertArea('vip')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                    Add VIP Area
                  </button>
                  <button
                    onClick={() => addConcertArea('premium')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                    Add Premium Area
                  </button>
                  <button
                    onClick={() => addConcertArea('standard')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-600/20 hover:bg-slate-600/30 text-slate-400 rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                    Add Standard Area
                  </button>
                </div>
                
                {/* Area List */}
                {eventConfig.concertAreas && eventConfig.concertAreas.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Existing Areas</h4>
                    {eventConfig.concertAreas.map((area) => (
                      <div key={area.id} className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Square size={14} className={
                            area.tier === 'vip' ? 'text-amber-400' :
                            area.tier === 'premium' ? 'text-emerald-400' :
                            'text-slate-400'
                          } />
                          <span className={`text-sm ${area.id === selectedArea ? 'text-emerald-400 font-medium' : 'text-slate-300'}`}>
                            {area.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedArea(area.id)}
                            className={`px-2 py-1 text-xs rounded ${
                              area.id === selectedArea 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                            }`}
                          >
                            {area.id === selectedArea ? 'Selected' : 'Select'}
                          </button>
                          <button
                            onClick={() => deleteArea(area.id)}
                            className="p-1 text-red-400 hover:bg-red-600/20 rounded"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Seating Layout Controls (for row-based seating) */}
            {eventConfig.hasSeating && eventConfig.seatingLayout && (
              <div className="p-4 border-b border-slate-700/50">
                <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Row Management</h3>
                <div className="space-y-2 mb-4">
                  <button
                    onClick={addRow}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg transition-colors"
                  >
                    <Plus size={16} />
                    Add Empty Row
                  </button>
                  <button
                    onClick={removeRow}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                    Remove Last Row
                  </button>
                  <button
                    onClick={clearAllRows}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-700/20 hover:bg-red-700/30 text-red-300 rounded-lg transition-colors"
                  >
                    <X size={16} />
                    Clear All Rows
                  </button>
                </div>

                {/* Add Seats to Rows */}
                {eventConfig.seatingLayout.rows > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Add Seats to Rows</h4>
                    {Array.from({ length: eventConfig.seatingLayout.rows }, (_, i) => {
                      const rowLabel = String.fromCharCode(65 + i);
                      const rowSeats = eventConfig.seatingLayout?.seats.filter(s => s.rowLabel === rowLabel) || [];
                      
                      return (
                        <div key={rowLabel} className="bg-slate-700/30 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-200">Row {rowLabel}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">{rowSeats.length} seats</span>
                              {rowSeats.length > 0 && (
                                <button
                                  onClick={() => clearRowSeats(rowLabel)}
                                  className="p-1 text-red-400 hover:bg-red-600/20 rounded"
                                  title="Clear all seats from this row"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            <button
                              onClick={() => addSeatsToRow(rowLabel, 'vip', 8)}
                              className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded text-xs"
                            >
                              + VIP (8)
                            </button>
                            <button
                              onClick={() => addSeatsToRow(rowLabel, 'premium', 10)}
                              className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded text-xs"
                            >
                              + Premium (10)
                            </button>
                            <button
                              onClick={() => addSeatsToRow(rowLabel, 'standard', 12)}
                              className="px-2 py-1 bg-slate-600/20 hover:bg-slate-600/30 text-slate-400 rounded text-xs"
                            >
                              + Standard (12)
                            </button>
                          </div>
                          {rowSeats.length > 0 && (
                            <div className="mt-2 text-xs text-slate-500">
                              Tiers: {[...new Set(rowSeats.map(s => s.tier))].join(', ')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Bulk Operations for Row Seats */}
                {selectedSeats.length > 0 && (
                  <div className="mt-4 p-3 bg-emerald-900/20 rounded-lg border border-emerald-700/50">
                    <h4 className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-2">
                      Bulk Update ({selectedSeats.length} seats)
                    </h4>
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          onClick={() => bulkUpdateRowSeats('tier', 'vip')}
                          className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded text-xs"
                        >
                          → VIP
                        </button>
                        <button
                          onClick={() => bulkUpdateRowSeats('tier', 'premium')}
                          className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded text-xs"
                        >
                          → Premium
                        </button>
                        <button
                          onClick={() => bulkUpdateRowSeats('tier', 'standard')}
                          className="px-2 py-1 bg-slate-600/20 hover:bg-slate-600/30 text-slate-400 rounded text-xs"
                        >
                          → Standard
                        </button>
                      </div>
                      
                      {/* Bulk Price Controls */}
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-emerald-400">Set Custom Price (₹)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            placeholder="Enter price"
                            className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 text-xs"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                const price = parseInt((e.target as HTMLInputElement).value);
                                if (price > 0) {
                                  bulkUpdateRowSeats('price', price);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }
                            }}
                          />
                          <button
                            onClick={(e) => {
                              const input = (e.target as HTMLElement).parentElement?.querySelector('input') as HTMLInputElement;
                              const price = parseInt(input?.value || '0');
                              if (price > 0) {
                                bulkUpdateRowSeats('price', price);
                                input.value = '';
                              }
                            }}
                            className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded text-xs"
                          >
                            Apply
                          </button>
                        </div>
                        
                        {/* Quick Price Buttons */}
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            onClick={() => bulkUpdateRowSeats('price', eventConfig.tierPricing.vip.price)}
                            className="px-2 py-1 bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 rounded text-xs"
                          >
                            VIP: ₹{eventConfig.tierPricing.vip.price}
                          </button>
                          <button
                            onClick={() => bulkUpdateRowSeats('price', eventConfig.tierPricing.premium.price)}
                            className="px-2 py-1 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 rounded text-xs"
                          >
                            Premium: ₹{eventConfig.tierPricing.premium.price}
                          </button>
                          <button
                            onClick={() => bulkUpdateRowSeats('price', eventConfig.tierPricing.standard.price)}
                            className="px-2 py-1 bg-slate-600/10 hover:bg-slate-600/20 text-slate-400 rounded text-xs"
                          >
                            Standard: ₹{eventConfig.tierPricing.standard.price}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Seat Tier Templates (for row-based seating) */}
            {eventConfig.hasSeating && eventConfig.seatingLayout && (
              <div className="p-4 border-b border-slate-700/50">
                <h3 className="text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Seat Tiers</h3>
                <div className="space-y-2">
                  {SEAT_TIER_TEMPLATES.map((template) => (
                    <div
                      key={template.tier}
                      className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded border-t-2 ${
                          template.tier === 'vip' ? 'bg-amber-600 border-amber-500' :
                          template.tier === 'premium' ? 'bg-emerald-700 border-emerald-600' :
                          'bg-slate-700 border-slate-600'
                        }`}></div>
                        <div>
                          <div className="text-sm font-medium text-slate-200">{template.label}</div>
                          <div className="text-xs text-slate-400">₹{eventConfig.tierPricing[template.tier].price}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Properties Panel */}
        {selectedSeat && !isPreviewMode && (
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Seat Properties</h3>
              <button
                onClick={() => deleteSeat(selectedSeat.id)}
                className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Seat ID</label>
                <input
                  type="text"
                  value={selectedSeat.id}
                  disabled
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-400 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Tier</label>
                <select
                  value={selectedSeat.tier}
                  onChange={(e) => {
                    const newTier = e.target.value as SeatTier;
                    updateSeatProperty(selectedSeat.id, 'tier', newTier);
                    // Ask owner if they want to update price to tier default
                    if (window.confirm(`Update price to ${newTier} tier default (₹${eventConfig.tierPricing[newTier].price})?`)) {
                      updateSeatProperty(selectedSeat.id, 'price', eventConfig.tierPricing[newTier].price);
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
                >
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="vip">VIP</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Price (₹)</label>
                <input
                  type="number"
                  min="1"
                  value={selectedSeat.price}
                  onChange={(e) => updateSeatProperty(selectedSeat.id, 'price', parseInt(e.target.value) || eventConfig.tierPricing[selectedSeat.tier].price)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Individual Seat Properties Panel */}
        {selectedIndividualSeats.length > 0 && !isPreviewMode && (
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                {selectedIndividualSeats.length === 1 ? 'Seat Properties' : `${selectedIndividualSeats.length} Seats Selected`}
              </h3>
              <button
                onClick={deleteSelectedIndividualSeats}
                className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {selectedIndividualSeats.length === 1 ? (
              // Single seat editing
              (() => {
                const seat = eventConfig.individualSeats?.find(s => s.id === selectedIndividualSeats[0]);
                if (!seat) return null;

                return (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">Seat Label</label>
                      <input
                        type="text"
                        value={seat.label}
                        onChange={(e) => updateIndividualSeatProperty(seat.id, 'label', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">Tier</label>
                      <select
                        value={seat.tier}
                        onChange={(e) => {
                          const newTier = e.target.value as SeatTier;
                          updateIndividualSeatProperty(seat.id, 'tier', newTier);
                          // Ask owner if they want to update price to tier default
                          if (window.confirm(`Update price to ${newTier} tier default (₹${eventConfig.tierPricing[newTier].price})?`)) {
                            updateIndividualSeatProperty(seat.id, 'price', eventConfig.tierPricing[newTier].price);
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
                      >
                        <option value="standard">Standard</option>
                        <option value="premium">Premium</option>
                        <option value="vip">VIP</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">Price (₹)</label>
                      <input
                        type="number"
                        min="1"
                        value={seat.price}
                        onChange={(e) => updateIndividualSeatProperty(seat.id, 'price', parseInt(e.target.value) || eventConfig.basePrice)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">X Position (%)</label>
                        <input
                          type="number"
                          min="5"
                          max="95"
                          value={Math.round(seat.x)}
                          onChange={(e) => updateIndividualSeatProperty(seat.id, 'x', parseInt(e.target.value) || 50)}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">Y Position (%)</label>
                        <input
                          type="number"
                          min="5"
                          max="95"
                          value={Math.round(seat.y)}
                          onChange={(e) => updateIndividualSeatProperty(seat.id, 'y', parseInt(e.target.value) || 50)}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              // Multiple seats bulk editing
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Bulk Update Tier</label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => bulkUpdateIndividualSeats('tier', 'vip')}
                      className="w-full px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg transition-colors"
                    >
                      Set All to VIP
                    </button>
                    <button
                      onClick={() => bulkUpdateIndividualSeats('tier', 'premium')}
                      className="w-full px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg transition-colors"
                    >
                      Set All to Premium
                    </button>
                    <button
                      onClick={() => bulkUpdateIndividualSeats('tier', 'standard')}
                      className="w-full px-3 py-2 bg-slate-600/20 hover:bg-slate-600/30 text-slate-400 rounded-lg transition-colors"
                    >
                      Set All to Standard
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Clear Selection</label>
                  <button
                    onClick={() => setSelectedIndividualSeats([])}
                    className="w-full px-3 py-2 bg-slate-600/20 hover:bg-slate-600/30 text-slate-400 rounded-lg transition-colors"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Concert Area Properties Panel */}
        {selectedArea && !isPreviewMode && (
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Area Properties</h3>
              <button
                onClick={() => deleteArea(selectedArea)}
                className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {(() => {
              const area = eventConfig.concertAreas?.find(a => a.id === selectedArea);
              if (!area) return null;

              return (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Area Label</label>
                    <input
                      type="text"
                      value={area.label}
                      onChange={(e) => updateAreaProperty(area.id, 'label', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Tier</label>
                    <select
                      value={area.tier}
                      onChange={(e) => {
                        const newTier = e.target.value as AreaTier;
                        updateAreaProperty(area.id, 'tier', newTier);
                        // Ask owner if they want to update price to tier default
                        if (window.confirm(`Update price to ${newTier} tier default (₹${eventConfig.tierPricing[newTier].price})?`)) {
                          updateAreaProperty(area.id, 'price', eventConfig.tierPricing[newTier].price);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
                    >
                      <option value="standard">Standard</option>
                      <option value="premium">Premium</option>
                      <option value="vip">VIP</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Capacity</label>
                    <input
                      type="number"
                      min="1"
                      value={area.capacity}
                      onChange={(e) => updateAreaProperty(area.id, 'capacity', parseInt(e.target.value) || 100)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Price (₹)</label>
                    <input
                      type="number"
                      min="1"
                      value={area.price}
                      onChange={(e) => updateAreaProperty(area.id, 'price', parseInt(e.target.value) || eventConfig.basePrice)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">Width (%)</label>
                      <input
                        type="number"
                        min="10"
                        max="50"
                        value={Math.round(area.width)}
                        onChange={(e) => updateAreaProperty(area.id, 'width', parseInt(e.target.value) || 30)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">Height (%)</label>
                      <input
                        type="number"
                        min="10"
                        max="40"
                        value={Math.round(area.height)}
                        onChange={(e) => updateAreaProperty(area.id, 'height', parseInt(e.target.value) || 20)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          )}
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="p-4 border-t border-slate-200 bg-white space-y-2 flex-shrink-0">
          {saveMessage && (
            <div className={`text-xs p-2 rounded-lg text-center ${
              saveMessage.includes('Error') 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              {saveMessage}
            </div>
          )}
          <button 
            onClick={saveSeatingLayout}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg"
          >
            <Save size={20} />
            {isSaving ? 'Saving...' : 'Save Layout'}
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col bg-slate-100">
        {/* Top Toolbar */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-slate-800">
              {isPreviewMode ? '👁️ Customer Preview' : '✏️ Design Mode'}
            </h2>
            <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
              {eventConfig.hasSeating && eventConfig.seatingLayout 
                ? `${eventConfig.seatingLayout.seats.length || 0} row seats` 
                : ''
              }
              {eventConfig.hasSeating && eventConfig.individualSeats 
                ? `${eventConfig.individualSeats.length || 0} individual seats` 
                : ''
              }
              {eventConfig.hasRegistration && eventConfig.concertAreas 
                ? `${eventConfig.concertAreas.length || 0} areas` 
                : ''
              }
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              eventConfig.type === 'seats-only' ? 'bg-blue-100 text-blue-700' :
              eventConfig.type === 'registration-only' ? 'bg-purple-100 text-purple-700' :
              'bg-emerald-100 text-emerald-700'
            }`}>
              {eventConfig.type.replace('-', ' ')}
            </span>
          </div>

          <div className="text-center">
            <h3 className="text-xl font-bold text-slate-800">{eventConfig.name}</h3>
            <p className="text-sm text-slate-500">Event Layout Designer</p>
          </div>
          
          {/* Zoom Controls */}
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
            <button 
              onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}
              className="px-3 py-2 hover:bg-white rounded-lg transition-colors text-slate-700 font-bold"
              title="Zoom Out"
            >
              −
            </button>
            <span className="px-3 py-1 text-sm font-semibold text-slate-700 min-w-[60px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button 
              onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.1))}
              className="px-3 py-2 hover:bg-white rounded-lg transition-colors text-slate-700 font-bold"
              title="Zoom In"
            >
              +
            </button>
            <button 
              onClick={() => setZoomLevel(1)}
              className="px-3 py-2 hover:bg-white rounded-lg transition-colors text-slate-700 text-xs font-semibold"
              title="Reset Zoom"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Seating Chart Canvas */}
        <div className="flex-1 relative bg-gradient-to-br from-slate-100 via-white to-slate-50 overflow-auto flex items-center justify-center p-8">
          <div className="w-full max-w-5xl" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center', transition: 'transform 0.2s' }}>
            {/* Stage Visual */}
            <div className="w-full max-w-3xl mb-12 mx-auto">
              <div className="w-3/4 h-12 bg-gradient-to-b from-slate-700 to-slate-900 mx-auto rounded-t-[50%] shadow-2xl text-center text-white font-bold tracking-[0.5em] text-sm pt-3 border-t-4 border-slate-600">
                S T A G E
              </div>
            </div>

            {/* Canvas Container */}
            <div className="relative w-full max-w-4xl mx-auto aspect-[4/3] bg-white rounded-2xl border-2 border-slate-300 shadow-2xl">
              {/* Grid overlay */}
              {showGrid && !isPreviewMode && (
                <div className="absolute inset-0 opacity-10 rounded-2xl overflow-hidden">
                  <svg width="100%" height="100%" className="absolute inset-0">
                    <defs>
                      <pattern id="event-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#64748b" strokeWidth="1"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#event-grid)" />
                  </svg>
                </div>
              )}

              {/* Concert Areas Layer (for registration events) */}
              {eventConfig.hasRegistration && eventConfig.concertAreas?.map(area => (
                <DraggableConcertArea
                  key={area.id}
                  area={area}
                  isSelected={selectedArea === area.id}
                  isPreviewMode={isPreviewMode}
                  onSelect={() => setSelectedArea(area.id)}
                  onDrag={(x, y) => updateAreaPosition(area.id, x, y)}
                  onResize={(width, height) => updateAreaSize(area.id, width, height)}
                />
              ))}

              {/* Individual Seats Layer (for seats-only events) */}
              {eventConfig.hasSeating && eventConfig.individualSeats?.map(seat => (
                <DraggableIndividualSeat
                  key={seat.id}
                  seat={seat}
                  isSelected={selectedIndividualSeats.includes(seat.id)}
                  isPreviewMode={isPreviewMode}
                  onSelect={() => handleIndividualSeatClick(seat)}
                  onDrag={(x, y) => updateIndividualSeatPosition(seat.id, x, y)}
                />
              ))}

              {/* Traditional Seating Grid (for row-based seating) */}
              {eventConfig.hasSeating && eventConfig.seatingLayout && (
                <div className="absolute inset-0 flex flex-col gap-3 items-center justify-center p-8">
                  {layout.map((row) => (
                    <div key={row.rowLabel} className="flex items-center gap-4">
                      {/* Row Label */}
                      <span className="w-6 text-right text-gray-500 font-bold text-sm">
                        {row.rowLabel}
                      </span>

                      {/* Seats in Row */}
                      <div className="flex gap-2">
                        {row.seats.map((seat) => {
                          const isSelected = selectedSeats.includes(seat.id);
                          return (
                            <DraggableSeat
                              key={seat.id}
                              seat={seat}
                              isSelected={isSelected}
                              isPreviewMode={isPreviewMode}
                              onSelect={() => handleSeatClick(seat)}
                              onDrag={() => {}}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Click handler for deselection */}
              <div 
                className="absolute inset-0 -z-10"
                onClick={() => {
                  if (!isPreviewMode) {
                    setSelectedSeats([]);
                    setSelectedIndividualSeats([]);
                    setSelectedArea(null);
                  }
                }}
              />
            </div>

            {/* Legend (matches customer view exactly) */}
            <div className="mt-12 flex flex-wrap justify-center gap-6 bg-white px-6 py-3 rounded-full border-2 border-gray-200 shadow-md">
              {(eventConfig.hasSeating && eventConfig.seatingLayout) && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-amber-600 border-amber-500 border-t-2"></div>
                    <span className="text-xs text-gray-600 font-medium">VIP Seats</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-emerald-700 border-emerald-600 border-t-2"></div>
                    <span className="text-xs text-gray-600 font-medium">Premium Seats</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-slate-700 border-slate-600 border-t-2"></div>
                    <span className="text-xs text-gray-600 font-medium">Standard Seats</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-emerald-500 border-emerald-400 border-t-2"></div>
                    <span className="text-xs text-gray-600 font-medium">Selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gray-900 border-gray-800 border-t-2"></div>
                    <span className="text-xs text-gray-600 font-medium">Booked</span>
                  </div>
                </>
              )}
              {(eventConfig.hasSeating && eventConfig.individualSeats) && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-br from-amber-600 to-amber-900 border-amber-500 border-t-2"></div>
                    <span className="text-xs text-gray-600 font-medium">VIP Seats</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-br from-emerald-600 to-emerald-900 border-emerald-500 border-t-2"></div>
                    <span className="text-xs text-gray-600 font-medium">Premium Seats</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-br from-slate-600 to-slate-800 border-slate-500 border-t-2"></div>
                    <span className="text-xs text-gray-600 font-medium">Standard Seats</span>
                  </div>
                </>
              )}
              {eventConfig.hasRegistration && (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-amber-600/30 border-amber-500 border-2"></div>
                    <span className="text-xs text-gray-600 font-medium">VIP Area</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-emerald-600/30 border-emerald-500 border-2"></div>
                    <span className="text-xs text-gray-600 font-medium">Premium Area</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-slate-600/30 border-slate-500 border-2"></div>
                    <span className="text-xs text-gray-600 font-medium">Standard Area</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Selected Items Summary (in preview mode) */}
        {isPreviewMode && (selectedSeats.length > 0 || selectedArea) && (
          <div className="absolute bottom-0 right-0 w-80 bg-slate-800/95 backdrop-blur-md border-l border-slate-700/50 flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-700/50">
              <h2 className="text-xl font-bold text-white tracking-tight">Your Selection</h2>
              <p className="text-sm text-slate-400 mt-1">
                {selectedSeats.length > 0 && `${selectedSeats.length} seat${selectedSeats.length > 1 ? 's' : ''}`}
                {selectedSeats.length > 0 && selectedArea && ' • '}
                {selectedArea && '1 area'} selected
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-60">
              {/* Selected Seats */}
              {selectedSeats.map((seatId) => {
                const seat = eventConfig.seatingLayout?.seats.find(s => s.id === seatId);
                if (!seat) return null;
                
                return (
                  <div key={seatId} className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white">
                        {seat.id}
                        <span className={`text-xs font-normal ml-2 px-2 py-0.5 rounded uppercase ${
                          seat.tier === 'vip' ? 'bg-amber-600/20 text-amber-400' :
                          seat.tier === 'premium' ? 'bg-emerald-600/20 text-emerald-400' :
                          'bg-slate-600/20 text-slate-400'
                        }`}>
                          {seat.tier}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-1">
                        ₹{seat.price}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleSeatClick(seat)}
                      className="w-8 h-8 flex items-center justify-center bg-slate-700/50 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}

              {/* Selected Area */}
              {selectedArea && (() => {
                const area = eventConfig.concertAreas?.find(a => a.id === selectedArea);
                if (!area) return null;
                
                return (
                  <div key={selectedArea} className="bg-slate-900/50 border border-slate-700/50 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <div className="font-bold text-white">
                        {area.label}
                        <span className={`text-xs font-normal ml-2 px-2 py-0.5 rounded uppercase ${
                          area.tier === 'vip' ? 'bg-amber-600/20 text-amber-400' :
                          area.tier === 'premium' ? 'bg-emerald-600/20 text-emerald-400' :
                          'bg-slate-600/20 text-slate-400'
                        }`}>
                          {area.tier}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-medium mt-1">
                        {area.capacity} people • ₹{area.price}
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedArea(null)}
                      className="w-8 h-8 flex items-center justify-center bg-slate-700/50 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })()}
            </div>

            <div className="p-6 bg-slate-900/50 border-t border-slate-700/50">
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold text-white">Total</span>
                <span className="text-2xl font-bold text-emerald-400">
                  ₹{(() => {
                    let total = 0;
                    
                    // Add seat prices
                    if (eventConfig.seatingLayout) {
                      total += eventConfig.seatingLayout.seats
                        .filter(seat => selectedSeats.includes(seat.id))
                        .reduce((sum, seat) => sum + seat.price, 0);
                    }
                    
                    // Add area price
                    if (selectedArea) {
                      const area = eventConfig.concertAreas?.find(a => a.id === selectedArea);
                      if (area) total += area.price;
                    }
                    
                    return total;
                  })()}
                </span>
              </div>
              <button className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transform hover:scale-105">
                Continue to Preview
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventSeatingDesigner;