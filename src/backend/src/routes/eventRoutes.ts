import express from 'express';
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  searchEvents,
  getUpcomingEvents,
  registerForEvent
} from '../controllers/eventController';
import { uploadCloud as upload } from '../config/cloudinary';
import {
  getEventReviews,
  addEventReview,
  getEventRatingStats,
  replyToReview,
  updateReview,
  updateReply,
  deleteReply,
  deleteReview,
  likeReview,
  dislikeReview
} from '../controllers/reviewController';
import { verifyUserToken } from '../middleware/userAuth';
import { verifyBusinessOwner } from '../middleware/businessAuth';
import { Event } from '../models/Event';
import mongoose from 'mongoose';

const router = express.Router();

// Helper middleware for event ownership validation
const verifyEventOwnerAccess = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const requester = (req as any).user;
    if (!requester) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    const eventId = req.params.id;
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is missing.' });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    // Verify if requester is organizer (by uid or email or organizer name)
    const isOrganizer = event.organizer === requester.uid || event.organizer === requester.email;

    // Also allow admins
    const { User } = require('../models/User');
    const userDoc = await User.findOne({ uid: requester.uid });
    const isAdmin = userDoc && (userDoc.role === 'admin' || userDoc.isAdmin);

    if (!isOrganizer && !isAdmin) {
      return res.status(403).json({ error: 'Access Denied: You are not the organizer of this event.' });
    }

    next();
  } catch (error) {
    console.error('Error verifying event owner access:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Helper middleware for review ownership check
const verifyReviewOwner = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const requester = (req as any).user;
    if (!requester) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required.' });
    }

    const reviewId = req.params.id;
    if (!reviewId || !mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ error: 'Invalid or missing review ID.' });
    }

    const { Review } = require('../models/Review');
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: 'Review not found.' });
    }

    if (review.userId !== requester.uid) {
      const { User } = require('../models/User');
      const userDoc = await User.findOne({ uid: requester.uid });
      const isAdmin = userDoc && (userDoc.role === 'admin' || userDoc.isAdmin);

      if (!isAdmin) {
        return res.status(403).json({ error: 'Access Denied: You do not own this review.' });
      }
    }

    next();
  } catch (error) {
    console.error('Error verifying review owner access:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get all events
router.get('/', getAllEvents);

// Get upcoming events
router.get('/upcoming', getUpcomingEvents);

// Search events
router.get('/search', searchEvents);

// Get event by ID
router.get('/:id', getEventById);

// Create new event
router.post('/', verifyUserToken, verifyBusinessOwner, createEvent);

// Update event
router.put('/:id', verifyUserToken, verifyBusinessOwner, verifyEventOwnerAccess, updateEvent);

// Delete event
router.delete('/:id', verifyUserToken, verifyBusinessOwner, verifyEventOwnerAccess, deleteEvent);

// Register for event (handles both seating and non-seating events)
router.post('/:id/register', verifyUserToken, registerForEvent);

// Event Review Routes
router.get('/:eventId/reviews', getEventReviews);
router.post('/:eventId/reviews', 
  verifyUserToken,
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.log('=== Review POST request received ===');
    console.log('EventId:', req.params.eventId);
    console.log('Content-Type:', req.headers['content-type']);
    next();
  },
  upload.array('images', 5), 
  (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err) {
      console.error('Multer/Upload error:', err);
      return res.status(400).json({
        success: false,
        message: 'File upload error: ' + err.message
      });
    }
    next();
  },
  addEventReview
);
router.get('/:eventId/reviews/stats', getEventRatingStats);
router.put('/reviews/:id', verifyUserToken, verifyReviewOwner, upload.array('images', 5), updateReview);
router.delete('/reviews/:id', verifyUserToken, verifyReviewOwner, deleteReview);
router.post('/reviews/:id/reply', verifyUserToken, verifyBusinessOwner, replyToReview);
router.put('/reviews/:id/reply', verifyUserToken, verifyBusinessOwner, updateReply);
router.delete('/reviews/:id/reply', verifyUserToken, verifyBusinessOwner, deleteReply);
router.post('/reviews/:reviewId/like', verifyUserToken, likeReview);
router.post('/reviews/:reviewId/dislike', verifyUserToken, dislikeReview);

// Unregister from event (decrement count)
router.post('/:id/unregister', verifyUserToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { guests = 1 } = req.body;

    const Event = require('../models/Event').Event;
    const event = await Event.findByIdAndUpdate(
      id,
      { $inc: { registeredCount: -guests } },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Ensure registeredCount doesn't go below 0
    if (event.registeredCount < 0) {
      event.registeredCount = 0;
      await event.save();
    }

    res.json({ success: true, event });
  } catch (error) {
    console.error('Error unregistering from event:', error);
    res.status(500).json({ message: 'Failed to unregister from event' });
  }
});

/**
 * POST /api/events/:id/recalculate-areas
 * Recalculates area.booked counts from confirmed (non-cancelled) bookings.
 * Fixes corrupted counts caused by cancelled bookings that weren't decremented.
 */
router.post('/:id/recalculate-areas', async (req, res) => {
  try {
    const { id } = req.params;
    const { Booking } = require('../models/Booking');
    const { Business } = require('../models/Business');
    const { Event } = require('../models/Event');

    // Try both collections
    const business = await Business.findById(id);
    const event = !business ? await Event.findById(id) : null;
    const doc = business || event;

    if (!doc) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const sl = business
      ? (business.seatingLayout?.eventConfig || business.seatingLayout)
      : event.seatingLayout;

    const areas: any[] = sl?.concertAreas || sl?.areas || [];

    if (!areas.length) {
      return res.status(200).json({ message: 'No areas to recalculate', areas: [] });
    }

    // Get all confirmed (non-cancelled) bookings for this event
    const confirmedBookings = await Booking.find({
      $or: [{ eventId: id }, { businessId: id }],
      status: { $nin: ['cancelled'] },
      selectedSeats: { $exists: true, $ne: [] }
    });

    // Count confirmed guests per area
    const areaGuestMap: Record<string, number> = {};
    for (const booking of confirmedBookings) {
      const selectedAreaId = (booking.selectedSeats || [])[0];
      if (selectedAreaId && areas.some((a: any) => a.id === selectedAreaId)) {
        areaGuestMap[selectedAreaId] = (areaGuestMap[selectedAreaId] || 0) + (booking.guests || booking.seats || 1);
      }
    }

    // Apply recalculated counts
    const updated: any[] = [];
    areas.forEach((area: any, idx: number) => {
      const newBooked = areaGuestMap[area.id] || 0;
      if (business) {
        if (business.seatingLayout?.eventConfig?.concertAreas) {
          business.seatingLayout.eventConfig.concertAreas[idx].booked = newBooked;
        } else if (business.seatingLayout?.areas) {
          business.seatingLayout.areas[idx].booked = newBooked;
        }
      } else {
        event.seatingLayout.areas[idx].booked = newBooked;
      }
      updated.push({ id: area.id, name: area.name || area.label, capacity: area.capacity, newBooked });
    });

    doc.markModified('seatingLayout');
    await doc.save();

    // Emit socket updates for each area
    const io = req.app.get('io');
    if (io) {
      updated.forEach(area => {
        io.to(`event-${id}`).emit('areaCancelled', {
          eventId: id,
          areaId: area.id,
          booked: area.newBooked,
          capacity: area.capacity,
          availableSpots: area.capacity - area.newBooked
        });
      });
    }

    console.log(`Recalculated area counts for event ${id}:`, updated);
    res.json({ success: true, message: 'Area counts recalculated from confirmed bookings', areas: updated });
  } catch (error) {
    console.error('Error recalculating area counts:', error);
    res.status(500).json({ message: 'Failed to recalculate area counts' });
  }
});

export default router; 