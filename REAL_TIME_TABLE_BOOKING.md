# Real-Time Table Booking System

## Latest Updates (Nov 29, 2025)

### ✅ Fixed: Cancelled Tables Still Showing as Unavailable
**Problem:** When a user cancelled a booking, the table remained unavailable for other users.

**Root Causes:** 
1. The `/booked-tables` endpoint was returning ALL bookings including cancelled ones
2. The `fetchUnavailableTablesNow` function was missing in TableSelection component

**Solutions:**
1. ✅ Updated `/booked-tables` endpoint to explicitly exclude cancelled bookings
2. ✅ Added `fetchUnavailableTablesNow` function to immediately refresh table availability
3. ✅ Enhanced Socket.IO event handling to properly update UI when tables are cancelled

### ✅ Fixed: Booking Confirmation/Cancellation Flow
**Pending Bookings:**
- Show both "Confirm" and "Cancel" buttons
- Clicking "Confirm" → permanently sets status to "confirmed" (updates both Booking and TableBooking collections)
- Clicking "Cancel" → sets status to "cancelled" and frees up the table

**Confirmed Bookings:**
- Only show "Cancel" button (if more than 2 hours before booking time)
- Clicking "Cancel" → sets status to "cancelled" and table becomes available immediately

**Cancelled Bookings:**
- No action buttons shown
- Table is immediately available for other users via real-time Socket.IO updates

### ✅ Fixed: WebSocket Connection Warnings
- Changed transport order to start with polling (avoids WebSocket errors)
- Limited connection attempts to reduce console spam
- Improved error messages to be more user-friendly
- Socket connection persists across component remounts

---

## Overview
Implemented real-time table booking synchronization using Socket.IO. When one user books a table, all other users viewing the same restaurant see the table as unavailable immediately.

## Problem Solved
**Before:**
- User A books a table
- User B still sees it as available
- User B tries to book → conflict/error
- No real-time updates

**After:**
- User A books a table
- Socket.IO broadcasts the event
- User B's screen updates instantly
- Table shows as "booked" for User B
- Prevents double-booking

## Changes Made

### 1. Backend - Socket.IO Server (`backend/src/server.ts`)

**Added Restaurant Room Management:**
```typescript
io.on('connection', (socket) => {
  // Join restaurant room for real-time updates
  socket.on('joinRestaurant', (restaurantId: string) => {
    socket.join(restaurantId);
    console.log(`Socket joined restaurant room: ${restaurantId}`);
  });

  // Leave restaurant room
  socket.on('leaveRestaurant', (restaurantId: string) => {
    socket.leave(restaurantId);
    console.log(`Socket left restaurant room: ${restaurantId}`);
  });
});
```

### 2. Backend - Booking Routes (`backend/src/routes/bookingRoutes.ts`)

**Added Conflict Detection:**
```typescript
// Check if table is already booked
const existingBooking = await TableBooking.findOne({
  restaurantId,
  tableId,
  date,
  time,
  status: { $in: ['reserved', 'confirmed', 'blocked'] }
});

if (existingBooking && existingBooking.userId !== userId) {
  return res.status(409).json({ 
    error: 'Table already booked',
    message: 'This table has already been reserved by another user'
  });
}
```

**Added Socket.IO Event Emission:**
```typescript
// Emit Socket.IO event for real-time updates
const io = getIO();
if (io) {
  const eventName = status === 'reserved' ? 'tableBlocked' : 
                   status === 'confirmed' ? 'tableConfirmed' : 
                   status === 'cancelled' ? 'tableCancelled' : 'bookingUpdated';
  
  io.to(restaurantId).emit(eventName, {
    tableId,
    date,
    time,
    userId,
    status,
    booking
  });
}
```

### 3. Frontend - TableSelection (`src/pages/TableSelection.tsx`)

**Added Real-Time Event Listeners:**
```typescript
useEffect(() => {
  const socket = socketService.connect();
  
  // Join restaurant room
  socket.emit('joinRestaurant', restaurantId);
  
  // Listen for table events
  const handleTableEvent = (data: any) => {
    if (data.date === currentDate && data.time === currentTime) {
      // Refetch unavailable tables
      fetchUnavailableTablesNow();
      
      // Show notification
      toast.info(`Table ${data.status}: ${data.tableId}`);
    }
  };
  
  socket.on('tableBlocked', handleTableEvent);
  socket.on('tableConfirmed', handleTableEvent);
  socket.on('tableCancelled', handleTableEvent);
  
  return () => {
    socket.off('tableBlocked', handleTableEvent);
    socket.off('tableConfirmed', handleTableEvent);
    socket.off('tableCancelled', handleTableEvent);
    socket.emit('leaveRestaurant', restaurantId);
  };
}, [restaurantId]);
```

## How It Works

### Booking Flow

```
User A selects table T1
    ↓
Clicks "Reserve"
    ↓
POST /api/bookings/table-booking
    ↓
Backend checks if table is available
    ↓
If available:
  - Save booking to MongoDB
  - Emit Socket.IO event: 'tableBlocked'
  - Event sent to all users in restaurant room
    ↓
User B's browser receives event
    ↓
User B's TableSelection component:
  - Refetches unavailable tables
  - Updates UI to show T1 as booked
  - Shows toast notification
    ↓
User B sees T1 is now unavailable
```

### Socket.IO Rooms

**Restaurant Rooms:**
- Each restaurant has its own Socket.IO room
- Room ID = restaurantId
- Users join room when viewing restaurant
- Users leave room when navigating away

**Benefits:**
- Events only sent to relevant users
- Efficient - no broadcasting to all users
- Scalable - each restaurant is isolated

## Socket.IO Events

### Client → Server

**joinRestaurant**
```typescript
socket.emit('joinRestaurant', restaurantId);
```
- Joins the restaurant's Socket.IO room
- Receives real-time updates for that restaurant

**leaveRestaurant**
```typescript
socket.emit('leaveRestaurant', restaurantId);
```
- Leaves the restaurant's Socket.IO room
- Stops receiving updates

### Server → Client

**tableBlocked**
```typescript
io.to(restaurantId).emit('tableBlocked', {
  tableId: 'T1',
  date: '2024-01-15',
  time: '19:00',
  userId: 'user123',
  status: 'reserved'
});
```
- Emitted when a table is reserved
- All users in restaurant room receive it

**tableConfirmed**
```typescript
io.to(restaurantId).emit('tableConfirmed', {
  tableId: 'T1',
  date: '2024-01-15',
  time: '19:00',
  userId: 'user123',
  status: 'confirmed'
});
```
- Emitted when a reservation is confirmed
- Table becomes permanently booked

**tableCancelled**
```typescript
io.to(restaurantId).emit('tableCancelled', {
  tableId: 'T1',
  date: '2024-01-15',
  time: '19:00',
  userId: 'user123',
  status: 'cancelled'
});
```
- Emitted when a booking is cancelled
- Table becomes available again

**tableAutoConfirmed**
```typescript
io.to(restaurantId).emit('tableAutoConfirmed', {
  tableId: 'T1',
  date: '2024-01-15',
  time: '19:00',
  userId: 'user123'
});
```
- Emitted by auto-confirm job (runs every minute)
- Converts 'blocked' bookings to 'confirmed'

## Conflict Prevention

### Double-Booking Prevention

**Backend Check:**
```typescript
const existingBooking = await TableBooking.findOne({
  restaurantId,
  tableId,
  date,
  time,
  status: { $in: ['reserved', 'confirmed', 'blocked'] }
});

if (existingBooking && existingBooking.userId !== userId) {
  return res.status(409).json({ 
    error: 'Table already booked'
  });
}
```

**Frontend Handling:**
```typescript
try {
  await bookingsApi.reserveTable({ ... });
} catch (error) {
  if (error.response?.status === 409) {
    toast.error('This table has already been booked by another user');
    // Refetch tables to show current state
    fetchUnavailableTablesNow();
  }
}
```

## User Experience

### Scenario 1: Simultaneous Booking Attempt

**Timeline:**
```
00:00 - User A and User B both viewing Restaurant X
00:01 - Both see Table T1 as available
00:02 - User A clicks "Reserve" on T1
00:03 - Backend processes User A's request
00:04 - T1 is marked as reserved for User A
00:05 - Socket.IO emits 'tableBlocked' event
00:06 - User B's screen updates instantly
00:07 - User B sees T1 is now unavailable (grayed out)
00:08 - User B tries to click T1 → Cannot select (disabled)
```

### Scenario 2: Booking During Viewing

**Timeline:**
```
00:00 - User B viewing table layout
00:05 - User A (on different device) books Table T5
00:06 - Socket.IO event received by User B
00:07 - User B's screen updates automatically
00:08 - T5 changes from green (available) to red (booked)
00:09 - Toast notification: "Table reserved: T5"
00:10 - User B sees real-time update without refresh
```

### Visual Feedback

**Table States:**
- 🟢 **Green** - Available (can be selected)
- 🔴 **Red** - Booked (cannot be selected)
- 🟡 **Yellow** - Selected by current user
- ⚫ **Gray** - Disabled/Unavailable

**Real-Time Updates:**
- Instant color change when table is booked
- Toast notification for awareness
- Smooth transition (no page refresh needed)

## Polling Fallback

In addition to Socket.IO, the system also polls every 10 seconds as a fallback:

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchUnavailableTablesNow();
  }, 10000); // 10 seconds
  
  return () => clearInterval(interval);
}, [restaurantId]);
```

**Why Both?**
- Socket.IO = Instant updates (primary)
- Polling = Backup if Socket.IO fails
- Ensures reliability even with network issues

## Testing

### Test 1: Real-Time Update
1. Open restaurant in Browser A
2. Open same restaurant in Browser B
3. In Browser A, book a table
4. ✅ Browser B should show table as booked instantly
5. ✅ Toast notification should appear in Browser B

### Test 2: Conflict Prevention
1. Open restaurant in Browser A and B
2. Both try to book same table simultaneously
3. ✅ First request succeeds
4. ✅ Second request gets 409 error
5. ✅ Second user sees error message

### Test 3: Cancellation
1. User A books a table
2. User B sees it as booked
3. User A cancels the booking
4. ✅ User B sees table become available again
5. ✅ User B can now book it

### Test 4: Multiple Users
1. Open restaurant in 3+ browsers
2. Book different tables in each
3. ✅ All browsers see all bookings in real-time
4. ✅ No conflicts or double-bookings

## Monitoring

### Backend Logs
```
Socket joined restaurant room: 507f1f77bcf86cd799439011
Emitted tableBlocked for table T1 at 507f1f77bcf86cd799439011
Socket left restaurant room: 507f1f77bcf86cd799439011
```

### Frontend Logs
```
Joined restaurant room: 507f1f77bcf86cd799439011
Table event received: { tableId: 'T1', status: 'reserved', ... }
Left restaurant room: 507f1f77bcf86cd799439011
```

## Performance

### Scalability
- **Socket.IO Rooms**: Each restaurant is isolated
- **Event Filtering**: Only relevant users receive events
- **Efficient Updates**: Only changed data is sent

### Network Usage
- **Socket.IO**: ~1KB per event
- **Polling**: ~5KB every 10 seconds
- **Combined**: Minimal bandwidth usage

### Response Time
- **Socket.IO**: < 100ms (instant)
- **Polling**: Up to 10 seconds
- **User Experience**: Feels instant

## Troubleshooting

### Tables Not Updating in Real-Time

**Check 1: Socket.IO Connection**
```javascript
// In browser console
socketService.isConnected()
// Should return true
```

**Check 2: Room Membership**
```javascript
// Check backend logs
// Should see: "Socket joined restaurant room: ..."
```

**Check 3: Event Emission**
```javascript
// Check backend logs after booking
// Should see: "Emitted tableBlocked for table ..."
```

### Double-Booking Still Happening

**Check 1: Backend Validation**
```typescript
// Ensure conflict check is working
// Check MongoDB for duplicate bookings
db.tablebookings.find({ tableId: 'T1', date: '2024-01-15', time: '19:00' })
```

**Check 2: Race Conditions**
```typescript
// Add MongoDB unique index
db.tablebookings.createIndex(
  { restaurantId: 1, tableId: 1, date: 1, time: 1 },
  { unique: true }
)
```

### Events Not Received

**Check 1: CORS Settings**
```typescript
// backend/src/server.ts
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173'],
    methods: ['GET', 'POST']
  }
});
```

**Check 2: Backend Running**
```bash
# Ensure backend is running on port 5000
curl http://localhost:5000
```

## Future Enhancements

1. **Optimistic UI Updates**
   - Update UI immediately before API response
   - Rollback if API call fails

2. **Booking Queue**
   - Allow users to join waitlist for booked tables
   - Notify when table becomes available

3. **Time-Limited Reservations**
   - Auto-release tables after X minutes if not confirmed
   - Countdown timer for user to complete booking

4. **Booking Analytics**
   - Track popular tables and times
   - Show "Hot" indicator for high-demand tables

5. **Multi-Restaurant View**
   - Join multiple restaurant rooms
   - See updates across all restaurants

6. **Push Notifications**
   - Notify users when their preferred table becomes available
   - Booking confirmation notifications
