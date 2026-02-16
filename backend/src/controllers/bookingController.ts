import { Request, Response } from 'express';
import { Booking } from '../models/Booking';
import { Event } from '../models/Event';
import { UserStats } from '../models/UserStats';
import { Restaurant } from '../models/Restaurant';
import { TableBooking } from '../models/TableBooking';
import nodemailer from 'nodemailer';
import { generateBothWalletPasses } from '../utils/walletPassGenerator';
import mongoose from 'mongoose';
import { emailService } from '../services/emailService';


// Dynamically import pdfkit if available
let PDFDocument: any;
try {
  PDFDocument = require('pdfkit');
} catch (e) {
  console.warn('pdfkit not installed, PDF generation will be disabled');
}

// Update achievements after booking
const updateAchievementsAfterBooking = async (booking: any) => {
  try {
    const userId = booking.userId;
    if (!userId) return;

    // Get or create user stats
    let userStats = await UserStats.findOne({ userId });
    if (!userStats) {
      userStats = new UserStats({
        userId,
        cuisinesTried: [],
        localRestaurantsVisited: [],
        sustainableChoices: 0,
        friendsReferred: [],
        totalBookings: 0,
        totalEvents: 0,
        totalPoints: 0
      });
    }

    // Update booking count
    userStats.totalBookings += 1;

    // If it's a restaurant booking, track cuisine and local restaurant
    if (booking.restaurantId) {
      try {
        const restaurant = await Restaurant.findById(booking.restaurantId);
        if (restaurant) {
          // Track cuisines
          if (restaurant.cuisine && Array.isArray(restaurant.cuisine)) {
            restaurant.cuisine.forEach((cuisine: string) => {
              if (!userStats!.cuisinesTried.includes(cuisine)) {
                userStats!.cuisinesTried.push(cuisine);
              }
            });
          }

          // Track local restaurant visit
          const restaurantId = restaurant._id.toString();
          if (!userStats.localRestaurantsVisited.includes(restaurantId)) {
            userStats.localRestaurantsVisited.push(restaurantId);
          }

          // Track sustainable choice if restaurant has good sustainability score
          if (restaurant.sustainability && restaurant.sustainability.score > 7) {
            userStats.sustainableChoices += 1;
          }
        }
      } catch (error) {
        console.error('Error fetching restaurant for achievements:', error);
      }
    }

    // If it's an event booking, track event count
    if (booking.eventId) {
      userStats.totalEvents += 1;
    }

    await userStats.save();
    console.log('User stats updated for achievements:', userId);
  } catch (error) {
    console.error('Error updating achievements after booking:', error);
  }
};

// Generate invoice PDF as a Buffer
const generateInvoicePdfBuffer = (bookingData: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    if (!PDFDocument) {
      return reject(new Error('pdfkit not installed'));
    }
    const doc = new PDFDocument({ margin: 40 });
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
    doc.on('error', reject);

    // Header
    doc.fontSize(24).fillColor('#10b981').text('DineInGo Invoice', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#888').text('Reserve Dining & Events', { align: 'center' });
    doc.moveDown(1);

    // Invoice Info
    const invoiceId = bookingData._id || bookingData.id || Math.random().toString(36).substr(2, 8);
    const invoiceNumber = `INV-${invoiceId}-${new Date().getFullYear()}`;
    const invoiceDate = new Date().toLocaleDateString();
    doc.fontSize(12).fillColor('#000').text(`Invoice #: ${invoiceNumber}`);
    doc.text(`Date: ${invoiceDate}`);
    doc.moveDown(1);

    // Bill To
    doc.fontSize(14).fillColor('#000').text('Bill To:', { underline: true });
    doc.fontSize(12).text(bookingData.fullName || 'Guest');
    doc.text(bookingData.email || 'N/A');
    doc.text(bookingData.phoneNumber || 'N/A');
    doc.moveDown(1);

    // Booking Details
    doc.fontSize(14).text('Booking Details:', { underline: true });
    doc.fontSize(12).text(`Restaurant: ${bookingData.restaurantName}`);
    doc.text(`Date & Time: ${bookingData.date} at ${bookingData.time}`);
    doc.text(`Guests: ${bookingData.guests}`);
    doc.text(`Table: ${bookingData.table || 'Not assigned'}`);
    if (bookingData.specialRequest) doc.text(`Special Request: ${bookingData.specialRequest}`);
    doc.moveDown(1);

    // Invoice Items Table
    doc.fontSize(14).text('Invoice Items:', { underline: true });
    doc.moveDown(0.5);
    const diningReservationPrice = Number(bookingData.guests) > 0 ? 25.99 : 0;
    let y = doc.y;
    doc.fontSize(12).text('Description', 40, y, { continued: true });
    doc.text('Qty', 220, y, { continued: true, align: 'right' });
    doc.text('Price', 280, y, { continued: true, align: 'right' });
    doc.text('Amount', 360, y, { align: 'right' });
    doc.moveDown(0.5);
    y = doc.y;
    if (diningReservationPrice > 0) {
      doc.text(`Dining Reservation - ${bookingData.restaurantName}`, 40, y, { continued: true });
      doc.text(`${bookingData.guests}`, 220, y, { continued: true, align: 'right' });
      doc.text(`₹${diningReservationPrice.toFixed(2)}`, 280, y, { continued: true, align: 'right' });
      doc.text(`₹${(diningReservationPrice * Number(bookingData.guests)).toFixed(2)}`, 360, y, { align: 'right' });
      doc.moveDown(0.5);
      y = doc.y;
    }
    (bookingData.selectedItems || []).forEach((item: any) => {
      doc.text(item.name, 40, y, { continued: true });
      doc.text(`${item.quantity}`, 220, y, { continued: true, align: 'right' });
      doc.text(`₹${item.price.toFixed(2)}`, 280, y, { continued: true, align: 'right' });
      doc.text(`₹${(item.price * item.quantity).toFixed(2)}`, 360, y, { align: 'right' });
      doc.moveDown(0.5);
      y = doc.y;
    });
    if (bookingData.occasion) {
      doc.text(`Special Occasion - ${bookingData.occasion}`, 40, y, { continued: true });
      doc.text('1', 220, y, { continued: true, align: 'right' });
      doc.text('₹0.00', 280, y, { continued: true, align: 'right' });
      doc.text('₹0.00', 360, y, { align: 'right' });
      doc.moveDown(0.5);
      y = doc.y;
    }
    doc.moveDown(1);

    // Totals
    const itemsTotal = (bookingData.selectedItems || []).reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const subtotal = diningReservationPrice + itemsTotal;
    const tax = subtotal * 0.18;
    const total = subtotal + tax;
    doc.fontSize(12).text(`Subtotal: ₹${subtotal.toFixed(2)}`, { align: 'right' });
    doc.text(`Tax (18%): ₹${tax.toFixed(2)}`, { align: 'right' });
    doc.font('Helvetica-Bold').text(`Total: ₹${total.toFixed(2)}`, { align: 'right' });
    doc.font('Helvetica');
    doc.moveDown(1);

    // Status
    doc.fontSize(12).fillColor('#065f46').text(`Status: ${bookingData.status}`, { align: 'center' });
    doc.moveDown(1);

    // Footer
    doc.fontSize(10).fillColor('#888').text('Thank you for choosing DineInGo!', { align: 'center' });
    doc.text('For any questions regarding this invoice, please contact support@dineingo.com', { align: 'center' });

    doc.end();
  });
};

// Send invoice PDF email
const sendInvoicePdfEmail = async (bookingData: any) => {
  if (!bookingData.email) return;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email credentials not configured for invoice PDF email');
    return;
  }
  if (!PDFDocument) {
    console.warn('Skipping PDF invoice generation - pdfkit not installed');
    return;
  }
  const pdfBuffer = await generateInvoicePdfBuffer(bookingData);
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  const bookingName = getBookingDisplayName(bookingData);

  // Generate wallet passes
  let walletAttachments: { filename: string; content: Buffer; contentType: string }[] = [];
  try {
    const passes = await generateBothWalletPasses(bookingData);
    walletAttachments = [passes.apple, passes.google];
    console.log('Wallet passes generated successfully for email');
  } catch (err) {
    console.warn('Failed to generate wallet passes for email:', err);
  }

  await transporter.sendMail({
    from: `"DineInGo" <${process.env.EMAIL_USER}>`,
    to: bookingData.email,
    subject: `Your DineInGo Invoice (PDF) - ${bookingName}`,
    text: `Please find your invoice attached as a PDF for ${bookingName}. Thank you for choosing DineInGo!`,
    attachments: [
      {
        filename: 'DineInGo_Invoice.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
      ...walletAttachments
    ],
  });
  console.log('Invoice PDF email sent to:', bookingData.email);
};

// Helper function to get booking display name
const getBookingDisplayName = (booking: any) => {
  return (
    booking.restaurantName ||
    booking.eventName ||
    (booking.restaurantId && booking.restaurantId.name) ||
    (booking.eventId && booking.eventId.title) ||
    'your reservation'
  );
};

// Create a new booking
export const createBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('Creating booking with data:', req.body);

    // Validate required fields
    if (!req.body.userId) {
      res.status(400).json({ message: 'User ID is required' });
      return;
    }

    if (!req.body.date) {
      res.status(400).json({ message: 'Date is required' });
      return;
    }

    if (!req.body.time) {
      res.status(400).json({ message: 'Time is required' });
      return;
    }

    if (!req.body.guests || req.body.guests < 1) {
      res.status(400).json({ message: 'Number of guests is required and must be at least 1' });
      return;
    }

    // Ensure at least one of restaurantId or eventId is provided
    if (!req.body.restaurantId && !req.body.eventId) {
      res.status(400).json({ message: 'Either restaurant ID or event ID is required' });
      return;
    }

    // Convert restaurantId and eventId to ObjectId if they are valid, otherwise keep as string
    const bookingData: any = {
      ...req.body,
      restaurantName: req.body.restaurantName,
      eventName: req.body.eventName,
      selectedItems: req.body.selectedItems,
      totalAmount: req.body.totalAmount,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Try to convert to ObjectId if it looks like one (24 hex characters)
    if (bookingData.restaurantId && typeof bookingData.restaurantId === 'string') {
      if (/^[0-9a-fA-F]{24}$/.test(bookingData.restaurantId)) {
        try {
          bookingData.restaurantId = new mongoose.Types.ObjectId(bookingData.restaurantId);
        } catch (e) {
          console.log('Could not convert restaurantId to ObjectId, keeping as string');
        }
      }
    }

    if (bookingData.eventId && typeof bookingData.eventId === 'string') {
      if (/^[0-9a-fA-F]{24}$/.test(bookingData.eventId)) {
        try {
          bookingData.eventId = new mongoose.Types.ObjectId(bookingData.eventId);

          // EVENT TICKET VALIDATION & INVENTORY UPDATE
          if (bookingData.selectedTickets && bookingData.selectedTickets.length > 0) {
            const event = await Event.findById(bookingData.eventId);
            if (!event) {
              res.status(404).json({ message: 'Event not found' });
              return;
            }

            // Validate and update tickets
            for (const selectedTicket of bookingData.selectedTickets) {
              const ticket = event.tickets?.find(t => t._id?.toString() === selectedTicket.ticketId);
              if (!ticket) {
                res.status(400).json({ message: `Ticket type not found: ${selectedTicket.name}` });
                return;
              }

              if (ticket.quantity - ticket.sold < selectedTicket.quantity) {
                res.status(400).json({ message: `Not enough tickets available for: ${ticket.name}` });
                return;
              }

              // Update sold count (in memory, will save later)
              ticket.sold += selectedTicket.quantity;
              if (ticket.sold >= ticket.quantity) {
                ticket.status = 'sold_out';
              }
            }

            // Update event registered count
            const totalTickets = bookingData.selectedTickets.reduce((sum: number, t: any) => sum + t.quantity, 0);
            event.registeredCount += totalTickets;

            // Save the event with updated inventory
            await event.save();
            console.log('Event inventory updated for booking');
          }

        } catch (e) {
          console.log('Error processing event tickets:', e);
          res.status(500).json({ message: 'Error processing event tickets' });
          return;
        }
      }
    }

    // Generate ID manually to link objects
    const bookingId = new mongoose.Types.ObjectId();
    bookingData._id = bookingId;

    // Handle Pre-order creation if items are selected
    if (bookingData.selectedItems && bookingData.selectedItems.length > 0 && bookingData.restaurantId) {
      try {
        const { PreOrder } = require('../models/PreOrder');

        // Calculate totals
        const items = bookingData.selectedItems.map((item: any) => ({
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          specialRequests: ''
        }));

        const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.05; // 5% tax assumption
        const total = subtotal + tax;

        const preOrder = new PreOrder({
          bookingId: bookingId.toString(),
          businessId: bookingData.restaurantId.toString(),
          customerId: bookingData.userId,
          items: items,
          subtotal: subtotal,
          tax: tax,
          total: total,
          status: 'pending'
        });

        await preOrder.save();
        console.log('Pre-order created successfully:', preOrder._id);

        bookingData.hasPreOrder = true;
        bookingData.preOrderId = preOrder._id.toString();

      } catch (err) {
        console.error('Error creating pre-order:', err);
        // Continue with booking creation even if pre-order fails, but log error
      }
    }

    const booking = new Booking(bookingData);

    await booking.save();
    console.log('Booking saved successfully:', booking._id);

    // Update achievements after successful booking
    try {
      await updateAchievementsAfterBooking(booking);
    } catch (achievementError) {
      console.error('Error updating achievements:', achievementError);
      // Don't fail the booking if achievement update fails
    }

    // Only populate if the IDs are ObjectIds
    try {
      if (booking.restaurantId && mongoose.Types.ObjectId.isValid(booking.restaurantId as any)) {
        await booking.populate('restaurantId');
      }
      if (booking.eventId && mongoose.Types.ObjectId.isValid(booking.eventId as any)) {
        await booking.populate('eventId');
      }
    } catch (populateError) {
      console.log('Could not populate references, continuing without population');
    }

    // Check if this is an event booking
    const isEventBooking = !!(booking.eventId || req.body.eventId);

    if (isEventBooking) {
      // Send event-specific confirmation email with event pass
      try {
        const { sendEventConfirmationEmail } = require('../services/eventEmailService');
        await sendEventConfirmationEmail({
          ...booking.toObject(),
          ...req.body
        });
        console.log('Event confirmation email sent successfully');
      } catch (emailError) {
        console.error('Error sending event confirmation email:', emailError);
        // Don't fail the booking creation if email fails
      }
    } else {
      // Send restaurant reservation confirmation email
      try {
        await emailService.sendReservationConfirmationEmail({
          ...req.body,
          restaurantName: booking.restaurantName || req.body.restaurantName,
          address: (booking.restaurantId as any)?.address || req.body.address
        });

      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Don't fail the booking creation if email fails
      }


      // Send invoice PDF email for restaurants
      try {
        await sendInvoicePdfEmail(booking);
      } catch (invoiceError) {
        console.error('Error sending invoice PDF email:', invoiceError);
      }
    }

    res.status(201).json(booking);
  } catch (error: any) {
    console.error('Error creating booking:', error);

    // Provide more specific error messages
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({
        message: 'Validation error',
        errors: validationErrors
      });
      return;
    }

    if (error.name === 'CastError') {
      res.status(400).json({
        message: 'Invalid ID format',
        field: error.path
      });
      return;
    }

    res.status(500).json({
      message: 'Error creating booking',
      error: error.message
    });
  }
};



// Get all bookings for a user
export const getUserBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;
    const bookings = await Booking.find({ userId })
      .sort({ date: 1, time: 1 });

    // Manually populate only valid ObjectIds
    const populatedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const bookingObj = booking.toObject();

        // Try to populate restaurantId if it's a valid ObjectId
        if (bookingObj.restaurantId && mongoose.Types.ObjectId.isValid(bookingObj.restaurantId as any)) {
          try {
            const populated = await booking.populate({ path: 'restaurantId', select: 'name image' });
            bookingObj.restaurantId = populated.restaurantId;
          } catch (e) {
            console.log('Could not populate restaurantId');
          }
        }

        // Try to populate eventId if it's a valid ObjectId
        if (bookingObj.eventId && mongoose.Types.ObjectId.isValid(bookingObj.eventId as any)) {
          try {
            const populated = await booking.populate({ path: 'eventId', select: 'name image' });
            bookingObj.eventId = populated.eventId;
          } catch (e) {
            console.log('Could not populate eventId');
          }
        }

        return bookingObj;
      })
    );

    res.json(populatedBookings);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
};

// Get a specific booking
export const getBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    // Try to populate, but handle errors gracefully
    try {
      if (booking.restaurantId && mongoose.Types.ObjectId.isValid(String(booking.restaurantId))) {
        await booking.populate('restaurantId');
      }
      if (booking.eventId && mongoose.Types.ObjectId.isValid(String(booking.eventId))) {
        await booking.populate('eventId');
      }
    } catch (populateError) {
      console.warn('Could not populate booking references:', populateError);
    }

    res.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ message: 'Error fetching booking' });
  }
};

// Update a booking
export const updateBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    // Try to populate, but handle errors gracefully
    try {
      if (booking.restaurantId && mongoose.Types.ObjectId.isValid(String(booking.restaurantId))) {
        await booking.populate('restaurantId');
      }
      if (booking.eventId && mongoose.Types.ObjectId.isValid(String(booking.eventId))) {
        await booking.populate('eventId');
      }
    } catch (populateError) {
      console.warn('Could not populate booking references:', populateError);
    }

    res.json(booking);
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ message: 'Error updating booking' });
  }
};

// Cancel a booking
export const cancelBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    // First, update the booking without populate to avoid casting errors
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', updatedAt: new Date() },
      { new: true }
    );

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    // Try to populate, but handle errors gracefully
    try {
      // Only populate if the IDs are valid ObjectIds
      if (booking.restaurantId && mongoose.Types.ObjectId.isValid(String(booking.restaurantId))) {
        await booking.populate('restaurantId');
      }
      if (booking.eventId && mongoose.Types.ObjectId.isValid(String(booking.eventId))) {
        await booking.populate('eventId');
      }
    } catch (populateError) {
      console.warn('Could not populate booking references:', populateError);
      // Continue without populated data
    }

    // If this is a restaurant booking with a table, unblock the table
    if (booking.restaurantId && booking.table && booking.date && booking.time) {
      try {
        let restaurantId: string;
        if (typeof booking.restaurantId === 'object' && booking.restaurantId !== null && '_id' in booking.restaurantId) {
          restaurantId = String((booking.restaurantId as any)._id);
        } else {
          restaurantId = String(booking.restaurantId);
        }

        const dateStr = booking.date instanceof Date ? booking.date.toISOString().slice(0, 10) : booking.date;

        console.log('Cancelling table booking:', {
          restaurantId,
          tableId: booking.table,
          date: dateStr,
          time: booking.time,
          userId: booking.userId
        });

        // Update TableBooking collection to cancel the table reservation
        const tableBooking = await TableBooking.findOneAndUpdate(
          {
            restaurantId,
            tableId: booking.table,
            date: dateStr,
            time: booking.time,
            userId: booking.userId,
            status: { $in: ['reserved', 'confirmed', 'blocked'] }
          },
          {
            status: 'cancelled',
            cancelledAt: new Date(),
            blockedUntil: undefined
          },
          { new: true }
        );

        if (tableBooking) {
          console.log('Successfully cancelled table booking:', tableBooking._id);

          // Emit Socket.IO event for real-time updates
          const io = require('../utils/socket').getIO();
          if (io) {
            io.to(restaurantId).emit('tableCancelled', {
              restaurantId,
              tableId: booking.table,
              date: dateStr,
              time: booking.time,
              userId: booking.userId,
              status: 'cancelled',
              booking: tableBooking
            });
            console.log(`Emitted tableCancelled event for table ${booking.table} at restaurant ${restaurantId}`);
          }
        } else {
          console.log('No table booking found to cancel - may have been already cancelled or not exist');
        }
      } catch (tableError) {
        console.error('Error cancelling table booking:', tableError);
        // Don't fail the main booking cancellation if table cancellation fails
      }
    }

    // If this is an event booking with seats, unblock the seats
    if (booking.eventId && booking.selectedSeats && booking.selectedSeats.length > 0) {
      try {
        const { Event } = require('../models/Event');
        let eventId: string;
        if (typeof booking.eventId === 'object' && booking.eventId !== null && '_id' in booking.eventId) {
          eventId = String((booking.eventId as any)._id);
        } else {
          eventId = String(booking.eventId);
        }

        const event = await Event.findById(eventId);
        if (event && event.hasSeating && event.seatingLayout) {
          // Unblock the seats - set them back to available
          event.seatingLayout.seats = event.seatingLayout.seats.map((seat: any) => {
            if (booking.selectedSeats!.includes(seat.id) && seat.bookedBy === booking.userId) {
              return {
                ...seat,
                status: 'available',
                bookedBy: undefined
              };
            }
            return seat;
          });

          // Decrease registered count
          event.registeredCount = Math.max(0, event.registeredCount - booking.selectedSeats!.length);

          await event.save();

          // Emit Socket.IO event for real-time updates
          const io = require('../utils/socket').getIO();
          if (io) {
            io.to(`event-${eventId}`).emit('seatsCancelled', {
              eventId,
              seatIds: booking.selectedSeats,
              userId: booking.userId,
              registeredCount: event.registeredCount,
              capacity: event.capacity,
              availableSeats: event.seatingLayout.seats.filter((s: any) => s.status === 'available').length
            });
            console.log(`Emitted seatsCancelled event for event ${eventId}, seats: ${booking.selectedSeats!.join(', ')}`);
          }
        }
      } catch (eventError) {
        console.error('Error unblocking event seats:', eventError);
        // Don't fail the cancellation if seat unblocking fails
      }
    }

    // If this is an event booking without seats, decrease the count
    if (booking.eventId && (!booking.selectedSeats || booking.selectedSeats.length === 0)) {
      try {
        const { Event } = require('../models/Event');
        let eventId: string;
        if (typeof booking.eventId === 'object' && booking.eventId !== null && '_id' in booking.eventId) {
          eventId = String((booking.eventId as any)._id);
        } else {
          eventId = String(booking.eventId);
        }

        const event = await Event.findById(eventId);
        if (event) {
          event.registeredCount = Math.max(0, event.registeredCount - (booking.guests || 1));
          await event.save();

          // Emit Socket.IO event
          const io = require('../utils/socket').getIO();
          if (io) {
            io.to(`event-${eventId}`).emit('eventCancelled', {
              eventId,
              guests: booking.guests || 1,
              registeredCount: event.registeredCount,
              capacity: event.capacity,
              spotsLeft: event.capacity - event.registeredCount
            });
            console.log(`Emitted eventCancelled event for event ${eventId}`);
          }
        }
      } catch (eventError) {
        console.error('Error updating event count:', eventError);
        // Don't fail the cancellation if event count update fails
      }
    }

    // Send cancellation email
    try {
      const { sendCancellationEmail } = require('../services/eventEmailService');
      const isEvent = !!(booking.eventId || booking.eventName);

      // Prepare email data
      const emailData = {
        _id: booking._id,
        id: booking._id,
        userId: booking.userId,
        eventId: booking.eventId,
        restaurantId: booking.restaurantId,
        eventName: booking.eventName || (booking.eventId && typeof booking.eventId === 'object' && 'name' in booking.eventId ? booking.eventId.name : undefined),
        restaurantName: booking.restaurantName || (booking.restaurantId && typeof booking.restaurantId === 'object' && 'name' in booking.restaurantId ? booking.restaurantId.name : undefined),
        date: booking.date instanceof Date ? booking.date.toISOString().slice(0, 10) : booking.date,
        time: booking.time,
        guests: booking.guests || booking.seats || 1,
        selectedSeats: booking.selectedSeats || booking.seatNumbers || [],
        totalAmount: booking.totalAmount || booking.amount,
        fullName: booking.customerName || booking.fullName,
        email: booking.customerEmail || booking.email,
        phoneNumber: booking.customerPhone || booking.phoneNumber,
        specialRequest: booking.specialRequests || booking.specialRequest,
        status: 'cancelled'
      };

      // Only send email if we have an email address
      if (emailData.email) {
        await sendCancellationEmail(emailData, isEvent);
        console.log('Cancellation email sent successfully to:', emailData.email);
      } else {
        console.warn('No email address found for booking cancellation:', booking._id);
      }
    } catch (emailError) {
      console.error('Error sending cancellation email:', emailError);
      // Don't fail the cancellation if email fails
    }

    res.json(booking);
  } catch (error) {
    console.error('=== ERROR CANCELLING BOOKING ===');
    console.error('Error type:', error instanceof Error ? error.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Full error:', error);
    res.status(500).json({
      message: 'Error cancelling booking',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get bookings for a specific business
export const getBusinessBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: businessId } = req.params;
    const { status, date, limit = 50 } = req.query;

    // Robust query to match businessId OR legacy fields
    const query: any = {
      $or: [
        { businessId },
        { restaurantId: businessId },
        { eventId: businessId }
      ]
    };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (date) {
      query.date = {
        $gte: new Date(date as string),
        $lt: new Date(new Date(date as string).getTime() + 24 * 60 * 60 * 1000)
      };
    }

    const bookings = await Booking.find(query)
      .sort({ date: -1, time: -1 })
      .limit(parseInt(limit as string))
      .lean();

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching business bookings:', error);
    res.status(500).json({ message: 'Error fetching business bookings' });
  }
};

// Get booking analytics for a business
export const getBookingAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: businessId } = req.params;
    const { period = '30d' } = req.query;

    let dateFilter: Date;
    switch (period) {
      case '7d':
        dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        dateFilter = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const analytics = await Booking.aggregate([
      {
        $match: {
          $or: [
            { businessId },
            { restaurantId: businessId },
            { eventId: businessId }
          ],
          createdAt: { $gte: dateFilter }
        }
      },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$amount' },
          confirmedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          averageBookingValue: { $avg: '$amount' },
          totalSeats: { $sum: '$seats' }
        }
      }
    ]);

    const result = analytics[0] || {
      totalBookings: 0,
      totalRevenue: 0,
      confirmedBookings: 0,
      cancelledBookings: 0,
      averageBookingValue: 0,
      totalSeats: 0
    };

    // Calculate utilization rate (this would need capacity from business model)
    result.utilizationRate = result.totalBookings > 0 ?
      Math.round((result.confirmedBookings / result.totalBookings) * 100) : 0;

    res.json(result);
  } catch (error) {
    console.error('Error fetching booking analytics:', error);
    res.status(500).json({ message: 'Error fetching booking analytics' });
  }
};

// Confirm a booking
export const confirmBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'confirmed', updatedAt: new Date() },
      { new: true }
    );

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    // Try to populate, but handle errors gracefully
    try {
      if (booking.restaurantId && mongoose.Types.ObjectId.isValid(String(booking.restaurantId))) {
        await booking.populate('restaurantId');
      }
      if (booking.eventId && mongoose.Types.ObjectId.isValid(String(booking.eventId))) {
        await booking.populate('eventId');
      }
    } catch (populateError) {
      console.warn('Could not populate booking references:', populateError);
    }
    // Emit real-time update for table availability
    if (booking.restaurantId && booking.date && booking.time) {
      let restaurantId: string;
      if (typeof booking.restaurantId === 'object' && booking.restaurantId !== null && '_id' in booking.restaurantId) {
        restaurantId = String((booking.restaurantId as any)._id);
      } else {
        restaurantId = String(booking.restaurantId);
      }
      const date = booking.date instanceof Date ? booking.date.toISOString().slice(0, 10) : booking.date;
      const time = booking.time;
      const tableId = booking.table;

      // Emit socket event for real-time updates
      try {
        require('../utils/socket').getIO().to(restaurantId).emit('bookingUpdated', {
          restaurantId,
          date,
          time,
          tableId,
          userId: booking.userId
        });
      } catch (socketError) {
        console.warn('Could not emit socket event:', socketError);
      }

      // Send email notification if email is available
      try {
        if (booking.email) {
          // Prepare booking data for email
          const isEvent = !!(booking.eventId || booking.eventName);
          const emailData = {
            _id: booking._id,
            id: booking._id,
            userId: booking.userId,
            eventId: booking.eventId,
            restaurantId: booking.restaurantId,
            eventName: booking.eventName || (booking.eventId && typeof booking.eventId === 'object' ? (booking.eventId as any).title : undefined),
            restaurantName: booking.restaurantName || (booking.restaurantId && typeof booking.restaurantId === 'object' ? (booking.restaurantId as any).name : undefined),
            date: booking.date instanceof Date ? booking.date.toISOString().slice(0, 10) : booking.date,
            time: booking.time,
            guests: booking.seats || 1, // Map seats to guests for email template
            selectedSeats: booking.seatNumbers || [],
            totalAmount: booking.amount,
            fullName: booking.customerName,
            email: booking.customerEmail,
            phoneNumber: booking.customerPhone,
            specialRequest: booking.specialRequests,
            status: booking.status
          };

          // Import and send email
          const { sendEventConfirmationEmail } = await import('../services/eventEmailService');
          await sendEventConfirmationEmail(emailData);
        }
      } catch (emailError) {
        console.warn('Could not send confirmation email:', emailError);
      }
    }

    res.json(booking);
  } catch (error) {
    console.error('Error confirming booking:', error);
    res.status(500).json({
      message: 'Error confirming booking',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete a booking
export const deleteBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }
    res.json({ message: 'Booking deleted successfully' });
  } catch (error) {
    console.error('Error deleting booking:', error);
    res.status(500).json({ message: 'Error deleting booking' });
  }
}; 