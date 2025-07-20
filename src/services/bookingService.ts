import Booking from '../models/Booking';

export const createBooking = async (bookingData: any) => {
  try {
    const booking = new Booking(bookingData);
    await booking.save();
    return booking;
  } catch (error) {
    throw error;
  }
};

export const getBookingsByUserId = async (userId: string) => {
  try {
    const bookings = await Booking.find({ userId });
    return bookings;
  } catch (error) {
    throw error;
  }
};

export const getBookingById = async (id: string) => {
  try {
    const booking = await Booking.findById(id);
    return booking;
  } catch (error) {
    throw error;
  }
};

export const updateBookingStatus = async (id: string, status: 'pending' | 'confirmed' | 'cancelled') => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      id,
      { status, updatedAt: new Date() },
      { new: true }
    );
    return booking;
  } catch (error) {
    throw error;
  }
};

export const getBookingsByRestaurantId = async (restaurantId: string) => {
  try {
    const bookings = await Booking.find({ restaurantId });
    return bookings;
  } catch (error) {
    throw error;
  }
};

export const getBookingsByDate = async (date: Date) => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
    return bookings;
  } catch (error) {
    throw error;
  }
}; 