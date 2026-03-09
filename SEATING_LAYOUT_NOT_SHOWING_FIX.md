# Seating Layout Not Showing - Fix Instructions

## Current Status

✅ **Database**: Business event exists with seating layout (50 seats, 2 sections)
✅ **Code**: Backend controller updated with proper transformation
✅ **Frontend**: Safety checks added for undefined seating layout
❌ **Issue**: Backend needs manual restart to pick up changes

## The Problem

The seating layout is saved in the database but not showing because:
1. The backend code has been updated with debug logging
2. Nodemon hasn't automatically restarted to pick up the TypeScript changes
3. The API is still running the old code without the debug logs

## Solution: Restart Backend

### Option 1: Kill and Restart (Recommended)
```bash
# Find the backend process
ps aux | grep "node.*backend" | grep -v grep

# Kill the nodemon process (use the PID from above)
kill <PID>

# Restart backend
cd backend
npm run dev
```

### Option 2: Use Ctrl+C in Backend Terminal
1. Go to the terminal where backend is running
2. Press `Ctrl+C` to stop
3. Run `npm run dev` again

## What to Expect After Restart

When you access the event at http://localhost:5173/event/69a16c3da533a41ddbb7b292/register, you should see:

### In Backend Console:
```
getEventById called with ID: 69a16c3da533a41ddbb7b292
Event collection search result: NOT FOUND
Business collection search result: FOUND
Business type: event
Business has seatingLayout: true
Seating layout sections: 2
Seating layout seats: 50
Transformed event hasSeating: true
Transformed event seatingLayout exists: true
Returning event: Sunset Music Festival
```

### In Frontend:
- Event details page with "Select Your Seats" section
- Seating chart with 2 sections (General Admission, VIP)
- 50 VIP seats arranged in rows A-E
- Ability to click and select seats

## Test Event Details

**Event ID**: `69a16c3da533a41ddbb7b292`
**Name**: Sunset Music Festival
**Location**: Central Park, New York
**Type**: Music Festival
**Capacity**: 500
**Seating**:
- General Admission (standing): 300 spots
- VIP Section (seated): 50 seats in rows A-E

## Verification Steps

1. Restart backend (see above)
2. Open browser to: http://localhost:5173/event/69a16c3da533a41ddbb7b292/register
3. Check browser console for any errors
4. Check backend console for debug logs
5. Verify seating chart is displayed

## If Still Not Working

If the seating layout still doesn't show after restart:

1. Check backend logs for the debug output
2. Check browser console for errors
3. Verify the API response:
   ```bash
   curl http://localhost:5001/api/events/69a16c3da533a41ddbb7b292 | python3 -m json.tool
   ```
4. Look for `hasSeating: true` and `seatingLayout` object in the response

## Files Modified

- `backend/src/controllers/eventController.ts` - Added debug logging and proper Business transformation
- `src/pages/EventRegistration.tsx` - Added safety checks for undefined seatingLayout
- `src/pages/DashboardPage.tsx` - Fixed duplicate events issue

## Next Steps for User-Created Events

For the user to create their own business events with seating layouts:

1. User must be logged in (Firebase authentication)
2. Navigate to `/business/onboarding`
3. Fill in event details
4. Click "Open Event Seating Designer" button
5. Design the seating layout
6. Click "Save Layout" button (at top of designer)
7. Complete onboarding and deploy

The seating layout will be saved in the Business document and will display correctly on the event registration page.
