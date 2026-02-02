import React from 'react';
import { getSeatColorClass } from '../utils/seatUtils';
import { Row, Seat } from '../types/seating';

interface SeatingChartProps {
  layout: Row[];
  selectedSeatIds: string[];
  onSeatClick: (seat: Seat) => void;
}

const SeatingChart: React.FC<SeatingChartProps> = ({ layout, selectedSeatIds, onSeatClick }) => {
  return (
    <div className="flex flex-col items-center overflow-x-auto p-4">
      {/* Screen Visual */}
      <div className="w-full max-w-2xl mb-12 perspective-500">
        <div className="w-3/4 h-10 bg-gradient-to-b from-slate-300 to-slate-600 mx-auto rounded-t-[50%] shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-center text-slate-900 font-bold tracking-[0.5em] text-sm pt-2.5 border-t-2 border-slate-400">
          STAGE
        </div>
      </div>

      {/* Seat Grid */}
      <div className="flex flex-col gap-3">
        {layout.map((row) => (
          <div key={row.rowLabel} className="flex items-center gap-4">
            {/* Row Label */}
            <span className="w-6 text-right text-gray-500 font-bold text-sm">
              {row.rowLabel}
            </span>

            {/* Seats in Row */}
            <div className="flex gap-2">
              {row.seats.map((seat) => {
                const isSelected = selectedSeatIds.includes(seat.id);
                const colorClass = getSeatColorClass(seat.tier, seat.status, isSelected);

                return (
                  <button
                    key={seat.id}
                    onClick={() => onSeatClick(seat)}
                    disabled={seat.status === 'booked'}
                    className={`w-8 h-9 rounded-t-lg border-t-4 transition-all duration-200 ease-in-out text-[10px] font-bold ${colorClass} ${
                      !isSelected && seat.status !== 'booked' ? 'hover:-translate-y-1' : ''
                    }`}
                    title={`${seat.tier.toUpperCase()} - ₹${seat.price}`}
                  >
                    {seat.status !== 'booked' && seat.number}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-12 flex flex-wrap justify-center gap-6 bg-white px-6 py-3 rounded-full border-2 border-gray-200 shadow-md">
        <LegendItem color="bg-amber-600 border-amber-500" label="VIP" />
        <LegendItem color="bg-emerald-700 border-emerald-600" label="Premium" />
        <LegendItem color="bg-slate-700 border-slate-600" label="Standard" />
        <LegendItem color="bg-emerald-500 border-emerald-400" label="Selected" />
        <LegendItem color="bg-gray-900 border-gray-800" label="Booked" />
      </div>
    </div>
  );
};

const LegendItem = ({ color, label }: { color: string; label: string }) => (
  <div className="flex items-center gap-2">
    <div className={`w-4 h-4 rounded ${color} border-t-2`}></div>
    <span className="text-xs text-gray-600 font-medium">{label}</span>
  </div>
);

export default SeatingChart;
