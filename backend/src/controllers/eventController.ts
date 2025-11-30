import { Request, Response } from 'express';
import { Event } from '../models/Event';

// Get all events
export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get event by ID
export const getEventById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format'
      });
    }
    
    const event = await Event.findById(id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.status(200).json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create new event
export const createEvent = async (req: Request, res: Response) => {
  try {
    const event = new Event(req.body);
    await event.save();
    
    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to create event',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update event
export const updateEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await Event.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update event',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete event
export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await Event.findByIdAndDelete(id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Search events
export const searchEvents = async (req: Request, res: Response) => {
  try {
    const { query, location } = req.query;
    
    let searchCriteria: any = {};
    
    if (query) {
      searchCriteria.$or = [
        { title: { $regex: query as string, $options: 'i' } },
        { description: { $regex: query as string, $options: 'i' } }
      ];
    }
    
    if (location) {
      searchCriteria.location = { $regex: location as string, $options: 'i' };
    }

    const events = await Event.find(searchCriteria).sort({ date: 1 });
    
    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error('Error searching events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search events',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get upcoming events
export const getUpcomingEvents = async (req: Request, res: Response) => {
  try {
    const currentDate = new Date();
    const events = await Event.find({
      date: { $gte: currentDate }
    }).sort({ date: 1 }).limit(10);
    
    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming events',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Register for event (update seat status or increment count)
export const registerForEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { seatIds, userId, guests } = req.body;

    const event = await Event.findById(id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // If event has seating, update seat statuses
    if (event.hasSeating && event.seatingLayout && seatIds && seatIds.length > 0) {
      // Check if seats are available
      const unavailableSeats = event.seatingLayout.seats.filter(
        seat => seatIds.includes(seat.id) && seat.status === 'booked'
      );

      if (unavailableSeats.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Some selected seats are no longer available',
          unavailableSeats: unavailableSeats.map(s => s.id)
        });
      }

      // Check if booking would exceed capacity
      const availableSeats = event.seatingLayout.seats.filter(s => s.status === 'available').length;
      if (seatIds.length > availableSeats) {
        return res.status(400).json({
          success: false,
          message: 'Not enough seats available'
        });
      }

      // Update seat statuses
      event.seatingLayout.seats = event.seatingLayout.seats.map(seat => {
        if (seatIds.includes(seat.id)) {
          return {
            ...seat,
            status: 'booked' as const,
            bookedBy: userId
          };
        }
        return seat;
      });

      event.registeredCount += seatIds.length;

      await event.save();

      // Emit real-time update via Socket.IO AFTER saving
      const io = req.app.get('io');
      if (io) {
        io.to(`event-${id}`).emit('seatsBooked', {
          eventId: id,
          seatIds,
          userId,
          registeredCount: event.registeredCount,
          capacity: event.capacity,
          availableSeats: event.seatingLayout.seats.filter(s => s.status === 'available').length
        });
        console.log(`Emitted seatsBooked event for event ${id}, seats: ${seatIds.join(', ')}`);
      }
    } else {
      // For events without seating, check capacity
      const spotsRequested = guests || 1;
      const spotsAvailable = event.capacity - event.registeredCount;

      if (spotsRequested > spotsAvailable) {
        return res.status(400).json({
          success: false,
          message: `Only ${spotsAvailable} spot(s) available, but ${spotsRequested} requested`
        });
      }

      // Increment the count
      event.registeredCount += spotsRequested;

      await event.save();

      // Emit real-time update via Socket.IO AFTER saving
      const io = req.app.get('io');
      if (io) {
        io.to(`event-${id}`).emit('eventRegistered', {
          eventId: id,
          guests: spotsRequested,
          registeredCount: event.registeredCount,
          capacity: event.capacity,
          spotsLeft: event.capacity - event.registeredCount
        });
        console.log(`Emitted eventRegistered event for event ${id}, guests: ${spotsRequested}`);
      }
    }

    res.status(200).json({
      success: true,
      data: event,
      message: 'Successfully registered for event'
    });
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register for event',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 