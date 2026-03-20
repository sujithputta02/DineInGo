import { Request, Response } from 'express';
import { Booking } from '../models/Booking';
import { Event } from '../models/Event';
import { UserStats } from '../models/UserStats';
import { Restaurant } from '../models/Restaurant';
import { TableBooking } from '../models/TableBooking';
import { generateBothWalletPasses } from '../utils/walletPassGenerator';
import mongoose from 'mongoose';
import { emailService } from '../services/emailService';
import path from 'path';
import fs from 'fs';


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
const generateInvoicePdfBuffer = async (bookingData: any): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      const QRCode = await import('qrcode');
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);

      // --- BRANDING & HEADER ---
      // Styled Header Bar
      doc.rect(0, 0, 600, 80).fill('#10b981');

      try {
        const logoPath = path.join(__dirname, '../assets/logo.png');
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 40, 15, { height: 50 });

          doc.fillColor('#ffffff')
            .fontSize(10)
            .font('Helvetica')
            .text('RESERVE • DINE • EXPERIENCE', 130, 45);
        } else {
          doc.fillColor('#ffffff')
            .fontSize(28)
            .font('Helvetica-Bold')
            .text('DINEINGO', 40, 25);

          doc.fontSize(10)
            .font('Helvetica')
            .text('RESERVE • DINE • EXPERIENCE', 40, 55);
        }
      } catch (logoError) {
        console.error('Error embedding logo in PDF:', logoError);
        doc.fillColor('#ffffff')
          .fontSize(28)
          .font('Helvetica-Bold')
          .text('DINEINGO', 40, 25);

        doc.fontSize(10)
          .font('Helvetica')
          .text('RESERVE • DINE • EXPERIENCE', 40, 55);
      }

      doc.fillColor('#ffffff')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('INVOICE', 450, 35, { align: 'right' });

      doc.moveDown(4);

      // --- INVOICE INFO SECTION ---
      const invoiceId = bookingData._id || bookingData.id || Math.random().toString(36).substr(2, 8);
      const invoiceNumber = `INV-${String(invoiceId).slice(-6).toUpperCase()}-${new Date().getFullYear()}`;
      const status = (bookingData.status || 'Confirmed').toUpperCase();

      doc.fillColor('#1f2937').fontSize(10).font('Helvetica-Bold').text('INVOICE TO:', 40, 110);
      doc.font('Helvetica').text(bookingData.fullName || 'Valued Guest');
      doc.text(bookingData.email || '');
      doc.text(bookingData.phoneNumber || '');

      doc.font('Helvetica-Bold').text('INVOICE DETAILS:', 400, 110, { align: 'left' });
      doc.font('Helvetica').text(`Invoice #: ${invoiceNumber}`, 400, 122);
      doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 400, 134);
      doc.fillColor(status === 'CANCELLED' ? '#ef4444' : '#10b981')
        .font('Helvetica-Bold')
        .text(`Status: ${status}`, 400, 146);

      doc.moveDown(3);

      // --- BOOKING SUMMARY BOX ---
      const summaryY = 180;
      doc.rect(40, summaryY, 515, 70).fill('#f9fafb');
      doc.rect(40, summaryY, 5, 70).fill('#10b981'); // Left accent border

      doc.fillColor('#111827').fontSize(11).font('Helvetica-Bold').text('RESERVATION SUMMARY', 60, summaryY + 15);
      doc.fontSize(10).font('Helvetica').text(`${bookingData.restaurantName || bookingData.eventName}`, 60, summaryY + 35);
      doc.text(`${bookingData.date}  |  ${bookingData.time}`, 60, summaryY + 50);

      doc.font('Helvetica-Bold').text('GUESTS', 450, summaryY + 15);
      doc.fontSize(18).fillColor('#10b981').text(`${bookingData.guests}`, 450, summaryY + 30);

      doc.moveDown(5);

      // --- ITEMS TABLE ---
      const tableTop = 280;
      doc.fillColor('#374151').fontSize(10).font('Helvetica-Bold');
      doc.text('DESCRIPTION', 40, tableTop);
      doc.text('QTY', 300, tableTop, { width: 50, align: 'center' });
      doc.text('PRICE', 380, tableTop, { width: 70, align: 'right' });
      doc.text('TOTAL', 480, tableTop, { width: 75, align: 'right' });

      doc.moveTo(40, tableTop + 15).lineTo(555, tableTop + 15).strokeColor('#e5e7eb').stroke();

      let rowY = tableTop + 30;
      doc.font('Helvetica').fillColor('#4b5563');

      // Base Reservation Item
      const basePrice = bookingData.amount ? 0 : 25.00; // Mock base if no items
      if (basePrice > 0 || bookingData.amount) {
        doc.text(`Table Reservation - ${bookingData.restaurantName || 'Venue'}`, 40, rowY);
        doc.text('1', 300, rowY, { width: 50, align: 'center' });
        doc.text(`₹${(bookingData.amount || basePrice).toFixed(2)}`, 380, rowY, { width: 70, align: 'right' });
        doc.text(`₹${(bookingData.amount || basePrice).toFixed(2)}`, 480, rowY, { width: 75, align: 'right' });
        rowY += 25;
      }

      // Pre-ordered items
      (bookingData.selectedItems || []).forEach((item: any) => {
        doc.text(item.name, 40, rowY);
        doc.text(`${item.quantity}`, 300, rowY, { width: 50, align: 'center' });
        doc.text(`₹${Number(item.price).toFixed(2)}`, 380, rowY, { width: 70, align: 'right' });
        doc.text(`₹${(item.price * item.quantity).toFixed(2)}`, 480, rowY, { width: 75, align: 'right' });
        rowY += 25;
      });

      doc.moveTo(40, rowY + 5).lineTo(555, rowY + 5).strokeColor('#f3f4f6').stroke();

      // --- TOTALS ---
      const subtotal = bookingData.amount || (bookingData.selectedItems || []).reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
      const tax = subtotal * 0.05; // 5% GST
      const total = subtotal + tax;

      rowY += 20;
      doc.fontSize(10).font('Helvetica').fillColor('#6b7280').text('Subtotal', 380, rowY, { width: 70, align: 'right' });
      doc.fillColor('#111827').text(`₹${subtotal.toFixed(2)}`, 480, rowY, { width: 75, align: 'right' });

      rowY += 20;
      doc.fillColor('#6b7280').text('GST (5%)', 380, rowY, { width: 70, align: 'right' });
      doc.fillColor('#111827').text(`₹${tax.toFixed(2)}`, 480, rowY, { width: 75, align: 'right' });

      rowY += 25;
      doc.rect(370, rowY - 5, 185, 35).fill('#10b981');
      doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold').text('Total Amount', 380, rowY);
      doc.text(`₹${total.toFixed(2)}`, 480, rowY, { width: 75, align: 'right' });

      // --- QR CODE & FOOTER ---
      const footerY = 700;

      // Generate QR Code
      const qrData = JSON.stringify({
        id: invoiceId,
        booking: invoiceNumber,
        customer: bookingData.fullName,
        date: bookingData.date
      });
      const qrImage = await QRCode.toDataURL(qrData);
      doc.image(qrImage, 40, footerY - 50, { width: 80 });

      doc.fillColor('#9ca3af').fontSize(8).font('Helvetica');
      doc.text('SCAN TO VERIFY BOOKING', 40, footerY + 35);

      doc.fillColor('#374151').fontSize(10).font('Helvetica-Bold').text('Terms & Conditions', 150, footerY - 30);
      doc.font('Helvetica').fontSize(8).fillColor('#6b7280');
      doc.text('1. Please present this invoice at the reception upon arrival.', 150, footerY - 15);
      doc.text('2. Cancellations are subject to the restaurant\'s policy.', 150, footerY - 5);
      doc.text('3. This is a computer-generated invoice and doesn\'t require a signature.', 150, footerY + 5);

      doc.moveTo(0, 810).lineTo(600, 810).strokeColor('#10b981').lineWidth(3).stroke();

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
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
        const emailData = {
          ...booking.toObject(),
          ...req.body,
          email: booking.customerEmail || req.body.email || (booking as any).email,
          fullName: booking.customerName || req.body.fullName || (booking as any).fullName,
          guests: booking.seats || req.body.guests || (booking as any).guests
        };
        // Send event-specific confirmation email (non-blocking)
        sendEventConfirmationEmail(emailData).catch((emailError: any) => 
          console.error('Error sending event confirmation email:', emailError)
        );
      } catch (emailError) {
        console.error('Error sending event confirmation email:', emailError);
        // Don't fail the booking creation if email fails
      }
    } else {
      // Send restaurant reservation confirmation email with invoice and wallet passes
      try {
        // Generate Invoice PDF
        const pdfBuffer = await generateInvoicePdfBuffer(booking);

        // Generate Wallet Passes
        let walletAttachments: any[] = [];
        try {
          const { generateBothWalletPasses } = require('../utils/walletPassGenerator');
          const passes = await generateBothWalletPasses(booking);
          walletAttachments = [
            {
              filename: passes.apple.filename,
              content: passes.apple.content,
              contentType: passes.apple.contentType
            },
            {
              filename: passes.google.filename,
              content: passes.google.content,
              contentType: passes.google.contentType
            }
          ];
        } catch (walletError) {
          console.error('Error generating wallet passes for confirmation:', walletError);
        }

        // Send confirmation email with all attachments (non-blocking)
        emailService.sendReservationConfirmationEmail({
          ...req.body,
          ...booking.toObject(),
          email: booking.customerEmail || req.body.email || (booking as any).email,
          fullName: booking.customerName || req.body.fullName || (booking as any).fullName,
          guests: booking.seats || req.body.guests || (booking as any).guests,
          restaurantName: booking.restaurantName || req.body.restaurantName,
          address: (booking.restaurantId as any)?.address || req.body.address,
          attachments: [
            {
              filename: 'DineInGo_Invoice.pdf',
              content: pdfBuffer,
              contentType: 'application/pdf'
            },
            ...walletAttachments
          ]
        });
        console.log('Combined restaurant confirmation email sent successfully');
      } catch (emailError) {
        console.error('Error sending combined confirmation email:', emailError);
        // Don't fail the booking creation if email fails
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
    console.log('=== CANCEL BOOKING REQUEST ===');
    console.log('Booking ID:', req.params.id);

    // First, get the booking to extract table info BEFORE updating
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      console.log('Booking not found:', req.params.id);
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    console.log('Found booking to cancel:', {
      id: booking._id,
      restaurantId: booking.restaurantId,
      businessId: booking.businessId,
      table: booking.table,
      tableId: booking.tableId,
      tableNumber: booking.tableNumber,
      date: booking.date,
      time: booking.time,
      userId: booking.userId,
      status: booking.status
    });

    // Extract table identifier (try all possible fields)
    const tableIdentifier = booking.table || booking.tableId || booking.tableNumber;

    // Extract restaurant identifier (try all possible fields)
    let restaurantId: string | null = null;
    if (booking.restaurantId) {
      if (typeof booking.restaurantId === 'object' && booking.restaurantId !== null && '_id' in booking.restaurantId) {
        restaurantId = String((booking.restaurantId as any)._id);
      } else {
        restaurantId = String(booking.restaurantId);
      }
    } else if (booking.businessId && booking.businessType === 'restaurant') {
      restaurantId = booking.businessId;
    }

    console.log('Extracted identifiers:', {
      tableIdentifier,
      restaurantId,
      hasTable: !!tableIdentifier,
      hasRestaurant: !!restaurantId
    });

    // Now update the booking status
    booking.status = 'cancelled';
    booking.updatedAt = new Date();
    await booking.save();
    console.log('✓ Booking status updated to cancelled');

    // Try to populate for email purposes
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

    // If this is a restaurant booking with a table, unblock the table
    if (restaurantId && tableIdentifier && booking.date && booking.time) {
      try {
        const dateStr = booking.date instanceof Date ? booking.date.toISOString().slice(0, 10) : String(booking.date);

        console.log('Attempting to unblock table:', {
          restaurantId,
          tableId: tableIdentifier,
          date: dateStr,
          time: booking.time,
          userId: booking.userId
        });

        // Update TableBooking collection - try multiple strategies
        let tableBooking = null;

        // Strategy 1: Try with userId
        tableBooking = await TableBooking.findOneAndUpdate(
          {
            restaurantId,
            tableId: tableIdentifier,
            date: dateStr,
            time: booking.time,
            userId: booking.userId,
            status: { $in: ['reserved', 'confirmed', 'blocked'] }
          },
          {
            status: 'cancelled',
            cancelledAt: new Date(),
            $unset: { blockedUntil: "" }
          },
          { new: true }
        );

        // Strategy 2: Try without userId
        if (!tableBooking) {
          console.log('⚠ Strategy 1 failed, trying without userId...');
          tableBooking = await TableBooking.findOneAndUpdate(
            {
              restaurantId,
              tableId: tableIdentifier,
              date: dateStr,
              time: booking.time,
              status: { $in: ['reserved', 'confirmed', 'blocked'] }
            },
            {
              status: 'cancelled',
              cancelledAt: new Date(),
              $unset: { blockedUntil: "" }
            },
            { new: true }
          );
        }

        // Strategy 3: Try with any status (in case it's already cancelled but blockedUntil is set)
        if (!tableBooking) {
          console.log('⚠ Strategy 2 failed, trying with any status...');
          tableBooking = await TableBooking.findOneAndUpdate(
            {
              restaurantId,
              tableId: tableIdentifier,
              date: dateStr,
              time: booking.time
            },
            {
              status: 'cancelled',
              cancelledAt: new Date(),
              $unset: { blockedUntil: "" }
            },
            { new: true }
          );
        }

        if (tableBooking) {
          console.log('✓ Successfully cancelled table booking:', tableBooking._id);
        } else {
          console.log('⚠ No table booking found in TableBooking collection');
        }

        // ALWAYS update TableStatus regardless of TableBooking result
        try {
          const { TableStatus } = require('../models/TableStatus');
          const tableStatus = await TableStatus.findOneAndUpdate(
            {
              businessId: new mongoose.Types.ObjectId(restaurantId),
              tableId: tableIdentifier
            },
            {
              status: 'Ready',
              $unset: { currentBookingId: "" },
              lastStatusChange: new Date()
            },
            { new: true }
          );

          if (tableStatus) {
            console.log(`✓ Successfully reset table status for table ${tableIdentifier} to Ready`);
          } else {
            console.log(`⚠ No table status found for table ${tableIdentifier}`);
          }
        } catch (statusError) {
          console.error('✗ Error updating table status:', statusError);
        }

        // ALWAYS emit Socket.IO event for real-time updates
        const io = require('../utils/socket').getIO();
        if (io) {
          const eventData = {
            restaurantId,
            tableId: tableIdentifier,
            date: dateStr,
            time: booking.time,
            userId: booking.userId,
            status: 'cancelled',
            booking: tableBooking
          };

          io.to(restaurantId).emit('tableCancelled', eventData);
          console.log(`✓ Emitted tableCancelled event for table ${tableIdentifier} at restaurant ${restaurantId}`);
        } else {
          console.log('⚠ Socket.IO not available, cannot emit real-time event');
        }
      } catch (tableError) {
        console.error('✗ Error cancelling table booking:', tableError);
        // Don't fail the main booking cancellation if table cancellation fails
      }
    } else {
      console.log('⚠ Not a restaurant booking with table, skipping table cancellation', {
        hasRestaurantId: !!restaurantId,
        hasTableId: !!tableIdentifier,
        hasDate: !!booking.date,
        hasTime: !!booking.time
      });
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

        // Also try Business collection (events created via Business Portal)
        const { Business } = require('../models/Business');
        const businessEvent = !event ? await Business.findById(eventId) : null;
        const doc = event || businessEvent;
        const isBusinessDoc = !!businessEvent;

        if (doc) {
          const sl = isBusinessDoc
            ? (doc.seatingLayout?.eventConfig || doc.seatingLayout)
            : doc.seatingLayout;

          if (sl) {
            const areas = sl.concertAreas || sl.areas || [];
            const hasAreas = areas.length > 0;
            const isAreaCancellation = hasAreas && areas.some((area: any) => booking.selectedSeats!.includes(area.id));

            if (isAreaCancellation) {
              const selectedAreaId = booking.selectedSeats![0];
              const areaIndex = areas.findIndex((a: any) => a.id === selectedAreaId);

              if (areaIndex !== -1) {
                const area = areas[areaIndex];
                const guestsRefunding = booking.guests || 1;
                const newBooked = Math.max(0, (area.booked || 0) - guestsRefunding);

                if (isBusinessDoc) {
                  if (doc.seatingLayout?.eventConfig?.concertAreas) {
                    doc.seatingLayout.eventConfig.concertAreas[areaIndex].booked = newBooked;
                  } else if (doc.seatingLayout?.areas) {
                    doc.seatingLayout.areas[areaIndex].booked = newBooked;
                  }
                  doc.markModified('seatingLayout');
                } else {
                  doc.seatingLayout.areas[areaIndex].booked = newBooked;
                  doc.registeredCount = Math.max(0, doc.registeredCount - guestsRefunding);
                  doc.markModified('seatingLayout');
                }

                await doc.save();
                console.log('--- AREA CANCEL SAVED ---', { areaId: selectedAreaId, newBooked, guestsRefunding });

                const io = require('../utils/socket').getIO();
                if (io) {
                  io.to(`event-${eventId}`).emit('areaCancelled', {
                    eventId,
                    areaId: selectedAreaId,
                    userId: booking.userId,
                    guests: guestsRefunding,
                    booked: newBooked,
                    capacity: area.capacity,
                    availableSpots: area.capacity - newBooked
                  });
                  console.log(`Emitted areaCancelled for area ${selectedAreaId}, refunded: ${guestsRefunding}`);
                }
              }
            } else if (!isBusinessDoc && doc.seatingLayout?.seats) {
              // Individual seat cancellation (Event model only)
              doc.seatingLayout.seats = doc.seatingLayout.seats.map((seat: any) => {
                if (booking.selectedSeats!.includes(seat.id) && seat.bookedBy === booking.userId) {
                  return { ...seat, status: 'available', bookedBy: undefined };
                }
                return seat;
              });
              doc.registeredCount = Math.max(0, doc.registeredCount - booking.selectedSeats!.length);
              await doc.save();

              const io = require('../utils/socket').getIO();
              if (io) {
                io.to(`event-${eventId}`).emit('seatsCancelled', {
                  eventId,
                  seatIds: booking.selectedSeats,
                  userId: booking.userId,
                  registeredCount: doc.registeredCount,
                  capacity: doc.capacity,
                  availableSeats: doc.seatingLayout.seats.filter((s: any) => s.status === 'available').length
                });
                console.log(`Emitted seatsCancelled for event ${eventId}`);
              }
            }
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
        ...booking.toObject(),
        _id: booking._id,
        id: booking._id,
        userId: booking.userId,
        eventId: booking.eventId,
        restaurantId: booking.restaurantId,
        eventName: booking.eventName || (booking.eventId && typeof booking.eventId === 'object' && 'name' in booking.eventId ? booking.eventId.name : undefined) || (booking.eventId && typeof booking.eventId === 'object' && 'title' in booking.eventId ? (booking.eventId as any).title : undefined),
        restaurantName: booking.restaurantName || (booking.restaurantId && typeof booking.restaurantId === 'object' && 'name' in booking.restaurantId ? booking.restaurantId.name : undefined),
        date: booking.date instanceof Date ? booking.date.toISOString().slice(0, 10) : booking.date,
        time: booking.time,
        guests: booking.seats || booking.guests || 1,
        selectedSeats: booking.selectedSeats || booking.seatNumbers || [],
        totalAmount: booking.amount || booking.totalAmount,
        fullName: booking.customerName || booking.fullName,
        email: booking.customerEmail || booking.email,
        phoneNumber: booking.customerPhone || booking.phoneNumber,
        specialRequest: booking.specialRequests || booking.specialRequest,
        status: 'cancelled'
      };

      // Only send email if we have an email address (non-blocking)
      if (emailData.email) {
        sendCancellationEmail(emailData, isEvent).catch((err: any) => 
          console.error('Failed to send cancellation email:', err)
        );
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
        const email = booking.customerEmail || (booking as any).email;
        if (email) {
          // Prepare booking data for email
          const isEvent = !!(booking.eventId || booking.eventName);
          const emailData = {
            ...booking.toObject(),
            _id: booking._id,
            id: booking._id,
            userId: booking.userId,
            eventId: booking.eventId,
            restaurantId: booking.restaurantId,
            eventName: booking.eventName || (booking.eventId && typeof booking.eventId === 'object' ? (booking.eventId as any).title : undefined),
            restaurantName: booking.restaurantName || (booking.restaurantId && typeof booking.restaurantId === 'object' ? (booking.restaurantId as any).name : undefined),
            date: booking.date instanceof Date ? booking.date.toISOString().slice(0, 10) : booking.date,
            time: booking.time,
            guests: booking.seats || booking.guests || 1,
            selectedSeats: booking.seatNumbers || booking.selectedSeats || [],
            totalAmount: booking.amount || booking.totalAmount,
            fullName: booking.customerName || (booking as any).fullName,
            email: email,
            phoneNumber: booking.customerPhone || (booking as any).phoneNumber,
            specialRequest: booking.specialRequests || (booking as any).specialRequest,
            status: booking.status
          };

          if (isEvent) {
            const { sendEventConfirmationEmail } = await import('../services/eventEmailService');
            // Send event-specific confirmation email (non-blocking)
            sendEventConfirmationEmail(emailData).catch((emailError: any) => 
              console.error('Error sending event confirmation email during confirm:', emailError)
            );
          } else {
            // For restaurants, try to send with invoice if possible, otherwise simple confirmation
            try {
              const pdfBuffer = await generateInvoicePdfBuffer(booking);
              // Send reservation confirmation email (non-blocking)
              emailService.sendReservationConfirmationEmail({
                ...emailData,
                attachments: [
                  {
                    filename: 'DineInGo_Invoice.pdf',
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                  }
                ]
              }).catch((emailError: any) => 
                console.error('Error sending reservation confirmation email during confirm:', emailError)
              );
            } catch (invoiceError) {
              console.warn('Could not generate invoice for confirmation, sending without it:', invoiceError);
              // Send basic reservation confirmation email (non-blocking)
              emailService.sendReservationConfirmationEmail(emailData).catch((emailError: any) => 
                console.error('Error sending basic reservation confirmation email during confirm:', emailError)
              );
            }
          }
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

// Check-in a booking
export const checkInBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }

    // Update status to checked-in
    booking.status = 'checked-in';
    booking.updatedAt = new Date();
    await booking.save();

    // Populate business details for the companion hub
    try {
      if (booking.restaurantId && mongoose.Types.ObjectId.isValid(String(booking.restaurantId))) {
        await booking.populate('restaurantId');
      }
      if (booking.eventId && mongoose.Types.ObjectId.isValid(String(booking.eventId))) {
        await booking.populate('eventId');
      }
    } catch (populateError) {
      console.warn('Could not populate booking references for check-in:', populateError);
    }

    res.json({
      success: true,
      message: 'Checked in successfully',
      booking
    });
  } catch (error) {
    console.error('Error checking in booking:', error);
    res.status(500).json({
      message: 'Error checking in booking',
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