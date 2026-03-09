export type SeatStatus = 'available' | 'selected' | 'booked';
export type SeatTier = 'standard' | 'premium' | 'vip';

export interface Seat {
  id: string;
  rowLabel: string;
  number: number;
  status: SeatStatus;
  tier: SeatTier;
  price: number;
  bookedBy?: string;
}

export interface Row {
  rowLabel: string;
  seats: Seat[];
}

export interface SeatingLayout {
  rows: number;
  columns: number;
  seats: Seat[];
  sections?: any[];
  areas?: any[];
}
