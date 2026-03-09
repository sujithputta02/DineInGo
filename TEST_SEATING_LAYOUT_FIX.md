# Testing the Seating Layout Fix

## Quick Test Steps

### 1. Restart Backend Server

```bash
cd backend
npm run dev
```

The backend will automatically compile the updated TypeScript files.

### 2. Test Database Seating Layouts

Run the test script to see what seating layouts exist:

```bash
cd backend
node scripts/test-seating-layout-fetch.js
```

This will show:
- All event businesses
- Their seating layout structure
- Whether they use individual seats, grid seats, or concert areas

### 3. Test Frontend

```bash
# In the root directory
npm run dev
```

### 4. Manual Testing Scenarios

#### Scenario A: Individual Seats (Draggable Seats)
1. Navigate to an event that was created with individual draggable seats
2. You should see seats positioned on a canvas with their labels
3. Click on seats to select them
4. Selected seats should highlight in green
5. Verify the price and tier are displayed correctly

#### Scenario B: Grid-Based Seats (Row Seating)
1. Navigate to an event with traditional row-based seating (A1, A2, B1, etc.)
2. You should see rows of seats organized in a grid
3. Click on seats to select them
4. Verify seat selection works correctly

#### Scenario C: Concert Areas (Sections)
1. Navigate to an event with concert areas/sections
2. You should see large rectangular sections (VIP, Premium, Standard, etc.)
3. Click on a section to select it
4. Verify capacity and pricing are displayed

### 5. Verify Real-Time Updates

1. Open the same event in two different browser windows
2. Select seats in one window
3. Verify the other window updates in real-time showing those seats as booked
4. This confirms Socket.IO integration still works

### 6. Complete Booking Flow

1. Select seats/sections
2. Click "Proceed to Preview"
3. Verify the preview page shows correct selections
4. Complete the booking
5. Verify seats are marked as booked
6. Check that other users can't select those seats

## Expected Results

✅ Individual seats display at their configured positions
✅ Grid seats display in traditional row format
✅ Concert areas display as large sections
✅ Seat selection works correctly for all types
✅ Prices and tiers display correctly
✅ Real-time updates work
✅ Booking flow completes successfully

## Troubleshooting

### Issue: Seating layout not showing
- Check browser console for errors
- Verify the event has `hasSeating: true`
- Run the test script to verify seating data exists in database

### Issue: Wrong layout type showing
- Check if the event's seating layout has the correct structure
- Verify the backend normalization is working (check server logs)
- The backend logs will show: "Detected EventSeatingDesigner format, normalizing..."

### Issue: Seats not clickable
- Check if seats have `status: 'available'`
- Verify `onSeatClick` handler is working
- Check browser console for JavaScript errors

## API Endpoints to Test

### Get Event by ID
```bash
curl http://localhost:5001/api/events/{eventId}
```

Check the response for:
- `hasSeating: true`
- `seatingLayout.seats` array (for individual or grid seats)
- `seatingLayout.areas` array (for concert areas)

### Get All Events
```bash
curl http://localhost:5001/api/events
```

Verify all events with seating have properly normalized layouts.

## Database Queries

If you need to check the raw data:

```javascript
// In MongoDB shell or Compass
db.businesses.find({ 
  type: { $in: ['event', 'both'] },
  seatingLayout: { $exists: true }
}).pretty()
```

Look for:
- `seatingLayout.eventConfig.individualSeats` - Individual draggable seats
- `seatingLayout.eventConfig.seatingLayout.seats` - Grid-based seats
- `seatingLayout.eventConfig.concertAreas` - Concert areas/sections

## Success Criteria

The fix is successful when:
1. ✅ All three seating types render correctly
2. ✅ Seat selection works for all types
3. ✅ Prices and tiers display accurately
4. ✅ Real-time updates function properly
5. ✅ Booking flow completes without errors
6. ✅ No console errors in browser or server

## Notes

- The fix maintains backward compatibility
- Existing bookings are not affected
- The normalization happens at the API level
- Frontend automatically detects seat type and renders appropriately
