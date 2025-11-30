export type SeatTier = 'standard' | 'premium' | 'vip';

export interface Seat {
  id: string;
  rowLabel: string;
  number: number;
  status: 'available' | 'selected' | 'booked';
  tier: SeatTier;
  price: number;
  bookedBy?: string;
}

export interface SeatingLayout {
  rows: number;
  columns: number;
  seats: Seat[];
}

// Calculate optimal rows and columns for a given capacity
export const calculateSeatingDimensions = (capacity: number): { rows: number; columns: number } => {
  // Try to create a roughly rectangular seating arrangement
  // Prefer more columns than rows for better viewing
  const sqrtCapacity = Math.sqrt(capacity);
  let columns = Math.ceil(sqrtCapacity * 1.2); // Slightly wider
  let rows = Math.ceil(capacity / columns);
  
  // Ensure we don't create more seats than capacity
  while (rows * columns > capacity) {
    if (columns > rows) {
      columns--;
    } else {
      rows--;
    }
  }
  
  // If we're under capacity, add back carefully
  while (rows * columns < capacity) {
    if (columns < 15) {
      columns++;
    } else {
      rows++;
    }
  }
  
  // Limit maximum columns to 15 for usability
  if (columns > 15) {
    columns = 15;
    rows = Math.ceil(capacity / columns);
  }
  
  return { rows, columns };
};

export const generateSeatingLayout = (
  rows: number,
  columns: number,
  basePrice: number = 50,
  capacity?: number
): SeatingLayout => {
  const seats: Seat[] = [];
  let seatsCreated = 0;
  const maxSeats = capacity || (rows * columns);

  for (let i = 0; i < rows && seatsCreated < maxSeats; i++) {
    const rowLabel = String.fromCharCode(65 + i); // A, B, C...

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

    for (let j = 1; j <= columns && seatsCreated < maxSeats; j++) {
      seats.push({
        id: `${rowLabel}-${j}`,
        rowLabel,
        number: j,
        status: 'available',
        tier,
        price,
      });
      seatsCreated++;
    }
  }

  return {
    rows,
    columns,
    seats,
  };
};

// Generate seating layout based on capacity
export const generateSeatingLayoutFromCapacity = (
  capacity: number,
  basePrice: number = 50
): SeatingLayout => {
  const { rows, columns } = calculateSeatingDimensions(capacity);
  return generateSeatingLayout(rows, columns, basePrice, capacity);
};
