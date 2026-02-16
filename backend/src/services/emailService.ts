import nodemailer from 'nodemailer';

interface ReviewEmailData {
  to: string;
  userName: string;
  businessName: string;
  rating?: number;
  comment?: string;
  replyText?: string;
}

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email credentials not configured');
    return null;
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export interface ReservationEmailData {
  to?: string;
  email?: string;
  fullName: string;
  restaurantName: string;
  address?: string;
  date: string;
  time: string;
  guests: number | string;
  table?: string;
  occasion?: string;
  specialRequest?: string;
  bookingId?: string;
}



export const emailService = {
  /**
   * Send email to user confirming their review submission
   */
  async sendReviewSubmissionEmail(data: ReviewEmailData): Promise<boolean> {
    try {
      const transporter = createTransporter();
      if (!transporter) return false;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Thanks for your review!</h2>
          <p>Hi ${data.userName},</p>
          <p>Thank you for taking the time to review <strong>${data.businessName}</strong>.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Your Rating:</strong> ${'★'.repeat(data.rating || 0)}</p>
            <p><strong>Your Comment:</strong></p>
            <p style="font-style: italic;">"${data.comment}"</p>
          </div>

          <p>Your feedback helps others make better dining choices!</p>
          <p>Best regards,<br>The DineInGo Team</p>
        </div>
      `;

      await transporter.sendMail({
        from: `"DineInGo" <${process.env.EMAIL_USER}>`,
        to: data.to,
        subject: `Start Rating: You reviewed ${data.businessName}`,
        html,
      });

      console.log(`Review submission email sent to ${data.to}`);
      return true;
    } catch (error) {
      console.error('Error sending review submission email:', error);
      return false;
    }
  },

  /**
   * Send email to user when business replies to their review
   */
  async sendReplyNotificationEmail(data: ReviewEmailData): Promise<boolean> {
    try {
      const transporter = createTransporter();
      if (!transporter) return false;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">New Reply to Your Review</h2>
          <p>Hi ${data.userName},</p>
          <p>The owner of <strong>${data.businessName}</strong> has replied to your review.</p>
          
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Their Reply:</strong></p>
            <p style="font-style: italic; color: #1f2937;">"${data.replyText}"</p>
          </div>

          <p>You can view the full conversation in your <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard">Dashboard</a>.</p>
          <p>Best regards,<br>The DineInGo Team</p>
        </div>
      `;

      await transporter.sendMail({
        from: `"DineInGo" <${process.env.EMAIL_USER}>`,
        to: data.to,
        subject: `New Reply from ${data.businessName}`,
        html,
      });

      console.log(`Reply notification email sent to ${data.to}`);
      return true;
    } catch (error) {
      console.error('Error sending reply notification email:', error);
      return false;
    }
  },

  /**
   * Send reservation confirmation email
   */
  async sendReservationConfirmationEmail(data: ReservationEmailData): Promise<boolean> {
    try {
      const transporter = createTransporter();
      if (!transporter) return false;

      const logoUrl = 'https://i.postimg.cc/KYpqtvPC/Dine-In-Go-Logo.png';
      const bookingName = data.restaurantName || 'Restaurant';
      const email = data.to || data.email;

      if (!email) {
        console.error('No email address provided for reservation confirmation');
        return false;
      }

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
                  <span class="detail-value">${data.fullName || 'Guest'}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${data.date}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">${data.time}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Number of Guests:</span>
                  <span class="detail-value">${data.guests}</span>
                </div>
                
                ${data.table ? `
                <div class="detail-row">
                  <span class="detail-label">Table:</span>
                  <span class="detail-value">${data.table}</span>
                </div>
                ` : ''}
                
                ${data.occasion ? `
                <div class="detail-row">
                  <span class="detail-label">Occasion:</span>
                  <span class="detail-value">${data.occasion}</span>
                </div>
                ` : ''}
                
                ${data.specialRequest ? `
                <div class="detail-row">
                  <span class="detail-label">Special Request:</span>
                  <span class="detail-value">${data.specialRequest}</span>
                </div>
                ` : ''}
                
                ${data.address ? `
                <div class="detail-row" style="border-bottom: none;">
                  <span class="detail-label">Address:</span>
                  <span class="detail-value">${data.address}</span>
                </div>
                ` : ''}
              </div>
              
              ${data.address ? `
              <div style="text-align: center; margin-top: 10px; margin-bottom: 20px;">
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.address)}" 
                   style="display: inline-flex; align-items: center; gap: 8px; color: #10b981; text-decoration: none; font-weight: 600; font-size: 14px;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  Get Directions on Google Maps
                </a>
              </div>
              ` : ''}

              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard" class="btn">View My Reservations</a>
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

      const mailOptions = {
        from: `"DineInGo" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `Reservation Confirmed - ${bookingName}`,
        html: htmlBody,
        text: `Your reservation at ${bookingName} has been confirmed for ${data.date} at ${data.time} for ${data.guests} guests.`
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Reservation confirmation email sent successfully to:', email);
      console.log('Message ID:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending reservation confirmation email:', error);
      return false;
    }
  }

};

// Generic email sending function
export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    if (!transporter) return false;

    await transporter.sendMail({
      from: `"DineInGo" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log(`Email sent to ${options.to}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};
