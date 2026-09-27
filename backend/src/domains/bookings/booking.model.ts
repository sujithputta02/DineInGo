import mongoose from 'mongoose';
import { Booking as OriginalBooking, IBooking } from '../../models/Booking';
import { TableBooking as OriginalTableBooking, ITableBooking } from '../../models/TableBooking';

/**
 * Domain Model for Bookings
 * Re-exports the Mongoose models with type safety.
 * Uses existing model compilation fallback to prevent OverwriteModelError.
 */
export const Booking = (mongoose.models.Booking || OriginalBooking) as typeof OriginalBooking;
export const TableBooking = (mongoose.models.TableBooking || OriginalTableBooking) as typeof OriginalTableBooking;

export { IBooking, ITableBooking };
export default Booking;
