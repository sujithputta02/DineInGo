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

const router = express.Router();

// Get all events
router.get('/', getAllEvents);

// Get upcoming events
router.get('/upcoming', getUpcomingEvents);

// Search events
router.get('/search', searchEvents);

// Get event by ID
router.get('/:id', getEventById);

// Create new event
router.post('/', createEvent);

// Update event
router.put('/:id', updateEvent);

// Delete event
router.delete('/:id', deleteEvent);

// Register for event (handles both seating and non-seating events)
router.post('/:id/register', registerForEvent);

// Unregister from event (decrement count)
router.post('/:id/unregister', async (req, res) => {
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

export default router; 