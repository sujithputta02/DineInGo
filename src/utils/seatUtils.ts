import { Row, Seat, SeatTier, SeatStatus } from '../types/seating';

export const generateSeatingChart = (rows: number, cols: number, basePrice: number = 50): Row[] => {
  const chart: Row[] = [];
  
  for (let i = 0; i < rows; i++) {
    const rowLabel = String.fromCharCode(65 + i); // A, B, C...
    const rowSeats: Seat[] = [];
    
    // Logic: First 2 rows are VIP, next 3 are Premium, rest are Standard
    let tier: SeatTier = 'standard';
    let price = basePrice;
    
    if (i < 2) {
      tier = 'vip';
      price = basePrice * 3; // VIP is 3x base price
    } else if (i < 5) {
      tier = 'premium';
      price = basePrice * 2; // Premium is 2x base price
    }
    
    for (let j = 1; j <= cols; j++) {
      rowSeats.push({
        id: `${rowLabel}-${j}`,
        rowLabel,
        number: j,
        status: 'available',
        tier,
        price,
      });
    }
    
    chart.push({ rowLabel, seats: rowSeats });
  }
  
  return chart;
};

// Helper to get styling classes based on tier and status
export const getSeatColorClass = (
  tier: SeatTier,
  status: SeatStatus,
  isSelected: boolean
) => {
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

// Convert flat seats array to rows
export const seatsToRows = (seats: Seat[]): Row[] => {
  // Handle undefined or null seats
  if (!seats || !Array.isArray(seats)) {
    return [];
  }
  
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
