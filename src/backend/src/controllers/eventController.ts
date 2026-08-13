import { Request, Response } from 'express';
import { Event } from '../models/Event';
import { Business } from '../models/Business';
import { Booking } from '../models/Booking';

// Get all events (from both Event collection and Business collection where type is 'event' or 'both')
export const getAllEvents = async (req: Request, res: Response) => {
  try {
    // Fetch standalone events
    const standaloneEvents = await Event.find().sort({ date: 1 });

    // Fetch businesses that are events
    const businessEvents = await Business.find({
      type: { $in: ['event', 'both'] }
    }).sort({ 'startDate': 1 });

    // Fetch all active bookings for events
    const activeBookings = await Booking.find({
      status: { $in: ['confirmed', 'pending', 'checked-in', 'completed'] }
    });

    // Create a map of event/business IDs to total registered guests/seats
    const registeredCounts: Record<string, number> = {};
    for (const booking of activeBookings) {
      const id = (booking.businessId || booking.eventId || '').toString();
      if (id) {
        registeredCounts[id] = (registeredCounts[id] || 0) + (booking.seats || booking.guests || 0);
      }
    }

    // Transform business events to match event format
    const transformedBusinessEvents = businessEvents.map(business => {
      // Normalize seating layout structure
      let normalizedSeatingLayout = business.seatingLayout;

      // Check if seatingLayout is wrapped in eventConfig (from EventSeatingDesigner)
      if (business.seatingLayout?.eventConfig) {
        const config = business.seatingLayout.eventConfig;

        // Extract seats from nested structure - prioritize individualSeats over seatingLayout.seats
        const individualSeats = config.individualSeats || [];
        const gridSeats = config.seatingLayout?.seats || [];
        const seats = individualSeats.length > 0 ? individualSeats : gridSeats;

        const sections = config.seatingLayout?.sections || [];
        const areas = config.concertAreas || [];

        normalizedSeatingLayout = {
          seats: seats,
          sections: sections,
          areas: areas.map((area: any) => ({
            ...area,
            booked: area.booked || 0 // Initialize booked count
          }))
        };
      } else if (business.seatingLayout?.seats || business.seatingLayout?.areas) {
        // Already in correct format
        normalizedSeatingLayout = {
          seats: business.seatingLayout.seats || [],
          sections: business.seatingLayout.sections || [],
          areas: (business.seatingLayout.areas || []).map((area: any) => ({
            ...area,
            booked: area.booked || 0 // Initialize booked count
          }))
        };
      } else {
        // No seating layout or unrecognized format
        normalizedSeatingLayout = null;
      }

      return {
        _id: business._id,
        title: business.name,
        description: business.description,
        date: business.startDate || new Date(),
        startDate: business.startDate,
        endDate: business.endDate,
        time: business.timeSlots?.[0]?.startTime || '12:00 PM',
        location: typeof business.location === 'string'
          ? business.location
          : business.locationData?.city && business.locationData?.state
            ? `${business.locationData.city}, ${business.locationData.state}`
            : business.locationData?.address || 'Location TBD',
        capacity: business.capacity || 100,
        registeredCount: registeredCounts[business._id.toString()] || 0,
        price: business.basePrice || 0,
        imageUrl: business.thumbnail || business.coverImage,
        category: business.eventType || 'Event',
        organizer: business.name,
        hasSeating: normalizedSeatingLayout && (normalizedSeatingLayout.seats?.length > 0 || normalizedSeatingLayout.areas?.length > 0),
        seatingLayout: normalizedSeatingLayout,
        isBusinessEvent: true // Flag to identify business events
      };
    });

    // Combine both arrays - business events take precedence over standalone events with same title
    const eventMap = new Map();

    // Add standalone events first
    standaloneEvents.forEach(event => {
      const plainObj = event.toObject ? event.toObject() : event;
      const dynamicCount = registeredCounts[event._id.toString()];
      if (dynamicCount !== undefined) {
        plainObj.registeredCount = dynamicCount;
      }
      eventMap.set(event._id.toString(), plainObj);
    });

    // Add business events (will override if same ID, which shouldn't happen)
    transformedBusinessEvents.forEach(event => {
      eventMap.set(event._id.toString(), event);
    });

    // Convert map back to array
    const allEvents = Array.from(eventMap.values());

    // Sort by date
    allEvents.sort((a, b) => {
      const dateA = new Date(a.startDate || a.date);
      const dateB = new Date(b.startDate || b.date);
      return dateA.getTime() - dateB.getTime();
    });

    res.status(200).json({
      success: true,
      count: allEvents.length,
      data: allEvents
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

// Get event by ID (check both Event and Business collections)
export const getEventById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log('getEventById called with ID:', id);

    // Validate MongoDB ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      console.log('Invalid ID format');
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format'
      });
    }

    // Fetch active bookings for this event to calculate registered count
    const eventBookings = await Booking.find({
      $or: [
        { businessId: id, status: { $in: ['confirmed', 'pending', 'checked-in', 'completed'] } },
        { eventId: id, status: { $in: ['confirmed', 'pending', 'checked-in', 'completed'] } }
      ]
    });
    const totalRegistered = eventBookings.reduce((sum, b) => sum + (b.seats || b.guests || 0), 0);

    // Try to find in Event collection first
    let eventDoc = await Event.findById(id);
    let event: any = null;
    console.log('Event collection search result:', eventDoc ? 'FOUND' : 'NOT FOUND');

    if (eventDoc) {
      event = eventDoc.toObject();
      event.registeredCount = totalRegistered;
    }

    // If not found, try Business collection
    if (!eventDoc) {
      const business = await Business.findById(id);
      console.log('Business collection search result:', business ? 'FOUND' : 'NOT FOUND');

      if (business) {
        console.log('Business type:', business.type);
        console.log('Business has seatingLayout:', !!business.seatingLayout);
        if (business.seatingLayout) {
          console.log('Seating layout sections:', business.seatingLayout.sections?.length || 0);
          console.log('Seating layout seats:', business.seatingLayout.seats?.length || 0);
        }
      }

      if (business && (business.type === 'event' || business.type === 'both')) {
        // Normalize seating layout structure
        let normalizedSeatingLayout = business.seatingLayout;

        // Check if seatingLayout is wrapped in eventConfig (from EventSeatingDesigner)
        if (business.seatingLayout?.eventConfig) {
          console.log('Detected EventSeatingDesigner format, normalizing...');
          const config = business.seatingLayout.eventConfig;

          // Extract seats from nested structure - prioritize individualSeats over seatingLayout.seats
          const individualSeats = config.individualSeats || [];
          const gridSeats = config.seatingLayout?.seats || [];
          const seats = individualSeats.length > 0 ? individualSeats : gridSeats;

          const sections = config.seatingLayout?.sections || [];
          const areas = config.concertAreas || [];

          normalizedSeatingLayout = {
            seats: seats,
            sections: sections,
            areas: areas
          };

          console.log('Normalized seats count:', seats.length);
          console.log('Normalized sections count:', sections.length);
          console.log('Normalized areas count:', areas.length);
        } else if (business.seatingLayout?.seats || business.seatingLayout?.areas) {
          // Already in correct format
          console.log('Seating layout already in correct format');
          normalizedSeatingLayout = {
            seats: business.seatingLayout.seats || [],
            sections: business.seatingLayout.sections || [],
            areas: (business.seatingLayout.areas || []).map((area: any) => ({
              ...area,
              booked: area.booked || 0 // Initialize booked count
            }))
          };
        } else {
          // No seating layout or unrecognized format
          console.log('No valid seating layout found');
          normalizedSeatingLayout = null;
        }

        // Transform business to event format
        event = {
          _id: business._id,
          title: business.name,
          description: business.description,
          date: business.startDate || new Date(),
          startDate: business.startDate,
          endDate: business.endDate,
          time: business.timeSlots?.[0]?.startTime || '12:00 PM',
          location: typeof business.location === 'string'
            ? business.location
            : business.locationData?.city && business.locationData?.state
              ? `${business.locationData.city}, ${business.locationData.state}`
              : business.locationData?.address || 'Location TBD',
          capacity: business.capacity || 100,
          registeredCount: totalRegistered,
          price: business.basePrice || 0,
          imageUrl: business.thumbnail || business.coverImage,
          category: business.eventType || 'Event',
          organizer: business.name,
          hasSeating: normalizedSeatingLayout && (normalizedSeatingLayout.seats?.length > 0 || normalizedSeatingLayout.areas?.length > 0),
          seatingLayout: normalizedSeatingLayout
        };
        console.log('Transformed event hasSeating:', event.hasSeating);
        console.log('Transformed event seatingLayout exists:', !!event.seatingLayout);
      }
    }

    if (!event) {
      console.log('Event not found in either collection');
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    console.log('Returning event:', event.title || event._id);
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
    const { seatIds, userId, guests, areaId } = req.body;

    // Try Event collection first
    let event = await Event.findById(id);
    let isBusinessEvent = false;
    let business = null;

    // If not found in Event, try Business collection
    if (!event) {
      business = await Business.findById(id);
      if (business && (business.type === 'event' || business.type === 'both')) {
        isBusinessEvent = true;
      } else {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }
    }

    // Handle area booking for business events
    if (isBusinessEvent && business && areaId) {
      const seatingLayout = business.seatingLayout?.eventConfig || business.seatingLayout;
      const areas = seatingLayout?.concertAreas || seatingLayout?.areas || [];

      const areaIndex = areas.findIndex((a: any) => a.id === areaId);
      if (areaIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Area not found'
        });
      }

      const area = areas[areaIndex];
      const guestsToBook = guests || 1;
      const currentBooked = area.booked || 0;
      const availableSpots = area.capacity - currentBooked;

      if (guestsToBook > availableSpots) {
        return res.status(400).json({
          success: false,
          message: `Only ${availableSpots} spot(s) available in ${area.name || area.label}`
        });
      }

      // Update booked count
      if (business.seatingLayout?.eventConfig) {
        business.seatingLayout.eventConfig.concertAreas[areaIndex].booked = currentBooked + guestsToBook;
      } else {
        business.seatingLayout.areas[areaIndex].booked = currentBooked + guestsToBook;
      }

      business.markModified('seatingLayout'); // IMPORTANT: Force Mongoose to save nested Mixed type changes
      await business.save();

      // Emit real-time update
      const io = req.app.get('io');
      if (io) {
        io.to(`event-${id}`).emit('areaBooked', {
          eventId: id,
          areaId,
          userId,
          guests: guestsToBook,
          booked: currentBooked + guestsToBook,
          capacity: area.capacity,
          availableSpots: area.capacity - (currentBooked + guestsToBook)
        });
        console.log(`Emitted areaBooked event for area ${areaId}, guests: ${guestsToBook}`);
      }

      return res.status(200).json({
        success: true,
        message: 'Successfully registered for event area',
        area: {
          id: areaId,
          booked: currentBooked + guestsToBook,
          capacity: area.capacity
        }
      });
    }

    // Original logic unified for both Event and Business collections (non-area bookings)
    const targetDoc = isBusinessEvent ? business! : event;

    if (!targetDoc) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Determine the seating layout structure
    let layoutConfig = targetDoc.seatingLayout;
    if (isBusinessEvent && targetDoc.seatingLayout?.eventConfig) {
      layoutConfig = targetDoc.seatingLayout.eventConfig;
    }

    const hasSeating = isBusinessEvent
      ? !!(layoutConfig && (layoutConfig.seats?.length > 0 || layoutConfig.areas?.length > 0))
      : !!(event?.hasSeating && event?.seatingLayout);

    // If event has seating and specific seats or areas were selected
    if (hasSeating && layoutConfig && seatIds && seatIds.length > 0) {

      // Determine if the incoming seatIds represents an "Area" booking (since Area uses a single ID as well)
      const hasAreas = layoutConfig.areas && layoutConfig.areas.length > 0;
      const isAreaSelection = hasAreas && layoutConfig.areas.some((area: any) => seatIds.includes(area.id));

      if (isAreaSelection) {
        // Handle Area Booking for standard Events
        const selectedAreaId = seatIds[0];
        const areaIndex = layoutConfig.areas.findIndex((a: any) => a.id === selectedAreaId);

        if (areaIndex === -1) {
          return res.status(404).json({
            success: false,
            message: 'Area not found'
          });
        }

        const area = layoutConfig.areas[areaIndex];
        const guestsToBook = guests || 1;
        const currentBooked = area.booked || 0;
        const availableSpots = area.capacity - currentBooked;

        if (guestsToBook > availableSpots) {
          return res.status(400).json({
            success: false,
            message: `Only ${availableSpots} spot(s) available in ${area.name || area.label}`
          });
        }

        // Update booked count
        layoutConfig.areas[areaIndex].booked = currentBooked + guestsToBook;

        // Apply updated layout back to targetDoc
        if (isBusinessEvent) {
          if (targetDoc.seatingLayout?.eventConfig) {
            targetDoc.seatingLayout.eventConfig = layoutConfig;
          } else {
            targetDoc.seatingLayout = layoutConfig;
          }
          targetDoc.markModified('seatingLayout');
          (targetDoc as any).totalBookings = ((targetDoc as any).totalBookings || 0) + guestsToBook;
        } else {
          (targetDoc as any).seatingLayout = layoutConfig;
          (targetDoc as any).registeredCount = ((targetDoc as any).registeredCount || 0) + guestsToBook;
        }

        await targetDoc.save();

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
          io.to(`event-${id}`).emit('areaBooked', {
            eventId: id,
            areaId: selectedAreaId,
            userId,
            guests: guestsToBook,
            booked: currentBooked + guestsToBook,
            capacity: area.capacity,
            availableSpots: area.capacity - (currentBooked + guestsToBook)
          });
          console.log(`Emitted areaBooked event for area ${selectedAreaId}, guests: ${guestsToBook}`);
        }

        return res.status(200).json({
          success: true,
          data: event,
          message: 'Successfully registered for event area'
        });
      }

      // Existing logic for individual Seats
      // Check if seats are available
      if (!layoutConfig.seats) {
        return res.status(400).json({
          success: false,
          message: 'No seats configured for this event'
        });
      }

      const unavailableSeats = layoutConfig.seats.filter(
        (seat: any) => seatIds.includes(seat.id) && seat.status === 'booked'
      );

      if (unavailableSeats.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'Some selected seats are no longer available',
          unavailableSeats: unavailableSeats.map((s: any) => s.id)
        });
      }

      // Check if booking would exceed capacity
      const availableSeats = layoutConfig.seats.filter((s: any) => s.status === 'available').length;
      if (seatIds.length > availableSeats) {
        return res.status(400).json({
          success: false,
          message: 'Not enough seats available'
        });
      }

      // Update seat statuses
      layoutConfig.seats = layoutConfig.seats.map((seat: any) => {
        if (seatIds.includes(seat.id)) {
          return {
            ...seat,
            status: 'booked' as const,
            bookedBy: userId
          };
        }
        return seat;
      });

      // Apply updated layout back to targetDoc
      if (isBusinessEvent) {
        if (targetDoc.seatingLayout?.eventConfig) {
          targetDoc.seatingLayout.eventConfig = layoutConfig;
        } else {
          targetDoc.seatingLayout = layoutConfig;
        }
        targetDoc.markModified('seatingLayout');
        // Update totalBookings
        (targetDoc as any).totalBookings = ((targetDoc as any).totalBookings || 0) + seatIds.length;
      } else {
        (targetDoc as any).seatingLayout = layoutConfig;
        (targetDoc as any).registeredCount = ((targetDoc as any).registeredCount || 0) + seatIds.length;
      }

      await targetDoc.save();

      // Emit real-time update via Socket.IO AFTER saving
      const io = req.app.get('io');
      if (io) {
        const newCount = isBusinessEvent ? (targetDoc as any).totalBookings : (targetDoc as any).registeredCount;
        io.to(`event-${id}`).emit('seatsBooked', {
          eventId: id,
          seatIds,
          userId,
          registeredCount: newCount,
          capacity: targetDoc.capacity || 100,
          availableSeats: layoutConfig.seats.filter((s: any) => s.status === 'available').length,
          startDate: targetDoc.startDate,
          endDate: targetDoc.endDate
        });
        console.log(`Emitted seatsBooked event for event ${id}, seats: ${seatIds.join(', ')}`);
      }
    } else {
      // For events without seating, check capacity
      const spotsRequested = guests || 1;
      const currentCount = isBusinessEvent ? ((targetDoc as any).totalBookings || 0) : ((targetDoc as any).registeredCount || 0);
      const capacity = targetDoc.capacity || 100;
      const spotsAvailable = capacity - currentCount;

      if (spotsRequested > spotsAvailable) {
        return res.status(400).json({
          success: false,
          message: `Only ${spotsAvailable} spot(s) available, but ${spotsRequested} requested`
        });
      }

      // Increment the count
      if (isBusinessEvent) {
        (targetDoc as any).totalBookings = currentCount + spotsRequested;
      } else {
        (targetDoc as any).registeredCount = currentCount + spotsRequested;
      }

      await targetDoc.save();

      // Emit real-time update via Socket.IO AFTER saving
      const io = req.app.get('io');
      if (io) {
        const newCount = isBusinessEvent ? (targetDoc as any).totalBookings : (targetDoc as any).registeredCount;
        io.to(`event-${id}`).emit('eventRegistered', {
          eventId: id,
          guests: spotsRequested,
          registeredCount: newCount,
          capacity: capacity,
          spotsLeft: capacity - newCount,
          startDate: targetDoc.startDate,
          endDate: targetDoc.endDate
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