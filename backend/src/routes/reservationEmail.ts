import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

interface ReservationEmailData {
  to: string;
  reservationDetails: {
    fullName: string;
    restaurantName: string;
    date: string;
    time: string;
    guests: number;
    table?: string;
    occasion?: string;
    specialRequest?: string;
    totalAmount?: number;
    selectedItems?: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
  };
}

router.post('/send-reservation-confirmation', async (req, res) => {
  const { to, reservationDetails }: ReservationEmailData = req.body;

  if (!to || !reservationDetails) {
    return res.status(400).json({ error: 'Missing required fields: to email and reservation details' });
  }

  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email credentials not configured');
    return res.status(500).json({ 
      error: 'Email service not configured',
      details: 'EMAIL_USER and EMAIL_PASS environment variables are required'
    });
  }

  // Use the provided direct image link for the logo
  const logoUrl = 'https://i.postimg.cc/WbNR0cxd/logo1.png';
  
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
        .order-summary {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          padding: 20px;
          margin-top: 20px;
        }
        .order-summary h3 {
          color: #92400e;
          margin: 0 0 15px 0;
          font-size: 18px;
        }
        .order-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #fde68a;
        }
        .order-item:last-child {
          border-bottom: none;
        }
        .total-amount {
          font-size: 20px;
          font-weight: 700;
          color: #10b981;
          text-align: right;
          margin-top: 15px;
          padding-top: 15px;
          border-top: 2px solid #10b981;
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
            <div class="restaurant-name">${reservationDetails.restaurantName}</div>
            <p style="margin: 0; color: #6b7280;">We're excited to serve you!</p>
          </div>
          
          <div class="reservation-card">
            <h2>Reservation Details</h2>
            
            <div class="detail-row">
              <span class="detail-label">Guest Name:</span>
              <span class="detail-value">${reservationDetails.fullName}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${reservationDetails.date}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Time:</span>
              <span class="detail-value">${reservationDetails.time}</span>
            </div>
            
            <div class="detail-row">
              <span class="detail-label">Number of Guests:</span>
              <span class="detail-value">${reservationDetails.guests}</span>
            </div>
            
            ${reservationDetails.table ? `
            <div class="detail-row">
              <span class="detail-label">Table:</span>
              <span class="detail-value">${reservationDetails.table}</span>
            </div>
            ` : ''}
            
            ${reservationDetails.occasion ? `
            <div class="detail-row">
              <span class="detail-label">Occasion:</span>
              <span class="detail-value">${reservationDetails.occasion}</span>
            </div>
            ` : ''}
            
            ${reservationDetails.specialRequest ? `
            <div class="detail-row">
              <span class="detail-label">Special Request:</span>
              <span class="detail-value">${reservationDetails.specialRequest}</span>
            </div>
            ` : ''}
          </div>
          
          ${reservationDetails.selectedItems && reservationDetails.selectedItems.length > 0 ? `
          <div class="order-summary">
            <h3>Your Order Summary</h3>
            ${reservationDetails.selectedItems.map(item => `
              <div class="order-item">
                <span>${item.name} (Qty: ${item.quantity})</span>
                <span>₹${item.price * item.quantity}</span>
              </div>
            `).join('')}
            ${reservationDetails.totalAmount ? `
              <div class="total-amount">
                Total Amount: ₹${reservationDetails.totalAmount}
              </div>
            ` : ''}
          </div>
          ` : ''}
          
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

  try {
    console.log('Sending reservation confirmation email to:', to);
    console.log('Reservation details:', reservationDetails);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"DineInGo" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: `Reservation Confirmed - ${reservationDetails.restaurantName}`,
      html: htmlBody,
    });

    console.log('Reservation confirmation email sent successfully to:', to);
    res.json({ 
      success: true, 
      message: 'Reservation confirmation email sent successfully' 
    });
  } catch (error) {
    console.error('Error sending reservation confirmation email:', error);
    res.status(500).json({ 
      error: 'Failed to send reservation confirmation email',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 