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
          <title>Reservation Confirmed - DineInGo</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
            
            body {
              font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #1f2937;
              margin: 0;
              padding: 0;
              background-color: #f3f4f6;
            }
            .wrapper {
              width: 100%;
              table-layout: fixed;
              background-color: #f3f4f6;
              padding-bottom: 40px;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background-color: #ffffff;
              border-radius: 24px;
              overflow: hidden;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            }
            .header {
              background: linear-gradient(135deg, #059669 0%, #10b981 100%);
              padding: 60px 40px;
              text-align: center;
              color: white;
            }
            .logo {
              height: 50px;
              margin-bottom: 24px;
            }
            .header h1 {
              margin: 0;
              font-size: 32px;
              font-weight: 700;
              letter-spacing: -0.025em;
            }
            .header p {
              margin: 12px 0 0 0;
              font-size: 18px;
              opacity: 0.9;
              font-weight: 300;
            }
            .content {
              padding: 40px;
            }
            .section-title {
              font-size: 14px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #6b7280;
              margin-bottom: 16px;
            }
            .reservation-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 32px;
            }
            .detail-item {
              background: #f9fafb;
              padding: 16px;
              border-radius: 16px;
              border: 1px solid #f3f4f6;
            }
            .detail-label {
              display: block;
              font-size: 12px;
              font-weight: 600;
              color: #9ca3af;
              margin-bottom: 4px;
            }
            .detail-value {
              font-size: 16px;
              font-weight: 600;
              color: #111827;
            }
            .restaurant-hero {
              text-align: center;
              margin-bottom: 40px;
            }
            .restaurant-name {
              font-size: 28px;
              font-weight: 700;
              color: #059669;
              margin-bottom: 8px;
            }
            .location-card {
              margin-top: 40px;
              background: #ffffff;
              border-radius: 20px;
              border: 1px solid #e5e7eb;
              overflow: hidden;
            }
            .map-preview {
              width: 100%;
              height: 200px;
              background-color: #e5e7eb;
              background-image: url('https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(data.address || '')}&zoom=15&size=600x200&scale=2&markers=color:green%7C${encodeURIComponent(data.address || '')}&key=YOUR_API_KEY_HERE'); /* User will need an API key for this to work natively, but let's provide a better fallback */
              background-size: cover;
              background-position: center;
              position: relative;
            }
            /* Fallback purely decorative map-like background if API key is missing */
            .map-fallback {
              width: 100%;
              height: 200px;
              background: linear-gradient(45deg, #f3f4f6 25%, #e5e7eb 25%, #e5e7eb 50%, #f3f4f6 50%, #f3f4f6 75%, #e5e7eb 75%, #e5e7eb 100%);
              background-size: 40px 40px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .location-info {
              padding: 24px;
              text-align: center;
            }
            .address-text {
              font-size: 15px;
              color: #4b5563;
              margin-bottom: 20px;
              display: block;
            }
            .btn-primary {
              display: inline-block;
              background: #10b981;
              color: #ffffff !important;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 12px;
              font-weight: 600;
              font-size: 16px;
              transition: all 0.2s ease;
            }
            .btn-secondary {
              display: inline-block;
              color: #059669;
              text-decoration: none;
              font-weight: 600;
              font-size: 14px;
              margin-top: 20px;
            }
            .footer {
              padding: 40px;
              text-align: center;
              background-color: #f9fafb;
              border-top: 1px solid #f3f4f6;
            }
            .footer p {
              font-size: 14px;
              color: #6b7280;
              margin: 4px 0;
            }
            .social-links {
              margin-top: 24px;
            }
            @media (max-width: 600px) {
              .content { padding: 30px 20px; }
              .header { padding: 40px 20px; }
              .reservation-grid { grid-template-columns: 1fr; }
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <img src="${logoUrl}" alt="DineInGo" class="logo" />
                <h1>Reservation Confirmed!</h1>
                <p>We've reserved a table just for you.</p>
              </div>
              
              <div class="content">
                <div class="restaurant-hero">
                  <div class="restaurant-name">${bookingName}</div>
                  <p style="color: #6b7280; margin: 0;">We're excited to serve you soon!</p>
                </div>
                
                <div class="section-title">Reservation Details</div>
                <div class="reservation-grid">
                  <div class="detail-item">
                    <span class="detail-label">GUEST</span>
                    <span class="detail-value">${data.fullName || 'Guest'}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">PARTY SIZE</span>
                    <span class="detail-value">${data.guests} Guests</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">DATE</span>
                    <span class="detail-value">${data.date}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">TIME</span>
                    <span class="detail-value">${data.time}</span>
                  </div>
                </div>

                ${data.table || data.occasion ? `
                <div class="reservation-grid">
                  ${data.table ? `
                  <div class="detail-item">
                    <span class="detail-label">TABLE</span>
                    <span class="detail-value">${data.table}</span>
                  </div>
                  ` : ''}
                  ${data.occasion ? `
                  <div class="detail-item">
                    <span class="detail-label">OCCASION</span>
                    <span class="detail-value">${data.occasion}</span>
                  </div>
                  ` : ''}
                </div>
                ` : ''}

                ${data.specialRequest ? `
                <div class="detail-item" style="margin-bottom: 32px; width: 100%; box-sizing: border-box;">
                  <span class="detail-label">SPECIAL REQUEST</span>
                  <span class="detail-value">${data.specialRequest}</span>
                </div>
                ` : ''}

                <div class="location-card">
                  <div class="map-preview">
                    <!-- This div serves as the map background -->
                    <div class="map-fallback">
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                    </div>
                  </div>
                  <div class="location-info">
                    <div class="section-title" style="margin-bottom: 8px;">Location</div>
                    <span class="address-text">${data.address || 'Location details available on dashboard'}</span>
                    ${data.address ? `
                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.address)}" class="btn-primary">
                      Get Directions
                    </a>
                    ` : ''}
                  </div>
                </div>

                <div style="text-align: center; margin-top: 48px;">
                  <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard" class="btn-secondary">
                    Manage your reservation on the App →
                  </a>
                </div>
              </div>
              
              <div class="footer">
                <p><strong>Need to make changes?</strong></p>
                <p>Contact us at support@dineingo.com or call +91-9876543210</p>
                <p style="margin-top: 24px; font-size: 12px; opacity: 0.6;">
                  This is an automated email confirmating your booking at ${bookingName}.<br>
                  Please arrive 5-10 minutes before your scheduled time.
                </p>
              </div>
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
