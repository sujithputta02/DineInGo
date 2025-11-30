# Invoice Examples - Before & After

## Event Booking with Seating

### BEFORE ❌
```
Invoice #INV-123456

Booking Details:
- Event: Wine Tasting Experience
- Date: 1/25/2026
- Time: 7:00 PM
- Guests: 3

Order Items:
(empty or generic)

Total: ₹3500
```

### AFTER ✅
```
Invoice #INV-123456

Booking Details:
- Event: Wine Tasting Experience
- Date: 1/25/2026
- Time: 7:00 PM
- Selected Seats: A-1, A-2, B-5
- Total Seats: 3

Order Items:
┌──────────┬─────────────────────────────────┬──────────┬────────────┬─────────┐
│ Item     │ Description                     │ Quantity │ Unit Price │ Total   │
├──────────┼─────────────────────────────────┼──────────┼────────────┼─────────┤
│ Seat A-1 │ Event: Wine Tasting Experience  │ 1        │ ₹1500      │ ₹1500   │
│ Seat A-2 │ Event: Wine Tasting Experience  │ 1        │ ₹1000      │ ₹1000   │
│ Seat B-5 │ Event: Wine Tasting Experience  │ 1        │ ₹1000      │ ₹1000   │
└──────────┴─────────────────────────────────┴──────────┴────────────┴─────────┘

Subtotal: ₹3500
Tax (18%): ₹630
Total: ₹4130
```

## Event Booking without Seating

### BEFORE ❌
```
Invoice #INV-123457

Booking Details:
- Event: Food Festival
- Date: 2/15/2026
- Time: 11:00 AM
- Guests: 2

Order Items:
(empty or generic)

Total: ₹3000
```

### AFTER ✅
```
Invoice #INV-123457

Booking Details:
- Event: Food Festival
- Date: 2/15/2026
- Time: 11:00 AM
- Attendees: 2

Order Items:
┌──────────────────────────────────┬─────────────┬──────────┬────────────┬─────────┐
│ Item                             │ Description │ Quantity │ Unit Price │ Total   │
├──────────────────────────────────┼─────────────┼──────────┼────────────┼─────────┤
│ Food Festival - General Admission│ 2 Tickets   │ 2        │ ₹1500      │ ₹3000   │
└──────────────────────────────────┴─────────────┴──────────┴────────────┴─────────┘

Subtotal: ₹3000
Tax (18%): ₹540
Total: ₹3540
```

## Restaurant Booking (Unchanged)

```
Invoice #INV-123458

Booking Details:
- Restaurant: Spice Garden
- Date: 2/20/2026
- Time: 8:00 PM
- Guests: 4
- Table: T-12

Order Items:
┌──────────────────┬──────────────────────────┬──────────┬────────────┬─────────┐
│ Item             │ Description              │ Quantity │ Unit Price │ Total   │
├──────────────────┼──────────────────────────┼──────────┼────────────┼─────────┤
│ Butter Chicken   │ Tender chicken in curry  │ 2        │ ₹450       │ ₹900    │
│ Naan             │ Fresh baked bread        │ 4        │ ₹50        │ ₹200    │
│ Biryani          │ Aromatic rice dish       │ 2        │ ₹350       │ ₹700    │
└──────────────────┴──────────────────────────┴──────────┴────────────┴─────────┘

Subtotal: ₹1800
Tax (18%): ₹324
Total: ₹2124
```

## Wallet Pass Examples

### Apple Wallet - Event with Seating

```
┌─────────────────────────────────────┐
│         🍷 DineInGo                 │
│                                     │
│  EVENT                              │
│  Wine Tasting Experience            │
│                                     │
│  DATE              TIME             │
│  1/25/2026         7:00 PM          │
│                                     │
│  SEATS             TOTAL            │
│  A-1, A-2, B-5     ₹3500            │
│                                     │
│  [QR CODE]                          │
│                                     │
│  Booking: DINEINGO-123456           │
└─────────────────────────────────────┘
```

### Apple Wallet - Event without Seating

```
┌─────────────────────────────────────┐
│         🍽️ DineInGo                 │
│                                     │
│  EVENT                              │
│  Food Festival                      │
│                                     │
│  DATE              TIME             │
│  2/15/2026         11:00 AM         │
│                                     │
│  GUESTS            TOTAL            │
│  2 Tickets         ₹3000            │
│                                     │
│  [QR CODE]                          │
│                                     │
│  Booking: DINEINGO-123457           │
└─────────────────────────────────────┘
```

## Email Invoice - Event with Seating

```html
Subject: Invoice for your booking at Wine Tasting Experience

┌─────────────────────────────────────────────────────────┐
│                      🍷 DineInGo                        │
│              Your Digital Dining Experience             │
└─────────────────────────────────────────────────────────┘

Invoice Generated Successfully!

Invoice #INV-123456
Date: 11/30/2025
Customer: John Doe
Email: john@example.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Booking Details

Event: Wine Tasting Experience
Date: 1/25/2026
Time: 7:00 PM
Selected Seats: A-1, A-2, B-5
Total Seats: 3

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Order Items

Item        Description                      Qty  Price   Total
────────────────────────────────────────────────────────────
Seat A-1    Event: Wine Tasting Experience   1    ₹1500   ₹1500
Seat A-2    Event: Wine Tasting Experience   1    ₹1000   ₹1000
Seat B-5    Event: Wine Tasting Experience   1    ₹1000   ₹1000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subtotal: ₹3500
Tax (18%): ₹630
Total: ₹4130

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Add to Your Digital Wallet

[📱 Add to Apple Wallet]  [📱 Add to Google Wallet]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Thank you for choosing DineInGo!
```

## Key Improvements

✅ **Seat-by-seat breakdown** - Each seat is itemized
✅ **Accurate pricing** - Shows individual seat prices (VIP/Premium/Standard)
✅ **Clear seat identification** - Easy to see which seats were booked
✅ **Professional format** - Looks like a real invoice
✅ **Wallet integration** - Seat info in digital passes
✅ **Email clarity** - Recipients know exactly what they booked
