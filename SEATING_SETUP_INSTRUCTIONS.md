# Quick Setup Instructions for Event Seating

## Step 1: Seed Events with Seating Layout

Run this command in your backend folder:

```bash
cd backend
npm run seed:events
```

This will:
- Clear all existing events
- Create 5 new events
- 3 events WITH seating (Wine Tasting, Craft Beer Workshop, Coffee Cupping)
- 2 events WITHOUT seating (Food Festival, Cooking Masterclass)

## Step 2: Verify the Seeding

You should see output like:
```
✅ Successfully inserted 5 events

📅 Inserted Events:
1. Wine Tasting Experience - WITH SEATING - 1/25/2026
2. Bangalore Food Festival - NO SEATING - 2/15/2026
3. Craft Beer Workshop - WITH SEATING - 2/20/2026
4. South Indian Cooking Masterclass - NO SEATING - 3/5/2026
5. Coffee Cupping Session - WITH SEATING - 3/12/2026
```

## Step 3: Test the Seating System

1. Make sure your backend is running:
   ```bash
   cd backend
   npm run dev
   ```

2. Make sure your frontend is running:
   ```bash
   npm run dev
   ```

3. Navigate to the Events page in your app

4. Click on one of these events:
   - **Wine Tasting Experience** (8 rows × 12 columns = 96 seats)
   - **Craft Beer Workshop** (6 rows × 10 columns = 60 seats)
   - **Coffee Cupping Session** (5 rows × 8 columns = 40 seats)

5. You should see:
   - Interactive seating chart with colored seats
   - VIP seats (yellow) in first 2 rows
   - Premium seats (purple) in rows 3-5
   - Standard seats (gray) in remaining rows
   - Click seats to select/deselect
   - Total price updates based on selected seats

## Troubleshooting

### If seating doesn't show:

1. **Check browser console** - Look for the debug logs:
   ```
   Fetched event data: {...}
   Has seating: true
   Seating layout: {...}
   ```

2. **Verify the event has seating** - The API response should include:
   ```json
   {
     "hasSeating": true,
     "seatingLayout": {
       "rows": 8,
       "columns": 12,
       "seats": [...]
     }
   }
   ```

3. **Check the database** - Connect to MongoDB and verify events have the seatingLayout field

4. **Clear browser cache** - Sometimes old data is cached

### If you get Restaurant validation errors:

The `seed:events` command only seeds events, not restaurants. If you need to seed both, use:
```bash
npm run seed:all
```

But make sure the restaurant data in `seedRestaurantsAndEvents.ts` has all required fields.

## Alternative: Seed Only Events via Direct Script

If npm scripts don't work, run directly:
```bash
cd backend
npx ts-node seedEventsOnly.ts
```

## What Each Event Has

| Event | Seating | Rows | Cols | Total Seats | Base Price |
|-------|---------|------|------|-------------|------------|
| Wine Tasting | ✅ Yes | 8 | 12 | 96 | ₹500 |
| Food Festival | ❌ No | - | - | 500 guests | ₹1500 |
| Craft Beer | ✅ Yes | 6 | 10 | 60 | ₹300 |
| Cooking Class | ❌ No | - | - | 30 guests | ₹3000 |
| Coffee Cupping | ✅ Yes | 5 | 8 | 40 | ₹200 |

## Pricing Tiers

- **VIP** (First 2 rows): 3× base price
- **Premium** (Rows 3-5): 2× base price
- **Standard** (Remaining rows): 1× base price

Example for Wine Tasting (base ₹500):
- VIP seats: ₹1500
- Premium seats: ₹1000
- Standard seats: ₹500
