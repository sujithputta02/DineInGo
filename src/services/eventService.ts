import Event from '../models/Event';

export const createEvent = async (eventData: any) => {
  try {
    const event = new Event(eventData);
    await event.save();
    return event;
  } catch (error) {
    throw error;
  }
};

export const getAllEvents = async () => {
  try {
    const events = await Event.find();
    return events;
  } catch (error) {
    throw error;
  }
};

export const getEventById = async (id: string) => {
  try {
    const event = await Event.findById(id);
    return event;
  } catch (error) {
    throw error;
  }
};

export const searchEvents = async (searchTerm: string) => {
  try {
    const events = await Event.find({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { category: { $regex: searchTerm, $options: 'i' } },
        { 'location.city': { $regex: searchTerm, $options: 'i' } },
        { 'location.state': { $regex: searchTerm, $options: 'i' } }
      ]
    });
    return events;
  } catch (error) {
    throw error;
  }
};

export const updateEvent = async (id: string, updateData: any) => {
  try {
    const event = await Event.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
    return event;
  } catch (error) {
    throw error;
  }
};

export const registerForEvent = async (id: string) => {
  try {
    const event = await Event.findById(id);
    if (!event) {
      throw new Error('Event not found');
    }
    if (event.registeredCount >= event.capacity) {
      throw new Error('Event is full');
    }
    event.registeredCount += 1;
    await event.save();
    return event;
  } catch (error) {
    throw error;
  }
}; 