# Debug Business Save Issue

## Problem
Your business is not being saved to the database. Only the test business exists.

## Steps to Debug

### 1. Check if You're Logged In
- Open browser console (F12)
- Type: `localStorage.getItem('user')`
- You should see user data with a `uid`
- If null, you need to log in first

### 2. Check Browser Console for Errors
When you click "Save" or "Next" in business onboarding:
- Open browser console (F12)
- Look for red error messages
- Look for failed network requests (Status 401, 403, 500)
- Look for "User not authenticated" errors

### 3. Check Backend Terminal Logs
When you click "Save", you should see in backend terminal:
```
=== CREATE BUSINESS CALLED ===
Request body keys: [...]
Business name: Your Event Name
Business type: event
Has seatingLayout: true
Has startDate: true
Has endDate: true
```

If you DON'T see these logs, the API is not being called.

### 4. Check Network Tab
- Open browser DevTools (F12)
- Go to Network tab
- Click "Save" in business onboarding
- Look for POST request to `/api/business`
- Check the request payload
- Check the response

### 5. Common Issues

#### Issue: "User not authenticated"
**Solution**: You need to log in first
- Go to business login page
- Create an account or log in
- Then try creating the business

#### Issue: No API call is made
**Solution**: Check if businessId exists
- The save function checks if businessId exists
- If creating new business, businessId should be null initially
- After first save, businessId should be set

#### Issue: Validation errors
**Solution**: Check required fields
- Business name is required
- Location is required
- Type is required (restaurant/event/both)

### 6. Manual Test

Try creating a business manually via curl:

```bash
curl -X POST http://localhost:5001/api/business \
  -H "Content-Type: application/json" \
  -d '{
    "ownerId": "test-owner-123",
    "name": "Test Event",
    "location": "Test Location",
    "type": "event",
    "bookingType": "seat-based",
    "basePrice": 100,
    "capacity": 200,
    "eventType": "Concert",
    "duration": 120,
    "startDate": "2026-03-15",
    "endDate": "2026-03-17",
    "timeSlots": [],
    "tierPricing": {
      "standard": {"price": 100, "defaultCapacity": 50},
      "premium": {"price": 200, "defaultCapacity": 30},
      "vip": {"price": 500, "defaultCapacity": 20}
    },
    "seatingLayout": {
      "eventConfig": {
        "concertAreas": [
          {
            "id": "area-1",
            "name": "VIP Section",
            "capacity": 50,
            "price": 500,
            "color": "#f59e0b"
          }
        ]
      }
    }
  }'
```

Then check if it was created:
```bash
node backend/scripts/list-all-businesses.js
```

## What to Share

Please share:
1. Browser console output (any errors)
2. Backend terminal output (when you click save)
3. Network tab - request/response for `/api/business`
4. Result of `localStorage.getItem('user')` in browser console

This will help me identify exactly where the save is failing.
