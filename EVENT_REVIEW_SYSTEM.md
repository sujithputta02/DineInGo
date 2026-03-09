# Event Review and Rating System

## Overview
Implemented a complete review and rating system for events, similar to the restaurant review system. Users can rate events, write reviews, and event organizers can reply to reviews.

## Backend Changes

### 1. Review Model (`backend/src/models/Review.ts`)

#### Updated Schema
```typescript
{
  businessId?: ObjectId,      // Optional (for restaurants)
  eventId?: ObjectId,          // New: for event reviews
  entityType: 'business' | 'event',  // Distinguish review type
  userId: string,
  userName: string,
  userPhoto?: string,
  rating: 1-5,
  comment: string,
  reply?: {
    text: string,
    repliedAt: Date
  },
  images: string[],
  status: 'published' | 'hidden'
}
```

#### New Indexes
- `eventId + userId` for event reviews
- Maintains backward compatibility with business reviews

### 2. Review Controller (`backend/src/controllers/reviewController.ts`)

#### New Functions

**getEventReviews**
- GET `/api/events/:eventId/reviews`
- Returns all reviews for an event
- Sorted by most recent first

**addEventReview**
- POST `/api/events/:eventId/reviews`
- Creates a new event review
- Sends email notification to user
- Prevents duplicate reviews per user

**getEventRatingStats**
- GET `/api/events/:eventId/reviews/stats`
- Returns:
  - Average rating
  - Total review count
  - Rating distribution (1-5 stars)

#### Existing Functions (Reused)
- `replyToReview` - Owner replies to review
- `updateReview` - User updates their review
- `updateReply` - Owner updates their reply
- `deleteReply` - Owner deletes their reply
- `deleteReview` - Delete a review

### 3. Event Routes (`backend/src/routes/eventRoutes.ts`)

#### New Endpoints
```
GET    /api/events/:eventId/reviews          - Get all reviews
POST   /api/events/:eventId/reviews          - Add a review
GET    /api/events/:eventId/reviews/stats    - Get rating stats
PUT    /api/events/reviews/:id               - Update review
DELETE /api/events/reviews/:id               - Delete review
POST   /api/events/reviews/:id/reply         - Add reply
PUT    /api/events/reviews/:id/reply         - Update reply
DELETE /api/events/reviews/:id/reply         - Delete reply
```

## Frontend Changes

### 1. EventReviews Component (`src/components/EventReviews.tsx`)

#### Features
- **Rating Summary**
  - Average rating display
  - Total review count
  - Star rating distribution chart
  
- **Write Review Form**
  - Interactive star rating selector
  - Comment textarea
  - Submit/Cancel buttons
  - Only shown if user has attended event

- **Reviews List**
  - User avatar/initial
  - Username and date
  - Star rating
  - Review comment
  - Owner replies (if any)

#### Props
```typescript
{
  eventId: string,
  hasAttended?: boolean  // Show write review button
}
```

### 2. EventRegistration Page (`src/pages/EventRegistration.tsx`)

#### Integration
- Added EventReviews component at bottom of page
- Shows reviews for all users
- `hasAttended` can be set based on booking history

## User Flow

### Writing a Review

1. User attends an event
2. User visits event page
3. Clicks "Write a Review" button
4. Selects star rating (1-5)
5. Writes comment
6. Clicks "Submit Review"
7. Review appears in list
8. User receives email confirmation

### Viewing Reviews

1. Any user visits event page
2. Scrolls to reviews section
3. Sees:
   - Average rating and distribution
   - All published reviews
   - Owner replies

### Owner Replying

1. Owner logs into dashboard
2. Views event reviews
3. Clicks "Reply" on a review
4. Writes response
5. Submits reply
6. User receives email notification

## API Examples

### Get Event Reviews
```bash
GET /api/events/507f1f77bcf86cd799439011/reviews
```

Response:
```json
[
  {
    "_id": "...",
    "eventId": "507f1f77bcf86cd799439011",
    "entityType": "event",
    "userId": "user123",
    "userName": "John Doe",
    "rating": 5,
    "comment": "Amazing event! Great organization.",
    "createdAt": "2024-01-15T10:00:00Z",
    "reply": {
      "text": "Thank you for attending!",
      "repliedAt": "2024-01-16T09:00:00Z"
    }
  }
]
```

### Add Event Review
```bash
POST /api/events/507f1f77bcf86cd799439011/reviews
Content-Type: application/json

{
  "userId": "user123",
  "userName": "John Doe",
  "userPhoto": "https://...",
  "rating": 5,
  "comment": "Amazing event!"
}
```

### Get Rating Stats
```bash
GET /api/events/507f1f77bcf86cd799439011/reviews/stats
```

Response:
```json
{
  "averageRating": 4.5,
  "totalReviews": 42,
  "ratingDistribution": {
    "1": 1,
    "2": 2,
    "3": 5,
    "4": 14,
    "5": 20
  }
}
```

## UI Components

### Rating Summary Card
```
┌─────────────────────────────────────┐
│ Event Reviews                       │
│                                     │
│  4.5    ★★★★★                      │
│         42 reviews                  │
│                                     │
│  5 ★  ████████████████████  20     │
│  4 ★  ██████████████        14     │
│  3 ★  ████                   5     │
│  2 ★  ██                     2     │
│  1 ★  █                      1     │
└─────────────────────────────────────┘
```

### Review Card
```
┌─────────────────────────────────────┐
│ [Avatar] John Doe      ★★★★★       │
│          Jan 15, 2024               │
│                                     │
│ Amazing event! Great organization.  │
│                                     │
│ ┌─ Response from organizer ───────┐│
│ │ Thank you for attending!        ││
│ │ Jan 16, 2024                    ││
│ └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

## Database Queries

### Find all event reviews
```javascript
db.reviews.find({
  eventId: ObjectId("..."),
  entityType: "event",
  status: "published"
}).sort({ createdAt: -1 })
```

### Calculate average rating
```javascript
db.reviews.aggregate([
  { $match: { eventId: ObjectId("..."), entityType: "event" } },
  { $group: { _id: null, avgRating: { $avg: "$rating" } } }
])
```

## Testing

### Test Scenarios

1. **Submit Review**
   - Login as user
   - Visit event page
   - Click "Write a Review"
   - Select 5 stars
   - Write comment
   - Submit
   - Verify review appears

2. **View Reviews**
   - Visit event page (logged out)
   - Scroll to reviews section
   - Verify all reviews visible
   - Check rating distribution

3. **Owner Reply**
   - Login as event owner
   - View event reviews
   - Click reply on a review
   - Write response
   - Submit
   - Verify reply appears

4. **Duplicate Prevention**
   - Submit a review
   - Try to submit another review
   - Should show error: "Already reviewed"

## Future Enhancements

1. **Review Images** - Allow users to upload photos
2. **Helpful Votes** - Users can mark reviews as helpful
3. **Verified Attendee Badge** - Show badge for confirmed attendees
4. **Review Filters** - Filter by rating, date, etc.
5. **Review Moderation** - Flag inappropriate reviews
6. **Review Analytics** - Dashboard for owners
7. **Review Reminders** - Email users after event to review

## Notes

- Reviews are tied to events (Business collection with type='event')
- Same Review model handles both restaurant and event reviews
- Email notifications sent for review submission and replies
- Reviews can be edited/deleted by users
- Owners can reply, edit, or delete their replies
- All reviews are public by default (status='published')
