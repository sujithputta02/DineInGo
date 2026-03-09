# Seating Layout Structure Fix - Complete Solution

## Problem Identified

The seating layout is not showing because EventSeatingDesigner saves data in a different structure than what EventRegistration expects.

### EventSeatingDesigner Saves:
```javascript
{
  eventConfig: {
    seatingLayout: {
      seats: [...]
    },
    individualSeats: [...],
    concertAreas: [...]
  },
  selectedSeats: [...],
  metadata: {...}
}
```

### EventRegistration Expects:
```javascript
{
  seats: [...],
  sections: [...]
}
```

## Solution Implemented

Added normalization logic in backend `eventController.ts` to handle both formats:

1. **In `getEventById`**: Detects if seatingLayout is wrapped in `eventConfig` and extracts the seats/sections
2. **In `getAllEvents`**: Same normalization for list view
3. Properly sets `hasSeating` flag based on whether seats or areas exist

## Files Modified

- `backend/src/controllers/eventController.ts` - Added seatingLayout normalization

## How to Test

### Step 1: Restart Backend
```bash
# In the terminal where backend is running:
# Press Ctrl+C to stop
# Then run:
cd backend
npm run dev
```

### Step 2: Test the API
```bash
curl http://localhost:5001/api/events/69a16c3da533a41ddbb7b292 | python3 -m json.tool
```

You should see:
```json
{
  "_id": "69a16c3da533a41ddbb7b292",
  "title": "Sunset Music Festival",
  "hasSeating": true,
  "seatingLayout": {
    "seats": [...],  // Array of 50 seats
    "sections": [...]  // Array of 2 sections
  }
}
```

### Step 3: Test in Browser
1. Go to: http://localhost:5173/event/69a16c3da533a41ddbb7b292/register
2. You should see "Select Your Seats" section
3. Seating chart should display with clickable seats

## Expected Backend Console Output

When you access the event, you should see:
```
getEventById called with ID: 69a16c3da533a41ddbb7b292
Event collection search result: NOT FOUND
Business collection search result: FOUND
Business type: event
Business has seatingLayout: true
Seating layout sections: 2
Seating layout seats: 50
Seating layout already in correct format
Transformed event hasSeating: true
Transformed event seatingLayout exists: true
Returning event: Sunset Music Festival
```

## For User-Created Events

When you create a new event through Business Onboarding:

1. The EventSeatingDesigner will save in its nested format
2. The backend will automatically normalize it when fetching
3. EventRegistration will receive the correct flat structure
4. Seating chart will display properly

## Test Business Event Details

**ID**: `69a16c3da533a41ddbb7b292`
**Name**: Sunset Music Festival
**Seating**:
- 2 sections (General Admission, VIP)
- 50 VIP seats in rows A-E (10 seats per row)
- Each seat has: id, section, row, number, x, y, status, price

## Verification Checklist

- [ ] Backend restarted successfully
- [ ] API returns event with `hasSeating: true`
- [ ] API returns `seatingLayout.seats` as array
- [ ] Browser shows "Select Your Seats" section
- [ ] Seating chart displays seats
- [ ] Seats are clickable
- [ ] Selected seats show in summary
- [ ] Total price calculates correctly

## If Still Not Working

1. Check backend console for debug logs
2. Check browser console for errors
3. Verify API response structure
4. Check that seatingLayout.seats is an array
5. Verify seats have required fields: id, row, number, price, status

## Next Steps

Once this test event works, you can:
1. Create your own events through Business Onboarding
2. Design custom seating layouts
3. The normalization will handle the structure automatically
4. Events will display correctly on the registration page
