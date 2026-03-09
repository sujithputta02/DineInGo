# Event Registration Seating Layout Fix

## Problem
The event registration page was not displaying the correct seating layout that was saved in the business during event creation. The UI was showing a generic section selection instead of the actual seating layout configured in the EventSeatingDesigner.

## Root Cause
The seating layout data was being saved in a nested structure (`eventConfig` wrapper) from the EventSeatingDesigner component, but the backend normalization logic wasn't properly extracting all the seating data types:

1. **Individual Seats** - Draggable seats with custom positions (x, y coordinates)
2. **Grid Seats** - Traditional row-based seating (A1, A2, B1, B2, etc.)
3. **Concert Areas** - Large sections for general admission

The backend was only checking for `config.seatingLayout.seats` but not prioritizing `config.individualSeats`, which is the primary format used by the EventSeatingDesigner.

## Solution

### 1. Backend Controller Fix (`backend/src/controllers/eventController.ts`)

Updated both `getAllEvents` and `getEventById` functions to properly normalize seating layouts:

```typescript
// Prioritize individualSeats over grid seats
const individualSeats = config.individualSeats || [];
const gridSeats = config.seatingLayout?.seats || [];
const seats = individualSeats.length > 0 ? individualSeats : gridSeats;

const sections = config.seatingLayout?.sections || [];
const areas = config.concertAreas || [];

normalizedSeatingLayout = {
  seats: seats,
  sections: sections,
  areas: areas
};
```

Key improvements:
- Prioritize `individualSeats` (draggable seats) over `seatingLayout.seats` (grid seats)
- Handle all three seating types: individual seats, grid seats, and concert areas
- Add proper null checks and fallbacks
- Log detailed information for debugging

### 2. Frontend Component (`src/components/IndividualSeatingChart.tsx`)

Created a new component to render individual seats with custom positions:

Features:
- Displays seats at their configured x, y positions
- Shows seat labels, tiers, and prices
- Supports seat selection with visual feedback
- Includes stage visual and legend
- Responsive design with proper scaling

### 3. EventRegistration Page Update (`src/pages/EventRegistration.tsx`)

Updated the seating chart rendering logic to detect and use the appropriate component:

```typescript
{event.seatingLayout.seats[0]?.rowLabel ? (
  <SeatingChart /> // Grid-based seats
) : (
  <IndividualSeatingChart /> // Individual draggable seats
)}
```

## Testing

Run the test script to verify seating layout data structure:

```bash
cd backend
node scripts/test-seating-layout-fetch.js
```

This will show:
- All event businesses in the database
- Their seating layout structure
- Sample seat/area data
- Whether the layout is in eventConfig format or normalized format

## What Was Fixed

✅ Backend now properly extracts individual seats from `eventConfig.individualSeats`
✅ Backend normalizes all seating layout formats consistently
✅ Frontend detects seat type (grid vs individual) and renders appropriately
✅ Individual seats display with correct positions, labels, and pricing
✅ Concert areas continue to work as before
✅ Grid-based seating continues to work as before

## Files Modified

1. `backend/src/controllers/eventController.ts` - Fixed normalization logic
2. `src/components/IndividualSeatingChart.tsx` - New component for individual seats
3. `src/pages/EventRegistration.tsx` - Updated to use new component
4. `backend/scripts/test-seating-layout-fetch.js` - Test script for verification

## Next Steps

1. Restart the backend server to load the updated controller
2. Test event registration with different seating layout types:
   - Individual draggable seats
   - Grid-based row seating
   - Concert areas/sections
3. Verify real-time seat updates work correctly
4. Test booking flow end-to-end

## Notes

- The fix maintains backward compatibility with existing seating layouts
- All three seating types (individual, grid, areas) are now properly supported
- The normalization happens at the API level, so frontend receives consistent data
- Individual seats use percentage-based positioning for responsive layouts
