# Booking Cancellation Fix

## Problem
When bookings were cancelled, tables remained blocked and showed as unavailable even though the booking status was "CANCELLED". This prevented other users from booking those tables.

## Root Cause
The `cancelBooking` function in `backend/src/controllers/bookingController.ts` had two issues:

1. **TableStatus Update Issue**: When updating `TableStatus`, it was filtering by `currentBookingId: booking._id`, which might not match if the table status wasn't properly linked. This caused the update to fail silently.

2. **TableBooking Query Issue**: The function wasn't trying alternative searches if the first query didn't find a match with the userId.

## Solution

### 1. Fixed TableStatus Update
Changed the query to find tables by `businessId` and `tableId` only, without requiring `currentBookingId` to match:

```typescript
// Before (line 779-786)
const tableStatus = await TableStatus.findOneAndUpdate(
  {
    businessId: new mongoose.Types.ObjectId(restaurantId),
    tableId: tableId,
    currentBookingId: booking._id  // ❌ This could fail to match
  },
  { ... }
);

// After
const tableStatus = await TableStatus.findOneAndUpdate(
  {
    businessId: new mongoose.Types.ObjectId(restaurantId),
    tableId: tableId  // ✅ Only match by table location
  },
  {
    status: 'Ready',
    currentBookingId: undefined,
    lastStatusChange: new Date()
  },
  { new: true }
);
```

### 2. Added Fallback Query for TableBooking
Added a fallback query that tries without `userId` if the first query doesn't find a match:

```typescript
// Try with userId first
let tableBooking = await TableBooking.findOneAndUpdate(
  {
    restaurantId,
    tableId: tableId,
    date: dateStr,
    time: booking.time,
    userId: booking.userId,
    status: { $in: ['reserved', 'confirmed', 'blocked'] }
  },
  { status: 'cancelled', cancelledAt: new Date(), blockedUntil: undefined },
  { new: true }
);

// If not found with userId, try without userId
if (!tableBooking) {
  console.log('⚠ Table booking not found with userId, trying without userId...');
  tableBooking = await TableBooking.findOneAndUpdate(
    {
      restaurantId,
      tableId: tableId,
      date: dateStr,
      time: booking.time,
      status: { $in: ['reserved', 'confirmed', 'blocked'] }
    },
    { status: 'cancelled', cancelledAt: new Date(), blockedUntil: undefined },
    { new: true }
  );
}
```

## Cleanup Scripts Created

### 1. `backend/scripts/force-unblock-table.js`
Utility script to manually unblock any stuck table:

```bash
# Unblock all instances of a table
node scripts/force-unblock-table.js T7

# Unblock a specific table at a restaurant
node scripts/force-unblock-table.js T7 6980d6a6ae7ec40527e24999

# Unblock a specific booking
node scripts/force-unblock-table.js T7 6980d6a6ae7ec40527e24999 2026-02-27 Afternoon
```

### 2. `backend/scripts/test-cancel-flow.js`
Diagnostic script to check for inconsistencies in the database:

```bash
node scripts/test-cancel-flow.js
```

This script checks for:
- Active table bookings
- Non-ready table statuses
- Ready tables with booking IDs (inconsistency)
- Cancelled bookings with blockedUntil set (inconsistency)

### 3. `backend/scripts/cleanup-table-status.js`
Cleans up TableStatus records that are marked as 'Ready' but still have a `currentBookingId`:

```bash
node scripts/cleanup-table-status.js
```

## Verification

After the fix, the cancellation flow now properly:

1. ✅ Updates the main `Booking` collection status to 'cancelled'
2. ✅ Updates the `TableBooking` collection status to 'cancelled'
3. ✅ Clears the `blockedUntil` field
4. ✅ Updates `TableStatus` to 'Ready'
5. ✅ Clears the `currentBookingId` from TableStatus
6. ✅ Emits Socket.IO `tableCancelled` event for real-time updates
7. ✅ Sends cancellation email to the customer

## Real-time Updates

The frontend (`src/pages/TableSelection.tsx`) already listens to the `tableCancelled` socket event, so when a booking is cancelled:

1. The backend emits the event to all users in the restaurant room
2. The frontend receives the event and refreshes the available tables
3. The previously blocked table immediately becomes available for booking

## Testing

To test the fix:

1. Create a booking for a table
2. Cancel the booking
3. Verify the table shows as available immediately
4. Check the database to ensure:
   - `Booking.status` = 'cancelled'
   - `TableBooking.status` = 'cancelled'
   - `TableBooking.blockedUntil` = undefined
   - `TableStatus.status` = 'Ready'
   - `TableStatus.currentBookingId` = undefined

## Files Modified

- `backend/src/controllers/bookingController.ts` - Fixed the `cancelBooking` function

## Files Created

- `backend/scripts/force-unblock-table.js` - Manual unblock utility
- `backend/scripts/test-cancel-flow.js` - Diagnostic tool
- `backend/scripts/cleanup-table-status.js` - Cleanup utility
- `BOOKING_CANCELLATION_FIX.md` - This documentation
