import React, { useState, useEffect } from 'react';
import socketService from '../utils/socketService';

interface EventSeatingViewerProps {
  seatingLayout: any;
  eventId?: string;           // Needed for joining the socket room
  selectedAreaIds?: string[];
  onAreaClick?: (areaId: string) => void;
}

const EventSeatingViewer: React.FC<EventSeatingViewerProps> = ({
  seatingLayout,
  eventId,
  selectedAreaIds = [],
  onAreaClick
}) => {
  // Keep a local map of areaId -> booked count so we can update in real-time
  const [bookedCounts, setBookedCounts] = useState<Record<string, number>>(() => {
    if (!seatingLayout?.areas) return {};
    const init: Record<string, number> = {};
    seatingLayout.areas.forEach((a: any) => {
      init[a.id] = a.booked || 0;
    });
    return init;
  });

  // Re-initialise when new seatingLayout is loaded
  useEffect(() => {
    if (!seatingLayout?.areas) return;
    const init: Record<string, number> = {};
    seatingLayout.areas.forEach((a: any) => {
      init[a.id] = a.booked || 0;
    });
    setBookedCounts(init);
  }, [seatingLayout]);

  // Socket.IO – join the event room and listen for booking / cancel events
  useEffect(() => {
    if (!eventId) return;

    const socket = socketService.connect();
    if (!socket) return;

    // Join the event-specific room so we receive its broadcasts
    socket.emit('joinEvent', eventId);

    const handleAreaBooked = (data: { areaId: string; booked: number }) => {
      setBookedCounts(prev => ({ ...prev, [data.areaId]: data.booked }));
    };

    const handleAreaCancelled = (data: { areaId: string; booked: number }) => {
      setBookedCounts(prev => ({ ...prev, [data.areaId]: data.booked }));
    };

    socket.on('areaBooked', handleAreaBooked);
    socket.on('areaCancelled', handleAreaCancelled);

    return () => {
      socket.off('areaBooked', handleAreaBooked);
      socket.off('areaCancelled', handleAreaCancelled);
      socket.emit('leaveEvent', eventId);
    };
  }, [eventId]);

  if (!seatingLayout || !seatingLayout.areas || seatingLayout.areas.length === 0) {
    return (
      <div className="text-center py-6 sm:py-8 text-gray-500 text-sm sm:text-base">
        No seating layout available
      </div>
    );
  }

  const areas = seatingLayout.areas;

  // Get area styling based on tier (exact match from designer)
  const getAreaStyling = (tier: string) => {
    switch (tier) {
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

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-0">
      {/* Stage Visual - exact match from designer */}
      <div className="w-full max-w-3xl mb-8 sm:mb-12 mx-auto">
        <div className="w-3/4 h-10 sm:h-12 bg-gradient-to-b from-slate-700 to-slate-900 mx-auto rounded-t-[50%] shadow-2xl text-center text-white font-bold tracking-[0.3em] sm:tracking-[0.5em] text-xs sm:text-sm pt-2 sm:pt-3 border-t-2 sm:border-t-4 border-slate-600">
          S T A G E
        </div>
      </div>

      {/* Canvas Container - dark mode background */}
      <div className="relative w-full overflow-auto lg:overflow-visible flex items-center justify-center">
        <div className="relative min-w-[500px] sm:min-w-[600px] lg:min-w-0 w-full max-w-[800px] aspect-[4/3] bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-700 sm:border-2 shadow-2xl relative overflow-hidden transition-all duration-500 shrink-0">
          {/* Concert Areas */}
          {areas.map((area: any) => {
            const isSelected = selectedAreaIds.includes(area.id);
            const styling = getAreaStyling(area.tier);
            const booked = bookedCounts[area.id] ?? area.booked ?? 0;
            const isFull = booked >= area.capacity;

            return (
              <div
                key={area.id}
                onClick={() => !isFull && onAreaClick && onAreaClick(area.id)}
                className={`absolute border-2 rounded-lg transition-all duration-200 ${styling.bg} ${styling.border} ${styling.text} ${styling.shadow} ${isFull
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer hover:ring-2 hover:ring-emerald-400'
                  } ${isSelected ? 'ring-4 ring-emerald-500 ring-offset-2 ring-offset-slate-900' : ''
                  }`}
                style={{
                  left: `${area.x}%`,
                  top: `${area.y}%`,
                  width: `${area.width}%`,
                  height: `${area.height}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: isSelected ? 20 : 10
                }}
              >
                {/* Area Content - exact match from designer */}
                <div className="w-full h-full flex flex-col items-center justify-center p-0.5 sm:p-1 md:p-2 text-center">
                  <div className="font-bold text-[8px] xs:text-[10px] sm:text-xs md:text-sm uppercase tracking-wider line-clamp-1">{area.name || area.label}</div>
                  <div className="text-[7px] xs:text-[8px] sm:text-[10px] md:text-xs opacity-80 mt-0.5">{area.tier.toUpperCase()}</div>
                  <div className={`text-[7px] xs:text-[8px] sm:text-[10px] md:text-xs mt-0.5 font-medium ${isFull ? 'text-red-400' : 'opacity-60'}`}>
                    {booked}/{area.capacity} {isFull ? 'FULL' : <span className="hidden xs:inline">booked</span>}
                  </div>
                  <div className="text-[8px] xs:text-[10px] sm:text-xs md:text-sm font-bold mt-0.5 sm:mt-1 text-emerald-400">₹{area.price}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend - dark mode */}
      <div className="mt-6 sm:mt-8 md:mt-12 flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 bg-slate-800 px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-full border border-slate-700 sm:border-2 shadow-md overflow-x-auto max-w-[90vw] no-scrollbar">
        <div className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 rounded bg-amber-600/30 border-amber-500 border sm:border-2"></div>
          <span className="text-[9px] xs:text-[10px] sm:text-xs text-slate-300 font-medium">VIP <span className="hidden xs:inline">Area</span></span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 rounded bg-emerald-600/30 border-emerald-500 border sm:border-2"></div>
          <span className="text-[9px] xs:text-[10px] sm:text-xs text-slate-300 font-medium">Premium <span className="hidden xs:inline">Area</span></span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 whitespace-nowrap">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 rounded bg-slate-600/30 border-slate-500 border sm:border-2"></div>
          <span className="text-[9px] xs:text-[10px] sm:text-xs text-slate-300 font-medium">Standard <span className="hidden xs:inline">Area</span></span>
        </div>
      </div>
    </div>
  );
};

export default EventSeatingViewer;
