# Event Seating System

## Overview
The event seating system allows events to have assigned seating with different pricing tiers (Standard, Premium, VIP). Users can visually select their seats from an interactive seating chart.

## Features

### 1. **Seating Tiers**
- **VIP**: First 2 rows - 3x base price
- **Premium**: Rows 3-5 - 2x base price  
- **Standard**: Remaining rows - base price

### 2. **Visual Seating Chart**
- Interactive seat selection
- Color-coded by tier
- Shows booked/available status
- Hover effects and animations
- Stage/screen indicator

### 3. **Flexible Event Types**
Events can be configured with or without seating:
- **With Seating**: Users select specific seats
- **Without Seating**: Users select number of guests

## Implementation

### Backend

#### Event Model (`backend/src/models/Event.ts`)
```typescript
interface IEvent {
  // ... other fields
  hasSeating: boolean;
  seatingLayout?: {
    rows: number;
    columns: number;
    seats: Array<{
      id: string;
      rowLabel: string;
      number: number;
      status: 'available' | 'selected' | 'booked';
      tier: 'standard' | 'premium' | 'vip';
      price: number;
      bookedBy?: string;
    }>;
  };
}
```

#### Seating Generator (`backend/src/utils/seatingGenerator.ts`)
Utility function to generate seating layouts:
```typescript
generateSeatingLayout(rows: number, columns: number, basePrice: number)
```

#### Event Registration Endpoint
`POST /api/events/:id/register`
- Handles both seating and non-seating events
- Updates seat status to 'booked'
- Tracks which user booked which seats

### Frontend

#### Components
1. **SeatingChart** (`src/components/SeatingChart.tsx`)
   - Displays interactive seating grid
   - Handles seat selection
   - Shows legend

2. **EventRegistration** (`src/pages/EventRegistration.tsx`)
   - Conditionally shows seating chart or guest selector
   - Calculates total based on selected seats
   - Handles booking submission

#### Types (`src/types/seating.ts`)
- `Seat`, `Row`, `SeatingLayout` interfaces
- `SeatStatus`, `SeatTier` types

#### Utilities (`src/utils/seatUtils.ts`)
- `generateSeatingChart()`: Generate seating for frontend
- `getSeatColorClass()`: Get styling classes for seats
- `seatsToRows()`: Convert flat seat array to rows

## Usage

### Creating an Event with Seating

```typescript
import { generateSeatingLayout } from './src/utils/seatingGenerator';

const event = {
  title: 'Concert Night',
  // ... other fields
  hasSeating: true,
  seatingLayout: generateSeatingLayout(8, 12, 500) // 8 rows, 12 cols, ₹500 base
};
```

### Seeding Events
Run the seed script to populate events with seating:
```bash
cd backend
npm run seed
```

## Booking Flow

1. User navigates to event registration page
2. If event has seating:
   - Seating chart is displayed
   - User selects desired seats
   - Total is calculated from selected seat prices
3. If event has no seating:
   - User selects number of guests
   - Total is calculated from base price × guests
4. User confirms booking
5. Backend updates:
   - Seat statuses to 'booked'
   - Booking record with selected seats
   - Event registered count

## Database Schema

### Booking Model
```typescript
{
  userId: string;
  eventId: ObjectId;
  selectedSeats?: string[]; // Array of seat IDs (e.g., ['A-1', 'A-2'])
  guests: number;
  totalAmount: number;
  // ... other fields
}
```

## Customization

### Adjusting Tier Pricing
Edit `backend/src/utils/seatingGenerator.ts`:
```typescript
if (i < 2) {
  tier = 'vip';
  price = basePrice * 3; // Change multiplier
} else if (i < 5) {
  tier = 'premium';
  price = basePrice * 2; // Change multiplier
}
```

### Changing Tier Row Distribution
Modify the row conditions in the generator:
```typescript
if (i < 3) { // First 3 rows VIP
  tier = 'vip';
} else if (i < 7) { // Next 4 rows Premium
  tier = 'premium';
}
```

### Styling
Colors are defined in `src/utils/seatUtils.ts` in the `getSeatColorClass()` function.

## API Endpoints

### Get Event with Seating
```
GET /api/events/:id
```
Returns event with seating layout if available.

### Register for Event
```
POST /api/events/:id/register
Body: {
  seatIds?: string[],  // For seating events
  userId: string,
  guests?: number      // For non-seating events
}
```

## Notes

- Seat IDs follow format: `{RowLabel}-{Number}` (e.g., 'A-1', 'B-5')
- Row labels are alphabetical (A, B, C, ...)
- Capacity is automatically calculated from seating layout
- Booked seats cannot be selected by other users
- Real-time seat availability is checked during booking
