import nodemailer from 'nodemailer';
import { createTransporter, emailService } from './emailService';
import QRCode from 'qrcode';
import path from 'path';

// Dynamically import pdfkit if available
let PDFDocument: any;
try {
  PDFDocument = require('pdfkit');
} catch (e) {
  console.warn('pdfkit not installed, PDF generation will be disabled');
}

interface EventBooking {
  _id?: string;
  id?: string;
  userId: string;
  eventId?: any;
  restaurantId?: any;
  eventName?: string;
  restaurantName?: string;
  date: string;
  time: string;
  guests: number;
  selectedSeats?: string[];
  totalAmount?: number;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  specialRequest?: string;
  status: string;
}

const logoPath = path.join(__dirname, '../assets/logo.png');
const cidLogo = 'dineingo-logo';

/**
 * Generate Event Pass PDF with QR Code
 */
export const generateEventPassPDF = async (booking: EventBooking): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    if (!PDFDocument) {
      return reject(new Error('pdfkit not installed'));
    }

    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);

      // Generate QR Code
      const bookingId = booking._id || booking.id || 'unknown';
      const qrData = JSON.stringify({
        bookingId,
        eventName: booking.eventName,
        date: booking.date,
        time: booking.time,
        guests: booking.guests,
        seats: booking.selectedSeats || [],
        name: booking.fullName
      });

      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 1,
        color: {
          dark: '#10b981',
          light: '#ffffff'
        }
      });

      // Header with gradient background
      doc.rect(0, 0, doc.page.width, 150).fill('#10b981');

      // Logo/Title with red dot on 'i'
      doc.fontSize(32)
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .text('D', 50, 40, { continued: true })
        .text('i', { continued: false });

      // Add red dot above the 'i'
      doc.circle(68, 38, 4)
        .fillColor('#ef4444')
        .fill();

      // Continue with rest of logo
      doc.fontSize(32)
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .text('neIn', 75, 40, { continued: true })
        .fillColor('#fbbf24')
        .text('Go', { continued: false });

      doc.fontSize(16)
        .fillColor('#ffffff')
        .font('Helvetica')
        .text('Event Pass', 50, 80);

      // Event Name (Large and prominent)
      doc.fontSize(24)
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .text(booking.eventName || 'Event', 50, 110, {
          width: doc.page.width - 100,
          align: 'center'
        });

      // Reset to black for body content
      doc.fillColor('#000000');

      // Pass ID
      doc.fontSize(10)
        .fillColor('#666666')
        .font('Helvetica')
        .text(`Pass ID: ${bookingId}`, 50, 180);

      // Main Content Box
      const boxY = 210;
      doc.roundedRect(50, boxY, doc.page.width - 100, 280, 10)
        .lineWidth(2)
        .strokeColor('#10b981')
        .stroke();

      // Guest Information
      let currentY = boxY + 30;

      doc.fontSize(14)
        .fillColor('#10b981')
        .font('Helvetica-Bold')
        .text('Guest Information', 70, currentY);

      currentY += 25;
      doc.fontSize(12)
        .fillColor('#000000')
        .font('Helvetica');

      doc.text(`Name: ${booking.fullName || 'Guest'}`, 70, currentY);
      currentY += 20;
      doc.text(`Email: ${booking.email || 'N/A'}`, 70, currentY);
      currentY += 20;
      doc.text(`Phone: ${booking.phoneNumber || 'N/A'}`, 70, currentY);

      // Event Details
      currentY += 35;
      doc.fontSize(14)
        .fillColor('#10b981')
        .font('Helvetica-Bold')
        .text('Event Details', 70, currentY);

      currentY += 25;
      doc.fontSize(12)
        .fillColor('#000000')
        .font('Helvetica');

      doc.text(`Date: ${new Date(booking.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}`, 70, currentY);

      currentY += 20;
      doc.text(`Time: ${booking.time}`, 70, currentY);

      currentY += 20;
      doc.text(`${booking.selectedSeats && booking.selectedSeats.length > 0 ? 'Attendees' : 'Guests'}: ${booking.guests}`, 70, currentY);

      if (booking.selectedSeats && booking.selectedSeats.length > 0) {
        currentY += 20;
        doc.text(`Seats: ${booking.selectedSeats.join(', ')}`, 70, currentY);
      }

      if (booking.totalAmount) {
        currentY += 20;
        doc.fontSize(14)
          .fillColor('#10b981')
          .font('Helvetica-Bold')
          .text(`Total: ₹${booking.totalAmount}`, 70, currentY);
      }

      // QR Code
      const qrX = doc.page.width - 250;
      const qrY = boxY + 80;

      doc.fontSize(10)
        .fillColor('#666666')
        .font('Helvetica')
        .text('Scan for Check-in', qrX + 20, qrY - 20, {
          width: 160,
          align: 'center'
        });

      // Add QR code image
      doc.image(qrCodeDataUrl, qrX + 20, qrY, {
        width: 160,
        height: 160
      });

      // Special Request
      if (booking.specialRequest) {
        currentY = boxY + 280 + 30;
        doc.fontSize(12)
          .fillColor('#666666')
          .font('Helvetica-Oblique')
          .text(`Special Request: ${booking.specialRequest}`, 70, currentY, {
            width: doc.page.width - 140
          });
      }

      // Important Information Box
      const infoBoxY = doc.page.height - 200;
      doc.roundedRect(50, infoBoxY, doc.page.width - 100, 100, 5)
        .fillAndStroke('#f0fdf4', '#10b981');

      doc.fontSize(11)
        .fillColor('#065f46')
        .font('Helvetica-Bold')
        .text('Important Information:', 70, infoBoxY + 15);

      doc.fontSize(9)
        .fillColor('#047857')
        .font('Helvetica')
        .text('• Please arrive 15 minutes before the event start time', 70, infoBoxY + 35);
      doc.text('• Present this pass (digital or printed) at the entrance', 70, infoBoxY + 50);
      doc.text('• QR code will be scanned for verification', 70, infoBoxY + 65);
      doc.text('• Contact support@dineingo.com for any queries', 70, infoBoxY + 80);

      // Footer
      doc.fontSize(8)
        .fillColor('#999999')
        .font('Helvetica')
        .text('This is an official event pass issued by DineInGo', 50, doc.page.height - 60, {
          width: doc.page.width - 100,
          align: 'center'
        });

      doc.text(`Generated on ${new Date().toLocaleString()}`, 50, doc.page.height - 45, {
        width: doc.page.width - 100,
        align: 'center'
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate HTML Email for Event Confirmation
 */
export const generateEventConfirmationHTML = (booking: EventBooking): string => {
  const eventDate = new Date(booking.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Registration Confirmed - ${booking.eventName}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
        body { font-family: 'Outfit', sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px; text-align: center; color: white; }
        .logo { height: 50px; margin-bottom: 20px; }
        .content { padding: 40px; }
        .pass-card { background: #f0fdf4; border: 2px solid #10b981; border-radius: 16px; padding: 30px; margin-bottom: 30px; }
        .detail-row { display: table; width: 100%; border-bottom: 1px solid #d1fae5; padding: 12px 0; }
        .detail-label { display: table-cell; font-weight: 600; color: #065f46; width: 40%; }
        .detail-value { display: table-cell; color: #047857; text-align: right; }
        .footer { background: #f8f9fa; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="cid:${cidLogo}" alt="DineInGo Logo" class="logo" />
          <h1 style="margin: 0; color: #ffffff;">🎉 You're Registered!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Event Pass Attached</p>
        </div>
        
        <div class="content">
          <h2 style="color: #10b981; text-align: center; margin-bottom: 30px;">${booking.eventName}</h2>
          
          <div class="pass-card">
            <div class="detail-row">
              <span class="detail-label">👤 Guest:</span>
              <span class="detail-value">${booking.fullName || 'Guest'}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">📅 Date:</span>
              <span class="detail-value">${eventDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">🕐 Time:</span>
              <span class="detail-value">${booking.time}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">👥 ${booking.selectedSeats && booking.selectedSeats.length > 0 ? 'Attendees' : 'Guests'}:</span>
              <span class="detail-value">${booking.guests}</span>
            </div>
          </div>

          <div style="background: #eff6ff; border: 2px dashed #3b82f6; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px;">
            <p style="margin: 0; color: #1e40af; font-weight: 600;">📎 Your Event Pass is Attached</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #1e3a8a;">Please show the PDF at the entrance for entry.</p>
          </div>

          <div style="background: #ffffff; border: 2px solid #f3f4f6; border-radius: 20px; overflow: hidden;">
            <div style="background: #f0fdf4; height: 140px; display: flex; align-items: center; justify-content: center; background-image: radial-gradient(#10b981 0.5px, #f0fdf4 0.5px); background-size: 10px 10px;">
              <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.restaurantName || booking.eventName || 'DineInGo')}" style="text-decoration: none;">
                <div style="background: #10b981; color: white; padding: 10px 20px; border-radius: 99px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">📍 Open Live Map</div>
              </a>
            </div>
            <div style="padding: 24px; text-align: center;">
              <div style="font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase; margin-bottom: 8px;">Venue Location</div>
              <div style="font-size: 16px; color: #1f2937; font-weight: 600; margin-bottom: 4px;">${booking.restaurantName || 'Event Venue'}</div>
              <p style="margin: 0; font-size: 14px; color: #6b7280; margin-bottom: 16px;">Details available in your event pass PDF.</p>
              <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.restaurantName || booking.eventName || 'DineInGo')}" style="display: inline-block; background: #10b981; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 12px; font-weight: 600;">Get Directions</a>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>DineInGo Events</strong></p>
          <p>Helping you find the best experiences.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};



/**
 * Send Event Confirmation Email with Pass
 */
export const sendEventConfirmationEmail = async (booking: EventBooking): Promise<void> => {
  const email = booking.email || (booking as any).customerEmail;
  
  if (!email) {
    console.error('No email address provided for event confirmation');
    return;
  }

  if (!PDFDocument) {
    console.warn('pdfkit not installed, skipping PDF generation');
    return;
  }

  try {
    const transporter = createTransporter();
    if (!transporter) return;

    // Generate event pass PDF and send email (non-blocking)
    const sendAsync = async () => {
      try {
        console.log('Generating event pass PDF...');
        const passPDF = await generateEventPassPDF(booking);
        console.log('Event pass PDF generated successfully');

        // Generate HTML email
        const htmlBody = generateEventConfirmationHTML(booking);

        // Send email with PDF and logo attachments
        await transporter.sendMail({
          from: emailService.getSender("DineInGo Events"),
          to: email,
          subject: `🎉 Event Pass: ${booking.eventName || 'Your Event'} - ${new Date(booking.date).toLocaleDateString()}`,
          html: htmlBody,
          attachments: [
            {
              filename: `DineInGo_EventPass_${(booking.eventName || 'Event').replace(/[^a-z0-9]/gi, '_')}.pdf`,
              content: passPDF,
              contentType: 'application/pdf',
            },
            {
              filename: 'logo.png',
              path: logoPath,
              cid: cidLogo
            }
          ],
        });
        console.log('Event confirmation email sent successfully to:', email);
      } catch (err) {
        console.error('Error in async event confirmation email send:', err);
      }
    };

    sendAsync();
  } catch (error) {
    console.error('Error initiating event confirmation email:', error);
  }
};

/**
 * Generate HTML Email for Cancellation Confirmation
 */
export const generateCancellationHTML = (booking: EventBooking, isEvent: boolean = false): string => {
  const bookingName = booking.eventName || booking.restaurantName || 'your booking';
  const bookingDate = new Date(booking.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Booking Cancelled - DineInGo</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
        body { font-family: 'Outfit', sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px; text-align: center; color: white; }
        .logo { height: 50px; margin-bottom: 20px; }
        .content { padding: 40px; }
        .cancellation-card { background: #fef2f2; border: 2px solid #fee2e2; border-radius: 16px; padding: 25px; margin-bottom: 30px; }
        .detail-row { display: table; width: 100%; border-bottom: 1px solid #fee2e2; padding: 12px 0; }
        .detail-label { display: table-cell; font-weight: 600; color: #7f1d1d; width: 40%; font-size: 13px; text-transform: uppercase; }
        .detail-value { display: table-cell; color: #991b1b; text-align: right; font-weight: 600; }
        .info-box { background: #f9fafb; border-radius: 12px; padding: 20px; margin-top: 20px; border-left: 4px solid #ef4444; }
        .btn { display: inline-block; background: #10b981; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; margin-top: 20px; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.4); }
        .footer { padding: 30px; text-align: center; color: #6b7280; font-size: 13px; background: #f9fafb; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="cid:${cidLogo}" alt="DineInGo Logo" class="logo" />
          <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Cancellation Confirmed</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your ${isEvent ? 'event registration' : 'reservation'} has been successfully cancelled</p>
        </div>
        
        <div class="content">
          <p>Hi ${booking.fullName || 'there'},</p>
          <p>This email confirms that your ${isEvent ? 'registration' : 'reservation'} for <strong>${bookingName}</strong> has been cancelled as requested.</p>

          <div class="cancellation-card">
            <h3 style="color: #dc2626; margin: 0 0 15px 0; border-bottom: 2px solid #fecaca; padding-bottom: 8px;">Booking Summary</h3>
            <div class="detail-row">
              <span class="detail-label">${isEvent ? 'Event' : 'Restaurant'}</span>
              <span class="detail-value">${bookingName}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date</span>
              <span class="detail-value">${bookingDate}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Time</span>
              <span class="detail-value">${booking.time}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Booking ID</span>
              <span class="detail-value">#${String(booking._id || booking.id).slice(-6).toUpperCase()}</span>
            </div>
          </div>

          <div class="info-box">
            <h4 style="margin: 0 0 10px 0; color: #111827;">What happens next?</h4>
            <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px;">
              <li>If any payment was made, it will be refunded to your original payment method within 5-7 business days.</li>
              <li>You can book another ${isEvent ? 'event' : 'table'} anytime through our dashboard.</li>
              <li>A notification has been sent to the ${isEvent ? 'organizer' : 'restaurant'}.</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-top: 40px;">
            <p style="color: #6b7280; margin-bottom: 20px;">We're sorry you couldn't make it this time. Hope to see you back soon!</p>
            <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}" class="btn">Explore Other Options</a>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>DineInGo - Excellence in Dining</strong></p>
          <p>Questions? Contact us at support@dineingo.com</p>
          <p style="margin-top: 15px; opacity: 0.6;">© 2026 DineInGo Inc. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Send Cancellation Confirmation Email
 */
export const sendCancellationEmail = async (booking: EventBooking, isEvent: boolean = false): Promise<void> => {
  const email = booking.email || (booking as any).customerEmail;

  if (!email) {
    console.error('No email address provided for cancellation email');
    return;
  }

  try {
    const transporter = createTransporter();
    if (!transporter) return;

    // Send cancellation email (non-blocking)
    const sendAsync = async () => {
      try {
        // Generate HTML email
        const htmlBody = generateCancellationHTML(booking, isEvent);
        const bookingName = booking.eventName || booking.restaurantName || 'your booking';

        // Send email with logo attachment
        await transporter.sendMail({
          from: emailService.getSender(),
          to: email,
          subject: `Cancellation Confirmed - ${bookingName}`,
          html: htmlBody,
          attachments: [{
            filename: 'logo.png',
            path: logoPath,
            cid: cidLogo
          }]
        });
        console.log('Cancellation email sent successfully to:', email);
      } catch (err) {
        console.error('Error in async cancellation email send:', err);
      }
    };

    sendAsync();
  } catch (error) {
    console.error('Error initiating cancellation email:', error);
  }
};

export default {
  generateEventPassPDF,
  generateEventConfirmationHTML,
  sendEventConfirmationEmail,
  generateCancellationHTML,
  sendCancellationEmail
};
