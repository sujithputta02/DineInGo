import { Request, Response } from 'express';
import { Booking } from '../models/Booking';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { generateBothWalletPasses } from '../utils/walletPassGenerator';

// Generate invoice PDF as a Buffer
const generateInvoicePdfBuffer = (bookingData: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
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
    const booking = new Booking({
      ...req.body,
      restaurantName: req.body.restaurantName,
      eventName: req.body.eventName,
      selectedItems: req.body.selectedItems,
      totalAmount: req.body.totalAmount,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await booking.save();
    
    // Populate restaurant and event details after saving
    await booking.populate('restaurantId');
    await booking.populate('eventId');
    
    // Send confirmation email
    try {
      await sendReservationConfirmationEmail(booking, req.body);
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Don't fail the booking creation if email fails
    }
    
    // Send invoice PDF email (new, separate)
    try {
      await sendInvoicePdfEmail(booking);
    } catch (invoiceError) {
      console.error('Error sending invoice PDF email:', invoiceError);
    }
    
    res.status(201).json(booking);
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Error creating booking' });
  }
};

// Helper function to send reservation confirmation email
const sendReservationConfirmationEmail = async (booking: any, bookingData: any) => {
  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email credentials not configured for reservation confirmation');
    return;
  }

  const email = bookingData.email || booking.email;
  if (!email) {
    console.error('No email address provided for reservation confirmation');
    return;
  }

  // Use the provided direct image link for the logo
  const logoUrl = 'https://i.postimg.cc/WbNR0cxd/logo1.png';
  const bookingName = getBookingDisplayName(bookingData);
  // Create dynamic HTML email template
  const htmlBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reservation Confirmation - DineInGo</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f8f9fa;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          padding: 30px;
          text-align: center;
          color: white;
        }
        .logo {
          height: 60px;
          margin-bottom: 15px;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .header p {
          margin: 10px 0 0 0;
          font-size: 16px;
          opacity: 0.9;
        }
        .content {
          padding: 40px 30px;
        }
        .reservation-card {
          background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
          border: 2px solid #10b981;
          border-radius: 12px;
          padding: 25px;
          margin-bottom: 30px;
        }
        .reservation-card h2 {
          color: #10b981;
          margin: 0 0 20px 0;
          font-size: 24px;
          text-align: center;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 600;
          color: #374151;
          min-width: 120px;
        }
        .detail-value {
          color: #1f2937;
          text-align: right;
          flex: 1;
        }
        .restaurant-info {
          background: #f9fafb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 25px;
          text-align: center;
        }
        .restaurant-name {
          font-size: 22px;
          font-weight: 700;
          color: #10b981;
          margin-bottom: 10px;
        }
        .footer {
          background: #f8f9fa;
          padding: 25px 30px;
          text-align: center;
          color: #6b7280;
        }
        .footer p {
          margin: 5px 0;
          font-size: 14px;
        }
        .contact-info {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #e5e7eb;
        }
        .btn {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin-top: 20px;
        }
        .btn:hover {
          background: #059669;
        }
        @media (max-width: 600px) {
          .container {
            margin: 10px;
            border-radius: 8px;
          }
          .content {
            padding: 20px 15px;
          }
          .header {
            padding: 20px 15px;
          }
          .detail-row {
            flex-direction: column;
            align-items: flex-start;
            text-align: left;
          }
          .detail-value {
            text-align: left;
            margin-top: 5px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="${logoUrl}" alt="DineInGo Logo" class="logo" />
          <h1>Reservation Confirmed!</h1>
          <p>Your table has been successfully reserved</p>
        </div>
        
        <div class="content">
          <div class="restaurant-info">
            <div class="restaurant-name">${bookingName}</div>
            <p style="margin: 0; color: #6b7280;">We're excited to serve you!</p>
          </div>
          
          <div class="reservation-card">
            <h2>Reservation Details</h2>
            
            <div class="detail-row">
              <span class="detail-label">Guest Name:</span>
              <span class="detail-value">${bookingData.fullName || 'Guest'}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${bookingData.date}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Time:</span>
              <span class="detail-value">${bookingData.time}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Number of Guests:</span>
              <span class="detail-value">${bookingData.guests}</span>
            </div>
            
            ${bookingData.table ? `
            <div class="detail-row">
              <span class="detail-label">Table:</span>
              <span class="detail-value">${bookingData.table}</span>
            </div>
            ` : ''}
            
            ${bookingData.occasion ? `
            <div class="detail-row">
              <span class="detail-label">Occasion:</span>
              <span class="detail-value">${bookingData.occasion}</span>
            </div>
            ` : ''}
            
            ${bookingData.specialRequest ? `
            <div class="detail-row">
              <span class="detail-label">Special Request:</span>
              <span class="detail-value">${bookingData.specialRequest}</span>
            </div>
            ` : ''}
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://dineingo.com/dashboard" class="btn">View My Reservations</a>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Thank you for choosing DineInGo!</strong></p>
          <p>We look forward to providing you with an exceptional dining experience.</p>
          
          <div class="contact-info">
            <p><strong>Need to make changes?</strong></p>
            <p>Contact us at support@dineingo.com or call +91-9876543210</p>
            <p>Please arrive 5 minutes before your reservation time.</p>
          </div>
          
          <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
            This is an automated email. Please do not reply to this message.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"DineInGo" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Reservation Confirmed - ${bookingName}`,
    html: htmlBody,
  });

  console.log('Reservation confirmation email sent successfully to:', email);
};

// Get all bookings for a user
export const getUserBookings = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.userId;
    const bookings = await Booking.find({ userId })
      .sort({ date: 1, time: 1 })
      .populate({ path: 'restaurantId', select: 'name image' })
      .populate({ path: 'eventId', select: 'name image' });
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
};

// Get a specific booking
export const getBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('restaurantId')
      .populate('eventId');
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
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
    )
      .populate('restaurantId')
      .populate('eventId');
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
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
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', updatedAt: new Date() },
      { new: true }
    )
      .populate('restaurantId')
      .populate('eventId');
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }
    // Emit real-time update for table availability
    if (booking.restaurantId && booking.date && booking.time) {
      let restaurantId: string;
      if (typeof booking.restaurantId === 'object' && booking.restaurantId !== null && '_id' in booking.restaurantId) {
        restaurantId = String((booking.restaurantId as any)._id);
      } else {
        restaurantId = String(booking.restaurantId);
      }
      const date = booking.date instanceof Date ? booking.date.toISOString().slice(0,10) : booking.date;
      const time = booking.time;
      require('../utils/socket').getIO().to(restaurantId).emit('bookingUpdated', { restaurantId, date, time });
    }
    res.json(booking);
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ message: 'Error cancelling booking' });
  }
};

// Confirm a booking
export const confirmBooking = async (req: Request, res: Response): Promise<void> => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'confirmed', updatedAt: new Date() },
      { new: true }
    )
      .populate('restaurantId')
      .populate('eventId');
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' });
      return;
    }
    // Emit real-time update for table availability
    if (booking.restaurantId && booking.date && booking.time) {
      let restaurantId: string;
      if (typeof booking.restaurantId === 'object' && booking.restaurantId !== null && '_id' in booking.restaurantId) {
        restaurantId = String((booking.restaurantId as any)._id);
      } else {
        restaurantId = String(booking.restaurantId);
      }
      const date = booking.date instanceof Date ? booking.date.toISOString().slice(0,10) : booking.date;
      const time = booking.time;
      require('../utils/socket').getIO().to(restaurantId).emit('bookingUpdated', { restaurantId, date, time });
    }
    res.json(booking);
  } catch (error) {
    console.error('Error confirming booking:', error);
    res.status(500).json({ message: 'Error confirming booking' });
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