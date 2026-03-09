# Event Review System - Complete Implementation Guide

## Summary
The event review system has been implemented to match the restaurant review system exactly. All backend infrastructure is complete and working. The frontend needs final integration.

## ✅ Completed Backend

### 1. Review Model Updated
- Added `eventId` field
- Added `entityType` field ('business' | 'event')
- Maintains backward compatibility with restaurant reviews
- Indexes created for event reviews

### 2. Review Controller Functions
All functions are implemented and tested:
- `getEventReviews` - Get all reviews for an event
- `addEventReview` - Submit a review for an event
- `getEventRatingStats` - Get average rating and distribution
- `getUserReviews` - Updated to include both business and event reviews
- `replyToReview` - Owner can reply (reused from restaurant)
- `updateReview` - User can edit review (reused)
- `deleteReview` - Delete review (reused)

### 3. API Endpoints
All routes are configured in `backend/src/routes/eventRoutes.ts`:
```
GET    /api/events/:eventId/reviews          - Get all reviews
POST   /api/events/:eventId/reviews          - Add review
GET    /api/events/:eventId/reviews/stats    - Get stats
PUT    /api/events/reviews/:id               - Update review
DELETE /api/events/reviews/:id               - Delete review
POST   /api/events/reviews/:id/reply         - Add reply
PUT    /api/events/reviews/:id/reply         - Update reply
DELETE /api/events/reviews/:id/reply         - Delete reply
```

## 🔧 Frontend Integration Steps

### Step 1: Add Review State to EventRegistration.tsx

Add after line 65 (after selectedAddOns state):
```typescript
  // Review state
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
```

### Step 2: Add Review Functions

Add after the `fetchEvent` function:
```typescript
  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/events/${id}/reviews`);
      const data = await response.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) 