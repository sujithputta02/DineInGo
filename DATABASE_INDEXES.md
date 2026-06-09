# Database Index Optimization for 500+ Users

## 🎯 Purpose
Database indexes dramatically speed up queries. Without indexes, MongoDB scans every document (O(n)). With indexes, queries are O(log n).

**Impact**: 10-100x faster query performance

---

## 📊 Critical Indexes for DineInGo

### 1. User Collection
```javascript
// Compound index for auth queries
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ uid: 1 }, { unique: true })
db.users.createIndex({ phoneNumber: 1 }, { sparse: true })
```

### 2. Restaurant Collection
```javascript
// Geospatial index for location-based searches
db.restaurants.createIndex({ location: "2dsphere" })

// Text search index for restaurant search
db.restaurants.createIndex({ 
  name: "text", 
  cuisine: "text", 
  description: "text" 
}, { weights: { name: 10, cuisine: 5, description: 1 } })

// Status and category filters
db.restaurants.createIndex({ status: 1, category: 1 })
db.restaurants.createIndex({ ownerId: 1 })
```

### 3. Booking Collection
```javascript
// Compound index for booking queries
db.tablebookings.createIndex({ userId: 1, date: -1 })
db.tablebookings.createIndex({ restaurantId: 1, date: 1, time: 1 })
db.tablebookings.createIndex({ status: 1, date: 1 })

// Auto-confirm optimization
db.tablebookings.createIndex({ status: 1, autoConfirmAt: 1 })
```

### 4. Menu Collection
```javascript
db.menuitems.createIndex({ restaurantId: 1, category: 1 })
db.menuitems.createIndex({ restaurantId: 1, isAvailable: 1 })
```

### 5. Events Collection
```javascript
db.events.createIndex({ restaurantId: 1, eventDate: -1 })
db.events.createIndex({ status: 1, eventDate: 1 })
```

### 6. Food Scans Collection (AR Menu)
```javascript
// User history queries
db.foodscans.createIndex({ userId: 1, createdAt: -1 })

// Learning system queries
db.foodscans.createIndex({ correctedName: 1 })
db.foodscans.createIndex({ "metadata.ocrText": 1 })
```

---

## 🚀 Implementation Methods

### Method 1: MongoDB Compass (GUI - Easiest)
1. Open MongoDB Compass
2. Connect to your Atlas cluster
3. Select each collection
4. Go to "Indexes" tab
5. Click "Create Index"
6. Paste index definitions
7. Click "Create"

### Method 2: MongoDB Shell
```bash
# Connect to your database
mongosh "mongodb+srv://your-cluster-url" --username your-username

# Switch to your database
use dineingo

# Run index creation commands
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ uid: 1 }, { unique: true })
# ... (paste all indexes from above)
```

### Method 3: Mongoose Migration Script (Automated)
Create `backend/src/scripts/createIndexes.ts`:

```typescript
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { TableBooking } from '../models/TableBooking';
import { MenuItem } from '../models/MenuItem';
import { Event } from '../models/Event';

dotenv.config();

async function createIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');

    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ uid: 1 }, { unique: true });
    await User.collection.createIndex({ phoneNumber: 1 }, { sparse: true });
    console.log('✅ User indexes created');

    // Restaurant indexes
    await Restaurant.collection.createIndex({ location: "2dsphere" });
    await Restaurant.collection.createIndex({ 
      name: "text", 
      cuisine: "text", 
      description: "text" 
    }, { weights: { name: 10, cuisine: 5, description: 1 } });
    await Restaurant.collection.createIndex({ status: 1, category: 1 });
    await Restaurant.collection.createIndex({ ownerId: 1 });
    console.log('✅ Restaurant indexes created');

    // Booking indexes
    await TableBooking.collection.createIndex({ userId: 1, date: -1 });
    await TableBooking.collection.createIndex({ restaurantId: 1, date: 1, time: 1 });
    await TableBooking.collection.createIndex({ status: 1, date: 1 });
    await TableBooking.collection.createIndex({ status: 1, autoConfirmAt: 1 });
    console.log('✅ Booking indexes created');

    // Menu indexes
    await MenuItem.collection.createIndex({ restaurantId: 1, category: 1 });
    await MenuItem.collection.createIndex({ restaurantId: 1, isAvailable: 1 });
    console.log('✅ Menu indexes created');

    // Event indexes
    await Event.collection.createIndex({ restaurantId: 1, eventDate: -1 });
    await Event.collection.createIndex({ status: 1, eventDate: 1 });
    console.log('✅ Event indexes created');

    console.log('\n🎉 All indexes created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  }
}

createIndexes();
```

Add to `backend/package.json`:
```json
{
  "scripts": {
    "db:index": "ts-node src/scripts/createIndexes.ts"
  }
}
```

Run with:
```bash
cd backend
npm run db:index
```

---

## 📈 Performance Impact

### Before Indexes
```
Query: Find user by email
Execution time: 150ms (full collection scan)
Documents examined: 10,000

Query: Find bookings for restaurant on date
Execution time: 450ms
Documents examined: 50,000
```

### After Indexes
```
Query: Find user by email
Execution time: 5ms (index lookup)
Documents examined: 1

Query: Find bookings for restaurant on date
Execution time: 12ms
Documents examined: 23
```

**Result**: 30-90x faster queries!

---

## ⚠️ Important Notes

1. **Unique Indexes**: Only one document can have each value
   - Good for: email, uid
   - Bad for: status, category

2. **Compound Indexes**: Order matters!
   - `{userId: 1, date: -1}` works for:
     - `find({userId: "123"})`
     - `find({userId: "123", date: {...}})`
   - Does NOT work for:
     - `find({date: {...}})` alone

3. **Text Indexes**: Only one per collection
   - Used for full-text search
   - Automatically used with `$text` operator

4. **2dsphere Indexes**: For geospatial queries
   - Required for location-based searches
   - Used with `$near`, `$geoWithin`

5. **Index Size**: Indexes use memory
   - Each index: ~10-50MB for 100k documents
   - Monitor with: `db.collection.stats()`

---

## 🔍 Verify Indexes

### Check Existing Indexes
```javascript
db.users.getIndexes()
db.restaurants.getIndexes()
db.tablebookings.getIndexes()
```

### Analyze Query Performance
```javascript
// Before creating indexes
db.users.find({email: "test@example.com"}).explain("executionStats")

// After creating indexes
// executionStats.totalDocsExamined should be 1 (not thousands)
```

---

## 🎯 Expected Results

After implementing all indexes:
- ✅ Authentication queries: <10ms (was 100-200ms)
- ✅ Restaurant search: <50ms (was 300-500ms)
- ✅ Booking queries: <20ms (was 200-400ms)
- ✅ Menu loading: <30ms (was 150-300ms)
- ✅ Overall API response: <200ms (was 500-1000ms)

**Total impact**: System can handle 5-10x more concurrent users with same hardware!

---

## 🚨 Troubleshooting

### Index Creation Failed
```
Error: Index already exists with different options
```
**Solution**: Drop old index first
```javascript
db.collection.dropIndex("index_name")
```

### Out of Memory
```
Error: Exceeded memory limit during index creation
```
**Solution**: Create indexes one at a time, or upgrade MongoDB tier

### Slow Index Creation
- Large collections (>100k docs) take 5-30 minutes
- Indexes are created in background by default
- Don't interrupt the process

---

## ✅ Post-Implementation Checklist

- [ ] All indexes created successfully
- [ ] Verified with `getIndexes()`
- [ ] Tested queries with `explain()`
- [ ] Monitored MongoDB Atlas performance metrics
- [ ] API response times improved
- [ ] No index-related errors in logs

---

## 📞 Next Steps

After completing database indexes:
1. ✅ Implement Redis caching (REDIS_SETUP.md)
2. ✅ Add response compression (BACKEND_OPTIMIZATIONS.md)
3. ✅ Configure auto-scaling (RENDER_SCALING.md)
