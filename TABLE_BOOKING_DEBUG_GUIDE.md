# Table Booking Debug Guide

## Issue
Tables are not being blocked in real-time when another user books them.

## What Was Fixed

### 1. Backend - `/booked-tables` Endpoint
**Problem:** Was checking wrong collection (`Booking` instead of `TableBooking`)

**Fixed:**
```typescript
// OLD - Wrong collection
const bookings = await Booking.find({
  status: { $in: ['pending', 'confirmed'] }
});

// NEW - Correct collection
const tableBookings = await TableBooking.find({
  restaurantId: restaurantId,
  date: String(date),
  time: String(time),
  status: { $in: ['reserved', 'confirmed', 'blocked'] }
});
```

### 2. Added Console Logging
Added logs to help debug:
- Backend: Logs when tables are fetched and booked
- Frontend: Logs table availability checks and reservations

## How to Test

### Step 1: Start Backend
```bash
cd backend
npm run dev
```

**Check console for:**
```
Server is running on port 5000
Connected to MongoDB Atlas successfully
```

### Step 2: Start Frontend
```bash
npm run dev
```

### Step 3: Open Two Browsers

**Browser A:**
1. Open http://localhost:5173
2. Log in with User A
3. Select a restaurant
4. Choose date, time, guests
5. Go to table selection

**Browser B:**
1. Open http://localhost:5173 (incognito/private mode)
2. Log in with User B (different account)
3. Select SAME restaurant
4. Choose SAME date, time, guests
5. Go to table selection

### Step 4: Book a Table

**In Browser A:**
1. Click on a table (e.g., "Table G1")
2. Click "Proceed to Reservation"

**Expected Result in Browser B:**
- ✅ Table G1 should turn gray/disabled
- ✅ "Unavailable" label should appear
- ✅ Cannot click on Table G1
- ✅ Toast notification: "Table reserved: G1"

## Debugging Steps

### Check 1: Backend Logs

**When fetching tables:**
```
Fetching booked tables for: { restaurantId: '...', date: '2024-01-15', time: '19:00' }
Found table bookings: 1
Booked table IDs: [ 'G1' ]
```

**When booking a table:**
```
Emitted tableBlocked for table G1 at 507f1f77bcf86cd799439011
```

### Check 2: Frontend Console (Browser B)

**When page loads:**
```
Fetching unavailable tables for: { restaurantId: '...', date: '2024-01-15', time: '19:00' }
Received booked tables: []
```

**When Browser A books:**
```
Table event received: { tableId: 'G1', status: 'reserved', ... }
Fetching unavailable tables for: { restaurantId: '...', date: '2024-01-15', time: '19:00' }
Received booked tables: ['G1']
```

### Check 3: Network Tab

**In Browser B, check Network tab:**

1. **WebSocket Connection:**
   - Should see `socket.io` connection
   - Status: 101 Switching Protocols
   - Type: websocket

2. **API Calls:**
   - GET `/api/bookings/booked-tables?restaurantId=...&date=...&time=...`
   - Response should include booked table IDs

### Check 4: MongoDB

**Check if booking was saved:**
```javascript
// In MongoDB Compass or shell
db.tablebookings.find({
  restaurantId: "your-restaurant-id",
  date: "2024-01-15",
  time: "19:00"
})

// Should return:
{
  _id: ObjectId("..."),
  restaurantId: "...",
  tableId: "G1",
  date: "2024-01-15",
  time: "19:00",
  userId: "user-a-uid",
  guests: 2,
  status: "reserved",
  createdAt: ISODate("...")
}
```

## Common Issues

### Issue 1: Socket.IO Not Connected

**Symptoms:**
- No real-time updates
- Tables don't update until page refresh

**Check:**
```javascript
// In browser console
socketService.isConnected()
// Should return: true
```

**Fix:**
1. Ensure backend is running on port 5000
2. Check CORS settings in backend
3. Check browser console for Socket.IO errors

### Issue 2: Wrong Restaurant ID

**Symptoms:**
- Tables show as available even when booked
- No bookings found in database

**Check:**
```javascript
// In browser console
console.log('Restaurant ID:', restaurantId);
// Should be a valid MongoDB ObjectId or string
```

**Fix:**
1. Ensure restaurant ID is consistent
2. Check if mock restaurant has `_id` field
3. Verify API calls use correct ID

### Issue 3: Date/Time Format Mismatch

**Symptoms:**
- Bookings saved but not showing as unavailable
- Different date/time format in database vs query

**Check:**
```javascript
// Backend logs should show:
Fetching booked tables for: { 
  restaurantId: '...', 
  date: '2024-01-15',  // YYYY-MM-DD format
  time: '19:00'        // HH:mm format
}
```

**Fix:**
1. Ensure consistent date format (YYYY-MM-DD)
2. Ensure consistent time format (HH:mm)
3. Check searchParams in frontend

### Issue 4: Backend Not Emitting Events

**Symptoms:**
- Booking saves but no Socket.IO event
- Other users don't see updates

**Check Backend Logs:**
```
Emitted tableBlocked for table G1 at 507f1f77bcf86cd799439011
```

**If missing:**
1. Check if `getIO()` returns valid io instance
2. Verify Socket.IO is initialized
3. Check if restaurant room exists

### Issue 5: Frontend Not Receiving Events

**Symptoms:**
- Backend emits events but frontend doesn't update

**Check Frontend Console:**
```
Table event received: { ... }
```

**If missing:**
1. Check if socket joined restaurant room
2. Verify event listeners are attached
3. Check if socket is connected

## Manual Testing Checklist

- [ ] Backend server is running
- [ ] Frontend dev server is running
- [ ] MongoDB is connected
- [ ] Two different user accounts ready
- [ ] Open two browsers (one incognito)
- [ ] Both logged in with different accounts
- [ ] Both viewing same restaurant
- [ ] Both selected same date/time
- [ ] Browser A books a table
- [ ] Browser B sees table as unavailable
- [ ] Browser B cannot select booked table
- [ ] Toast notification appears in Browser B
- [ ] Check MongoDB - booking exists
- [ ] Check backend logs - event emitted
- [ ] Check frontend logs - event received

## Quick Fix Commands

### Restart Backend
```bash
cd backend
npm run dev
```

### Clear MongoDB Bookings (for testing)
```javascript
// In MongoDB shell
db.tablebookings.deleteMany({})
```

### Check Socket.IO Connection
```javascript
// In browser console
const socket = socketService.getSocket();
console.log('Connected:', socket?.connected);
console.log('Socket ID:', socket?.id);
```

### Force Refetch Tables
```javascript
// In browser console (on TableSelection page)
fetchUnavailableTablesNow();
```

## Expected Behavior

### Scenario: User A Books Table G1

**Timeline:**
```
00:00 - User A and B both viewing table selection
00:01 - Both see all tables as available (green)
00:02 - User A clicks "Table G1"
00:03 - User A clicks "Proceed to Reservation"
00:04 - Backend saves booking to MongoDB
00:05 - Backend emits Socket.IO event: tableBlocked
00:06 - User B's browser receives event
00:07 - User B's screen refetches booked tables
00:08 - User B sees Table G1 turn gray
00:09 - User B sees "Unavailable" label on G1
00:10 - User B cannot click Table G1
00:11 - Toast appears: "Table reserved: G1"
```

### Visual States

**Available Table:**
- Color: White/Light gray
- Border: Gray
- Hover: Green border
- Clickable: Yes
- Label: "Table G1"

**Booked Table:**
- Color: Dark gray
- Border: Gray
- Hover: No effect
- Clickable: No (disabled)
- Label: "Table G1" + "Unavailable"

**Selected Table (Current User):**
- Color: Green
- Border: Green
- Text: White
- Clickable: Yes (to deselect)
- Label: "Table G1"

## Success Criteria

✅ **Real-Time Updates:**
- Tables update within 1 second of booking
- No page refresh needed

✅ **Conflict Prevention:**
- Cannot book already-booked tables
- 409 error if attempting to book booked table

✅ **Visual Feedback:**
- Booked tables are clearly marked
- Toast notifications appear
- Disabled state prevents clicks

✅ **Data Consistency:**
- MongoDB has correct bookings
- All users see same availability
- No double-bookings possible

## Still Not Working?

If tables are still not blocking after all fixes:

1. **Clear browser cache** and reload
2. **Restart both backend and frontend**
3. **Check MongoDB connection** - ensure it's connected
4. **Verify restaurant ID** - must be same in both browsers
5. **Check date/time** - must be exactly the same
6. **Look for errors** in browser console and backend logs
7. **Test with simple table** - try Table G1 first
8. **Check Socket.IO** - ensure connection is established

If still having issues, check:
- Firewall blocking WebSocket connections
- Proxy/VPN interfering with Socket.IO
- Browser extensions blocking WebSockets
- Antivirus software blocking connections
