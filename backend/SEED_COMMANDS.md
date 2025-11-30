# Seed Commands Reference

## Available Commands

### 1. Seed Events Only (Recommended)
```bash
npm run seed:events
```
- Only seeds events (keeps existing restaurants)
- Creates 3 events with seating + 2 without seating
- Safe to run multiple times

### 2. Seed Everything
```bash
npm run seed:all
```
- Seeds both restaurants AND events
- Clears all existing data
- Use only if you need fresh restaurants too

### 3. Direct TypeScript Execution
```bash
npx ts-node seedEventsOnly.ts
```
- Runs the seed script directly
- Use if npm scripts have issues

## What Gets Created

### Events WITH Seating:
1. **Wine Tasting Experience**
   - 8 rows × 12 columns = 96 seats
   - Base price: ₹500
   - VIP: ₹1500, Premium: ₹1000, Standard: ₹500

2. **Craft Beer Workshop**
   - 6 rows × 10 columns = 60 seats
   - Base price: ₹300
   - VIP: ₹900, Premium: ₹600, Standard: ₹300

3. **Coffee Cupping Session**
   - 5 rows × 8 columns = 40 seats
   - Base price: ₹200
   - VIP: ₹600, Premium: ₹400, Standard: ₹200

### Events WITHOUT Seating:
1. **Bangalore Food Festival** - 500 capacity, ₹1500 per person
2. **South Indian Cooking Masterclass** - 30 capacity, ₹3000 per person

## Expected Output

```
--- SEED EVENTS SCRIPT STARTED ---
Using MongoDB URI: mongodb+srv://...
Connecting to MongoDB Atlas...
Connected to MongoDB Atlas successfully
Clearing existing events...
Deleted events: X
Inserting events...
✅ Successfully inserted 5 events

📊 Seeding Summary:
Events: 5

🎉 Seeding completed successfully!

📅 Inserted Events:
1. Wine Tasting Experience - WITH SEATING - 1/25/2026
2. Bangalore Food Festival - NO SEATING - 2/15/2026
3. Craft Beer Workshop - WITH SEATING - 2/20/2026
4. South Indian Cooking Masterclass - NO SEATING - 3/5/2026
5. Coffee Cupping Session - WITH SEATING - 3/12/2026
```
