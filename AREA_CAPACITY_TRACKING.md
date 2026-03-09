# Area Capacity Tracking Implementation

## Overview
Implemented real-time capacity tracking for concert areas, showing booked/total capacity (e.g., 499/500) and automatically updating when bookings are made or cancelled.

## Changes Made

### 1. Backend - Event Controller (`backend/src/controllers/eventController.ts`)

#### Initialize Booked Count
- Added `booked: 0` initialization to all areas when fetching events
- Ensures all areas have a booked count field

#### Area Booking Logic in `registerForEvent`
```typescript
// New parameters accepted:
- areaId: ID of the area being booked
- guests: Number of people booking

// Logic:
1. Check if event is from Business collection
2. Find the area by ID
3. Validate available capacity
4. Increment booked count
5. Save to database
6. Emit real-time Socket.IO event
```

#### Real-time Updates
- Emits `areaBooked` event with:
  - eventId
  - areaId
  - guests (number booked)
  - booked (total booked)
  - capacity (max capacity)
  - availableSpots (remaining)

### 2. Frontend - EventSeatingViewer (`src/components/EventSeatingViewer.tsx`)

#### Display Changes
- Changed from "500 people" to "0/500 booked"
- Shows real-time booked count
- Updates automatically when bookings occur

#### Dark Mode
- Canvas background: `bg-slate-900`
- Legend background: `bg-slate-800`
- Text colors adjusted for dark theme

### 3. Frontend - EventRegistration (`src/pages/EventRegistration.tsx`)

#### Socket.IO Listener
Added `areaBooked` event listener:
```typescript
newSocket.on('areaBooked', (data) => {
  // Update area booked count in state
  // Show toast notification
});
```

#### State Updates
- Updates `event.seatingLayout.areas` with new booked count
- Triggers re-render of EventSeatingViewer
- Shows toast notification to other users

## How It Works

### Booking Flow
1. User selects an area (e.g., VIP Area)
2. User enters number of guests (e.g., 5)
3. Frontend sends request: `POST /api/events/:id/register`
   ```json
   {
     "areaId": "area-1",
     "guests": 5,
     "userId": "user123"
   }
   ```
4. Backend validates capacity
5. Backend increments `area.booked` by 5
6. Backend saves to database
7. Backend emits Socket.IO event
8. All connected clients receive update
9. UI updates to show new count (e.g., 5/500)

### Cancellation Flow
1. User cancels booking
2. Frontend sends cancellation request
3. Backend decrements `area.booked`
4. Backend emits Socket.IO event
5. All clients update UI (e.g., 0/500)

## Database Structure

### Business Collection
```javascript
{
  seatingLayout: {
    eventConfig: {
      concertAreas: [
        {
          id: "area-1",
          name: "VIP Area",
          tier: "vip",
          capacity: 100,
          price: 150,
          booked: 0,  // ← New field
          x: 50,
          y: 30,
          width: 40,
          height: 20
        }
      ]
    }
  }
}
```

## API Endpoints

### Register for Area
```
POST /api/events/:id/register
Body: {
  "areaId": "area-1",
  "guests": 5,
  "userId": "user123"
}
```

### Response
```json
{
  "success": true,
  "message": "Successfully registered for event area",
  "area": {
    "id": "area-1",
    "booked": 5,
    "capacity": 100
  }
}
```

## Real-time Updates

### Socket.IO Events

#### areaBooked
```javascript
{
  eventId: "event123",
  areaId: "area-1",
  guests: 5,
  booked: 5,
  capacity: 100,
  availableSpots: 95
}
```

## UI Display

### Before Booking
```
VIP AREA
VIP
0/100 booked
₹150
```

### After 5 People Book
```
VIP AREA
VIP
5/100 booked
₹150
```

### When Full
```
VIP AREA
VIP
100/100 booked
₹150
```

## Testing

### Test Scenario 1: Single Booking
1. Open event page
2. Select VIP Area
3. Enter 5 guests
4. Click "Select Seats to Continue"
5. Verify area shows "5/100 booked"

### Test Scenario 2: Multiple Users
1. Open event in two browser windows
2. In window 1: Book 10 spots in VIP Area
3. In window 2: Verify it updates to "10/100 booked"
4. In window 2: Book 5 more spots
5. Both windows show "15/100 booked"

### Test Scenario 3: Capacity Limit
1. Book spots until area is nearly full (e.g., 95/100)
2. Try to book 10 more spots
3. Should show error: "Only 5 spot(s) available"
4. Book exactly 5 spots
5. Area shows "100/100 booked"
6. Try to book more - should fail

### Test Scenario 4: Cancellation
1. Book 20 spots in Premium Area
2. Shows "20/200 booked"
3. Cancel the booking
4. Shows "0/200 booked"

## Notes

- Booked count persists in database
- Real-time updates work across all connected clients
- Capacity validation prevents overbooking
- Dark mode styling matches designer
- Compatible with existing seat-based and ticket-based events

## Future Enhancements

1. Add booking history per area
2. Show who booked (for admin view)
3. Add waitlist when area is full
4. Add time-based holds (reserve for 10 minutes)
5. Add analytics per area (most popular, revenue, etc.)
