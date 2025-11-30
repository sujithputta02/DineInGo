# Event Registration Preview Feature

## Overview
Added a preview page for event registrations, similar to the restaurant reservation preview. Users can now review their event booking details before confirming.

## What Was Added

### 1. Event Preview Page (`src/pages/EventPreview.tsx`)

A new page that shows:
- **Event Details**: Title, category, date, time, location
- **Attendee Information**: Number of guests or selected seats
- **Selected Seats**: Visual display of seat IDs (for events with seating)
- **Contact Form**: Full name, email, phone number, special requests
- **Payment Summary**: Total amount breakdown
- **Action Buttons**: Go back or confirm booking

### 2. Updated Event Registration Flow

**Before:**
```
Event Page → Select Seats → Click "Register Now" → Booking Created → Dashboard
```

**After:**
```
Event Page → Select Seats → Click "Continue to Preview" → Preview Page → Fill Contact Info → Click "Confirm Booking" → Booking Created → Dashboard
```

### 3. Route Added

New route in `src/App.tsx`:
```typescript
<Route path="/event/:id/preview" element={<EventPreview />} />
```

## Features

### For Events WITH Seating

**Preview shows:**
- Selected seat numbers (e.g., A-1, A-2, B-5)
- Visual seat badges with purple styling
- Individual seat count
- Total amount based on seat prices

**Example:**
```
Selected Seats: [A-1] [A-2] [B-5]
Total Seats: 3
Total Amount: ₹3500
```

### For Events WITHOUT Seating

**Preview shows:**
- Number of attendees
- Price per ticket
- Total amount

**Example:**
```
Attendees: 3 People
Total Amount: ₹4500
```

## User Flow

### 1. Select Event & Seats
- User navigates to event registration page
- Selects seats (if event has seating) or number of guests
- Clicks "Continue to Preview"

### 2. Review & Fill Details
- System navigates to preview page with event data
- User reviews:
  - Event details (date, time, location)
  - Selected seats or guest count
  - Total amount
- User fills in contact information:
  - Full Name (required)
  - Email (required)
  - Phone Number (required)
  - Special Requests (optional)

### 3. Confirm Booking
- User clicks "Confirm Booking"
- System creates booking in database
- System updates event (seat status or registered count)
- User redirected to dashboard with success message

## Benefits

✅ **Better UX**: Users can review before committing
✅ **Collect Contact Info**: Get user details for communication
✅ **Reduce Errors**: Users can verify details before booking
✅ **Professional**: Matches restaurant booking flow
✅ **Flexible**: Works for both seating and non-seating events
✅ **Clear Pricing**: Shows total amount upfront

## Technical Details

### Data Flow

1. **EventRegistration → EventPreview**
   ```typescript
   navigate(`/event/${event._id}/preview?${queryParams}`, {
     state: {
       event,
       selectedSeatIds,
       numberOfGuests,
       totalAmount
     }
   });
   ```

2. **EventPreview → API**
   ```typescript
   POST /api/bookings
   {
     userId, eventId, eventName,
     date, time, guests,
     selectedSeats, // if seating event
     fullName, email, phoneNumber,
     specialRequest, totalAmount
   }
   ```

3. **EventPreview → Dashboard**
   ```typescript
   navigate('/dashboard', {
     state: {
       bookingSuccess: true,
       newBooking: data
     }
   });
   ```

### Validation

**Required Fields:**
- Full Name
- Email
- Phone Number

**Optional Fields:**
- Special Requests

**Button States:**
- Disabled if required fields are empty
- Shows loading spinner while submitting
- Prevents double submission

## Styling

### Color Scheme
- **Primary**: Purple (#9333ea) - for events
- **Accent**: Purple-600 (#7c3aed)
- **Background**: Purple-50 for summary boxes
- **Badges**: Purple-600 for seat badges

### Responsive Design
- Mobile-friendly layout
- Stacked form fields on small screens
- Flexible button layout

## Files Modified

### Created:
- `src/pages/EventPreview.tsx` - New preview page

### Modified:
- `src/pages/EventRegistration.tsx` - Changed button to navigate to preview
- `src/App.tsx` - Added preview route and page title

## Testing

### Test Case 1: Event with Seating
1. Go to Wine Tasting Experience
2. Select seats A-1, A-2, B-5
3. Click "Continue to Preview"
4. Verify seats are displayed
5. Fill in contact info
6. Click "Confirm Booking"
7. Verify booking created with seat info

### Test Case 2: Event without Seating
1. Go to Food Festival
2. Select 3 guests
3. Click "Continue to Preview"
4. Verify guest count is displayed
5. Fill in contact info
6. Click "Confirm Booking"
7. Verify booking created with guest count

### Test Case 3: Validation
1. Go to any event
2. Select seats/guests
3. Click "Continue to Preview"
4. Try to confirm without filling fields
5. Verify button is disabled
6. Fill in fields
7. Verify button becomes enabled

### Test Case 4: Back Navigation
1. Go to preview page
2. Click "Go Back"
3. Verify returns to event registration
4. Verify seats/guests still selected

## Future Enhancements

- Add payment gateway integration
- Show seat tier information (VIP/Premium/Standard)
- Add promo code support
- Email confirmation preview
- Save draft bookings
- Add calendar integration
- Show event organizer contact info
