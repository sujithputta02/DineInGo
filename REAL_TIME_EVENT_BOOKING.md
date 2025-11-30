# Real-Time Event Seat Booking

## Overview
Implemented real-time seat availability updates for events using Socket.IO, similar to the restaurant table booking system. Users can see seats being booked by others in real-time.

## Features

### 1. Real-Time Seat Updates
- **Instant Updates**: When someone books a seat, all other users viewing the same event see it immediately
- **Visual Feedback**: Booked seats turn gray and become unclickable
- **Toast Notifications**: Users get notified when seats are booked by others
- **Auto-Deselection**: If a user has selected a seat that someone else books, it's automatically deselected

### 2. Real-Time Capacity Updates
- **Live Count**: Registered count updates in real-time
- **Spots Left**: Available spots decrease as people register
- **Works for Both**: Seating and non-seating events

## How It Works

### Backend (Socket.IO Server)

**1. Event Rooms** (`backend/src/server.ts`)
```typescript
// Users join event-specific rooms
socket.on('joinEvent', (eventId: string) => {
  socket.join(`event-${eventId}`);
});

socket.on('leaveEvent', (eventId: string) => {
  socket.leave(`event-${eventId}`);
});
```

**2. Emit Updates** (`backend/src/controllers/eventController.ts`)
```typescript
// When seats are booked
io.to(`event-${id}`).emit('seatsBooked', {
  eventId,
  seatIds,
  userId,
  registeredCount,
  capacity
});

// When event is registered (non-seating)
io.to(`event-${id}`).emit('eventRegistered', {
  eventId,
  guests,
  registeredCount,
  capacity
});
```

### Frontend (React + Socket.IO Client)

**1. Connect to Socket.IO** (`src/pages/EventRegistration.tsx`)
```typescript
const socket = io('http://localhost:5000');
socket.emit('joinEvent', eventId);
```

**2. Listen for Updates**
```typescript
// Listen for seat bookings
socket.on('seatsBooked', (data) => {
  // Update seat statuses
  // Remove selected seats if booked by others
  // Show notification
});

// Listen for general registrations
socket.on('eventRegistered', (data) => {
  // Update registered count
  // Show notification
});
```

**3. Cleanup on Unmount**
```typescript
return () => {
  socket.emit('leaveEvent', eventId);
  socket.disconnect();
};
```

## User Experience

### Scenario 1: User A Books Seats

**User A's View:**
1. Selects seats A-1, A-2, B-5
2. Clicks "Continue to Preview"
3. Fills contact info
4. Clicks "Confirm Booking"
5. Seats are marked as booked
6. Redirected to dashboard

**User B's View (watching same event):**
1. Sees seats A-1, A-2, B-5 turn gray instantly
2. Gets toast: "3 seat(s) just booked by another user"
3. If User B had selected any of those seats, they're auto-deselected
4. Can no longer click those seats

### Scenario 2: Multiple Users Selecting Same Seat

**Timeline:**
```
T+0s: User A selects seat A-1 (local only, not saved)
T+5s: User B selects seat A-1 (local only, not saved)
T+10s: User A confirms booking
      → Seat A-1 saved as booked in database
      → Socket.IO emits 'seatsBooked' event
      → User B sees seat A-1 turn gray
      → User B's selection of A-1 is removed
      → User B gets notification
T+15s: User B tries to book (A-1 no longer selected)
      → User B must select different seat
```

### Scenario 3: Non-Seating Event

**User A's View:**
1. Selects 3 guests
2. Confirms booking
3. Registered count increases by 3

**User B's View:**
1. Sees "Spots Left" decrease by 3 instantly
2. Gets toast: "3 spot(s) just taken"
3. If event becomes full, "Register" button disabled

## Socket.IO Events

### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `joinEvent` | `eventId: string` | Join event room for updates |
| `leaveEvent` | `eventId: string` | Leave event room |

### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `seatsBooked` | `{ eventId, seatIds[], userId, registeredCount, capacity }` | Seats were booked |
| `eventRegistered` | `{ eventId, guests, registeredCount, capacity }` | Event registration (non-seating) |

## Benefits

✅ **Prevents Double Booking**: Users can't book seats that are already taken
✅ **Real-Time Feedback**: Instant visual updates
✅ **Better UX**: Users know immediately when seats are taken
✅ **Scalable**: Works for any number of concurrent users
✅ **Consistent**: Same pattern as restaurant table booking
✅ **Reliable**: Socket.IO handles reconnection automatically

## Testing

### Test Case 1: Real-Time Seat Booking

1. **Setup**: Open event in two browser windows (User A and User B)
2. **User A**: Select seats A-1, A-2
3. **User B**: Should see seats available
4. **User A**: Complete booking
5. **User B**: Should instantly see A-1, A-2 turn gray
6. **User B**: Should get toast notification
7. **User B**: Should not be able to select A-1 or A-2

### Test Case 2: Auto-Deselection

1. **Setup**: Open event in two windows
2. **User A**: Select seat A-1 (don't book yet)
3. **User B**: Select seat A-1 (don't book yet)
4. **User A**: Complete booking
5. **User B**: Should see A-1 auto-deselected from their selection
6. **User B**: Total price should update

### Test Case 3: Capacity Updates

1. **Setup**: Open non-seating event in two windows
2. **User A**: Select 5 guests
3. **User B**: Note current "spots left"
4. **User A**: Complete booking
5. **User B**: Should see "spots left" decrease by 5
6. **User B**: Should get notification

### Test Case 4: Reconnection

1. **Setup**: Open event page
2. **Action**: Disconnect internet
3. **Action**: Reconnect internet
4. **Expected**: Socket.IO reconnects automatically
5. **Expected**: Real-time updates resume

## Technical Details

### Connection Management

```typescript
// Frontend maintains single socket connection
const [socket, setSocket] = useState<Socket | null>(null);

useEffect(() => {
  const newSocket = io('http://localhost:5000');
  setSocket(newSocket);
  
  // Join room
  newSocket.emit('joinEvent', eventId);
  
  // Cleanup
  return () => {
    newSocket.emit('leaveEvent', eventId);
    newSocket.disconnect();
  };
}, [eventId]);
```

### State Updates

```typescript
// Update event state immutably
setEvent(prevEvent => {
  if (!prevEvent?.seatingLayout) return prevEvent;
  
  const updatedSeats = prevEvent.seatingLayout.seats.map(seat => {
    if (bookedSeatIds.includes(seat.id)) {
      return { ...seat, status: 'booked', bookedBy: userId };
    }
    return seat;
  });
  
  return {
    ...prevEvent,
    seatingLayout: { ...prevEvent.seatingLayout, seats: updatedSeats },
    registeredCount: newCount
  };
});
```

### Performance Considerations

- **Room-Based**: Only users viewing the same event receive updates
- **Efficient**: Only changed data is sent (seat IDs, not entire event)
- **Optimized**: React state updates are batched
- **Scalable**: Socket.IO handles thousands of concurrent connections

## Files Modified

### Backend:
- `backend/src/server.ts` - Added event room handlers
- `backend/src/controllers/eventController.ts` - Added Socket.IO emit calls

### Frontend:
- `src/pages/EventRegistration.tsx` - Added Socket.IO client integration

## Configuration

### Socket.IO Server
```typescript
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});
```

### Socket.IO Client
```typescript
const socket = io('http://localhost:5000');
```

## Troubleshooting

### Issue: Updates Not Received

**Check:**
1. Backend server running on port 5000
2. Socket.IO connection established (check browser console)
3. User joined event room (check server logs)
4. CORS configured correctly

### Issue: Duplicate Notifications

**Solution:**
- Ensure socket cleanup in useEffect return
- Check userId comparison to avoid self-notifications

### Issue: Stale Data

**Solution:**
- Fetch fresh event data on mount
- Socket updates are incremental, not full refresh

## Future Enhancements

- Add "Someone is viewing this seat" indicator
- Show number of active viewers
- Add seat hold/reservation timer
- Implement optimistic UI updates
- Add reconnection toast notifications
- Show user avatars on booked seats
