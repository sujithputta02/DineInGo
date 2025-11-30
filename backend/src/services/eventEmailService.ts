import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

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
  const logoUrl = 'https://i.postimg.cc/KYpqtvPC/Dine-In-Go-Logo.png';
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
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          padding: 40px 30px;
          text-align: center;
          color: white;
        }
        .logo {
          height: 60px;
          margin-bottom: 20px;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .event-badge {
          display: inline-block;
          background: rgba(255, 255, 255, 0.2);
          padding: 8px 20px;
          border-radius: 20px;
          margin-top: 15px;
          font-size: 14px;
          font-weight: 600;
        }
        .content {
          padding: 40px 30px;
        }
        .event-title {
          font-size: 26px;
          font-weight: 700;
          color: #10b981;
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #10b981;
        }
        .pass-card {
          background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
          border: 2px solid #10b981;
          border-radius: 12px;
          padding: 30px;
          margin-bottom: 30px;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 0;
          border-bottom: 1px solid #d1fae5;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 600;
          color: #065f46;
          min-width: 140px;
        }
        .detail-value {
          color: #047857;
          text-align: right;
          flex: 1;
          font-weight: 500;
        }
        .seats-badge {
          display: inline-block;
          background: #10b981;
          color: white;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          margin: 2px;
        }
        .important-box {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 20px;
          margin: 25px 0;
          border-radius: 8px;
        }
        .important-box h3 {
          margin: 0 0 10px 0;
          color: #92400e;
          font-size: 16px;
        }
        .important-box ul {
          margin: 10px 0;
          padding-left: 20px;
          color: #78350f;
        }
        .important-box li {
          margin: 8px 0;
        }
        .attachment-notice {
          background: #eff6ff;
          border: 2px dashed #3b82f6;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 25px 0;
        }
        .attachment-notice h3 {
          color: #1e40af;
          margin: 0 0 10px 0;
        }
        .attachment-notice p {
          color: #1e3a8a;
          margin: 5px 0;
        }
        .footer {
          background: #f8f9fa;
          padding: 30px;
          text-align: center;
          color: #6b7280;
        }
        .footer p {
          margin: 8px 0;
          font-size: 14px;
        }
        .contact-info {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
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
            padding: 25px 15px;
          }
          .detail-row {
            flex-direction: column;
            align-items: flex-start;
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
          <h1>🎉 You're Registered!</h1>
          <div class="event-badge">EVENT PASS ATTACHED</div>
        </div>
        
        <div class="content">
          <div class="event-title">
            ${booking.eventName}
          </div>
          
          <div class="pass-card">
            <div class="detail-row">
              <span class="detail-label">👤 Guest Name:</span>
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
            
            ${booking.selectedSeats && booking.selectedSeats.length > 0 ? `
            <div class="detail-row">
              <span class="detail-label">💺 Seats:</span>
              <span class="detail-value">
                ${booking.selectedSeats.map(seat => `<span class="seats-badge">${seat}</span>`).join(' ')}
              </span>
            </div>
            ` : ''}
            
            ${booking.totalAmount ? `
            <div class="detail-row">
              <span class="detail-label">💰 Total Amount:</span>
              <span class="detail-value" style="font-size: 18px; font-weight: 700;">₹${booking.totalAmount}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="attachment-notice">
            <h3>📎 Event Pass Attached</h3>
            <p>Your event pass is attached as a PDF file</p>
            <p><strong>Please download and save it on your device</strong></p>
            <p>You can present it digitally or print it for entry</p>
          </div>
          
          <div class="important-box">
            <h3>⚠️ Important Information</h3>
            <ul>
              <li><strong>Arrive Early:</strong> Please arrive 15 minutes before the event start time</li>
              <li><strong>Bring Your Pass:</strong> Present the attached PDF (digital or printed) at the entrance</li>
              <li><strong>QR Code Verification:</strong> Your pass contains a QR code for quick check-in</li>
              <li><strong>Valid ID:</strong> Bring a valid photo ID for verification</li>
              ${booking.selectedSeats && booking.selectedSeats.length > 0 ? 
                '<li><strong>Assigned Seating:</strong> Please proceed to your assigned seats upon entry</li>' : 
                '<li><strong>General Admission:</strong> Seating is on a first-come, first-served basis</li>'
              }
            </ul>
          </div>
          
          ${booking.specialRequest ? `
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #374151;"><strong>Your Special Request:</strong></p>
            <p style="margin: 5px 0 0 0; color: #6b7280;">${booking.specialRequest}</p>
          </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p><strong>Thank you for registering with DineInGo!</strong></p>
          <p>We look forward to seeing you at the event.</p>
          
          <div class="contact-info">
            <p><strong>Need Help?</strong></p>
            <p>📧 Email: support@dineingo.com</p>
            <p>📱 Phone: +91-9876543210</p>
            <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
              Pass ID: ${booking._id || booking.id || 'N/A'}
            </p>
          </div>
          
          <p style="margin-top: 25px; font-size: 12px; color: #9ca3af;">
            This is an automated email. Please do not reply to this message.
          </p>
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
  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email credentials not configured for event confirmation');
    throw new Error('Email service not configured');
  }

  if (!booking.email) {
    console.error('No email address provided for event confirmation');
    throw new Error('No email address provided');
  }

  if (!PDFDocument) {
    console.warn('pdfkit not installed, skipping PDF generation');
    throw new Error('PDF generation not available');
  }

  try {
    // Generate event pass PDF
    console.log('Generating event pass PDF...');
    const passPDF = await generateEventPassPDF(booking);
    console.log('Event pass PDF generated successfully');

    // Generate HTML email
    const htmlBody = generateEventConfirmationHTML(booking);

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send email with PDF attachment
    await transporter.sendMail({
      from: `"DineInGo Events" <${process.env.EMAIL_USER}>`,
      to: booking.email,
      subject: `🎉 Event Pass: ${booking.eventName} - ${new Date(booking.date).toLocaleDateString()}`,
      html: htmlBody,
      attachments: [
        {
          filename: `DineInGo_EventPass_${(booking.eventName || 'Event').replace(/[^a-z0-9]/gi, '_')}.pdf`,
          content: passPDF,
          contentType: 'application/pdf',
        }
      ],
    });

    console.log('Event confirmation email sent successfully to:', booking.email);
  } catch (error) {
    console.error('Error sending event confirmation email:', error);
    throw error;
  }
};

/**
 * Generate HTML Email for Cancellation Confirmation
 */
export const generateCancellationHTML = (booking: EventBooking, isEvent: boolean = false): string => {
  const logoUrl = 'https://i.postimg.cc/KYpqtvPC/Dine-In-Go-Logo.png';
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
          margin: 20px auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          padding: 40px 30px;
          text-align: center;
          color: white;
        }
        .logo {
          height: 60px;
          margin-bottom: 20px;
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
        .cancellation-card {
          background: #fef2f2;
          border: 2px solid #ef4444;
          border-radius: 12px;
          padding: 25px;
          margin-bottom: 30px;
        }
        .cancellation-card h2 {
          color: #dc2626;
          margin: 0 0 20px 0;
          font-size: 22px;
          text-align: center;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #fecaca;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 600;
          color: #7f1d1d;
          min-width: 120px;
        }
        .detail-value {
          color: #991b1b;
          text-align: right;
          flex: 1;
        }
        .info-box {
          background: #dbeafe;
          border-left: 4px solid #3b82f6;
          padding: 20px;
          margin: 25px 0;
          border-radius: 8px;
        }
        .info-box h3 {
          margin: 0 0 10px 0;
          color: #1e40af;
          font-size: 16px;
        }
        .info-box p {
          margin: 8px 0;
          color: #1e3a8a;
        }
        .refund-notice {
          background: #fef3c7;
          border: 2px solid #f59e0b;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 25px 0;
        }
        .refund-notice h3 {
          color: #92400e;
          margin: 0 0 10px 0;
        }
        .refund-notice p {
          color: #78350f;
          margin: 5px 0;
        }
        .footer {
          background: #f8f9fa;
          padding: 30px;
          text-align: center;
          color: #6b7280;
        }
        .footer p {
          margin: 8px 0;
          font-size: 14px;
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
        @media (max-width: 600px) {
          .container {
            margin: 10px;
            border-radius: 8px;
          }
          .content {
            padding: 20px 15px;
          }
          .header {
            padding: 25px 15px;
          }
          .detail-row {
            flex-direction: column;
            align-items: flex-start;
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
          <h1>Booking Cancelled</h1>
          <p>Your ${isEvent ? 'event registration' : 'reservation'} has been cancelled</p>
        </div>
        
        <div class="content">
          <div class="cancellation-card">
            <h2>Cancelled ${isEvent ? 'Event' : 'Reservation'}</h2>
            
            <div class="detail-row">
              <span class="detail-label">${isEvent ? 'Event' : 'Restaurant'}:</span>
              <span class="detail-value">${bookingName}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${bookingDate}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Time:</span>
              <span class="detail-value">${booking.time}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">${isEvent ? 'Attendees' : 'Guests'}:</span>
              <span class="detail-value">${booking.guests}</span>
            </div>
            
            ${booking.selectedSeats && booking.selectedSeats.length > 0 ? `
            <div class="detail-row">
              <span class="detail-label">Seats:</span>
              <span class="detail-value">${booking.selectedSeats.join(', ')}</span>
            </div>
            ` : ''}
            
            <div class="detail-row">
              <span class="detail-label">Cancelled On:</span>
              <span class="detail-value">${new Date().toLocaleString()}</span>
            </div>
          </div>
          
          ${booking.totalAmount ? `
          <div class="refund-notice">
            <h3>💰 Refund Information</h3>
            <p><strong>Amount: ₹${booking.totalAmount}</strong></p>
            <p>Your refund will be processed within 5-7 business days</p>
            <p>The amount will be credited to your original payment method</p>
          </div>
          ` : ''}
          
          <div class="info-box">
            <h3>ℹ️ What Happens Next?</h3>
            <p>• Your booking has been successfully cancelled</p>
            <p>• ${isEvent ? 'Your seats are now available for others' : 'Your table is now available for others'}</p>
            <p>• You will receive a confirmation email shortly</p>
            ${booking.totalAmount ? '<p>• Refund will be processed automatically</p>' : ''}
            <p>• You can make a new booking anytime</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #6b7280; margin-bottom: 15px;">
              We're sorry to see you cancel. We hope to serve you again soon!
            </p>
            <a href="https://dineingo.com" class="btn">Browse ${isEvent ? 'Events' : 'Restaurants'}</a>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Need Help?</strong></p>
          <p>If you have any questions about this cancellation,</p>
          <p>please contact us at support@dineingo.com or call +91-9876543210</p>
          
          <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
            Booking ID: ${booking._id || booking.id || 'N/A'}
          </p>
          
          <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
            This is an automated email. Please do not reply to this message.
          </p>
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
  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email credentials not configured for cancellation email');
    return;
  }

  if (!booking.email) {
    console.error('No email address provided for cancellation email');
    return;
  }

  try {
    // Generate HTML email
    const htmlBody = generateCancellationHTML(booking, isEvent);

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const bookingName = booking.eventName || booking.restaurantName || 'your booking';
    const bookingType = isEvent ? 'Event Registration' : 'Reservation';

    // Send email
    await transporter.sendMail({
      from: `"DineInGo" <${process.env.EMAIL_USER}>`,
      to: booking.email,
      subject: `Cancellation Confirmed - ${bookingName}`,
      html: htmlBody,
    });

    console.log('Cancellation email sent successfully to:', booking.email);
  } catch (error) {
    console.error('Error sending cancellation email:', error);
    // Don't throw error - cancellation should succeed even if email fails
  }
};

export default {
  generateEventPassPDF,
  generateEventConfirmationHTML,
  sendEventConfirmationEmail,
  generateCancellationHTML,
  sendCancellationEmail
};
