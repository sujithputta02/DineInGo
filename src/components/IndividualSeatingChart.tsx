import React from 'react';

interface IndividualSeat {
  id: string;
  x: number;
  y: number;
  tier: 'standard' | 'premium' | 'vip';
  price: number;
  status: 'available' | 'selected' | 'booked';
  label: string;
  bookedBy?: string;
}

interface IndividualSeatingChartProps {
  seats: IndividualSeat[];
  selectedSeatIds: string[];
  onSeatClick: (seat: IndividualSeat) => void;
}

const IndividualSeatingChart: React.FC<IndividualSeatingChartProps> = ({
  seats,
  selectedSeatIds,
  onSeatClick
}) => {
  const getSeatColorClass = (tier: string, status: string, isSelected: boolean) => {
    if (status === 'booked') {
      return 'bg-gray-900 border-gray-800 cursor-not-allowed opacity-50';
    }
    if (isSelected) {
      return 'bg-emerald-500 border-emerald-400 shadow-lg scale-110';
    }
    switch (tier) {
      case 'vip':
        return 'bg-amber-600 border-amber-500 hover:bg-amber-500 cursor-pointer';
      case 'premium':
        return 'bg-emerald-700 border-emerald-600 hover:bg-emerald-600 cursor-pointer';
      case 'standard':
      default:
        return 'bg-slate-700 border-slate-600 hover:bg-slate-600 cursor-pointer';
    }
  };

  return (
    <div className="relative w-full overflow-auto lg:overflow-visible flex items-center justify-center p-4">
      <div className="relative min-w-[600px] lg:min-w-0 w-full max-w-[800px] aspect-[4/3] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border-2 border-slate-700 shadow-2xl relative overflow-hidden transition-all duration-500 shrink-0">
        {/* Stage Visual */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-3/4 max-w-md">
          <div className="h-10 sm:h-12 bg-gradient-to-b from-slate-300 to-slate-600 rounded-t-[50%] shadow-2xl text-center text-slate-900 font-bold tracking-[0.5em] text-[10px] sm:text-sm pt-2 sm:pt-3 border-t-4 border-slate-400">
            S T A G E
          </div>
        </div>

        {/* Individual Seats */}
        <div className="absolute inset-0 pt-24 sm:pt-32">
          {seats.map((seat) => {
            const isSelected = selectedSeatIds.includes(seat.id);
            const colorClass = getSeatColorClass(seat.tier, seat.status, isSelected);

            return (
              <button
                key={seat.id}
                onClick={() => seat.status !== 'booked' && onSeatClick(seat)}
                disabled={seat.status === 'booked'}
                className={`absolute w-12 h-12 sm:w-16 sm:h-16 rounded-lg border-t-2 sm:border-t-4 transition-all duration-200 ease-in-out flex flex-col items-center justify-center ${colorClass}`}
                style={{
                  left: `${seat.x}%`,
                  top: `${seat.y}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: isSelected ? 20 : 10
                }}
                title={`${seat.label} - ${seat.tier.toUpperCase()} - ₹${seat.price}`}
              >
                <span className="text-white text-[10px] sm:text-xs font-bold">{seat.label}</span>
                <span className="text-white text-[8px] sm:text-[10px] opacity-80">₹{seat.price}</span>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex flex-wrap justify-center gap-3 sm:gap-4 bg-slate-800/90 px-4 sm:px-6 py-2 sm:py-3 rounded-full border-2 border-slate-600 shadow-lg backdrop-blur-sm whitespace-nowrap overflow-x-auto max-w-[90%] no-scrollbar">
          <LegendItem color="bg-amber-600 border-amber-500" label="VIP" />
          <LegendItem color="bg-emerald-700 border-emerald-600" label="Premium" />
          <LegendItem color="bg-slate-700 border-slate-600" label="Standard" />
          <LegendItem color="bg-emerald-500 border-emerald-400" label="Selected" />
          <LegendItem color="bg-gray-900 border-gray-800" label="Booked" />
        </div>
      </div>
    </div>
  );
};

const LegendItem = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-2">
    <div className={`w-4 h-4 rounded ${color} border-t-2`}></div>
    <span className="text-xs text-white font-medium">{label}</span>
  </div>
);

export default IndividualSeatingChart;
