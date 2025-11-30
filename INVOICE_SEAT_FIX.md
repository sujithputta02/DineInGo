# Invoice & Wallet Pass - Event Seating Fix

## What Was Fixed

Updated the invoice generation and wallet passes to properly handle event bookings with seat selection.

## Changes Made

### 1. Invoice Generation (`src/services/walletService.ts`)

**Before:** Invoices only showed generic guest counts and didn't handle seat information.

**After:** Invoices now properly display:
- Individual seat IDs for events with seating (e.g., "Seat A-1", "Seat A-2")
- Correct pricing per seat
- Total amount based on selected seats
- Fallback to general admission for events without seating

### 2. Email Invoice HTML (`src/utils/emailService.ts`)

**Before:** Email showed only guest count, no seat information.

**After:** Email now displays:
- Selected seat numbers (e.g., "A-1, A-2, B-5")
- Total number of seats
- Distinguishes between events and restaurants
- Shows "Attendees" for events vs "Guests" for restaurants

### 3. Apple Wallet Pass (`src/services/walletService.ts`)

**Before:** Only showed guest count.

**After:** Now shows:
- Seat numbers on the pass
- Purple background for events (vs green for restaurants)
- "EVENT" label instead of "RESTAURANT"
- Seat details on the back of the pass
- Total amount paid

### 4. Google Wallet Pass (`src/services/walletService.ts`)

**Before:** Only showed guest count.

**After:** Now shows:
- Seat numbers in the body
- Purple background for events
- "Event Ticket" title
- Complete seat information in details
- Total amount paid

## How It Works

### For Event Bookings WITH Seating:

```javascript
booking = {
  eventName: "Wine Tasting Experience",
  selectedSeats: ["A-1", "A-2", "B-5"],
  totalAmount: 3500,
  // ... other fields
}
```

**Invoice will show:**
- Item 1: Seat A-1 - ₹1167
- Item 2: Seat A-2 - ₹1167
- Item 3: Seat B-5 - ₹1166
- Total: ₹3500 (+ tax)

**Email will show:**
- Selected Seats: A-1, A-2, B-5
- Total Seats: 3

**Wallet Pass will show:**
- SEATS: A-1, A-2, B-5
- TOTAL: ₹3500

### For Event Bookings WITHOUT Seating:

```javascript
booking = {
  eventName: "Food Festival",
  guests: 3,
  totalAmount: 4500,
  // ... other fields
}
```

**Invoice will show:**
- Item: Food Festival - General Admission
- Description: 3 Tickets
- Total: ₹4500 (+ tax)

**Email will show:**
- Attendees: 3

**Wallet Pass will show:**
- GUESTS: 3 Tickets
- TOTAL: ₹4500

### For Restaurant Bookings:

Works as before, showing table number and guest count.

## Testing

1. **Book an event with seating:**
   - Go to Wine Tasting Experience
   - Select multiple seats (e.g., A-1, A-2, B-3)
   - Complete booking
   - Click "Invoice" button in dashboard

2. **Check the invoice:**
   - Should show each seat as a separate line item
   - Each seat should have correct pricing
   - Total should match the booking amount

3. **Check wallet passes:**
   - Apple Wallet: Should show seat numbers
   - Google Wallet: Should show seat numbers
   - Both should have purple background for events

4. **Check email (if configured):**
   - Should list all selected seats
   - Should show total number of seats
   - Should have proper event formatting

## Benefits

✅ **Accurate Invoicing:** Each seat is itemized with correct pricing
✅ **Clear Communication:** Users know exactly which seats they booked
✅ **Better UX:** Wallet passes show seat information at a glance
✅ **Professional:** Invoices look complete and detailed
✅ **Flexible:** Handles both seating and non-seating events
✅ **Backward Compatible:** Restaurant bookings still work as before

## Files Modified

- `src/services/walletService.ts` - Invoice generation and wallet passes
- `src/utils/emailService.ts` - Email HTML template

## No Breaking Changes

All existing functionality remains intact:
- Restaurant bookings work as before
- Events without seating work as before
- Only adds new functionality for events with seating
