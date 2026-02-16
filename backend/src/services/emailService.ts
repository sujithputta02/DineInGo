import nodemailer from 'nodemailer';
import path from 'path';

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
  attachments?: any[];
}



const logoPath = path.join(__dirname, '../assets/logo.png');
const cidLogo = 'dineingo-logo';

export const emailService = {
  /**
   * Send email to user confirming their review submission
   */
  async sendReviewSubmissionEmail(data: ReviewEmailData): Promise<boolean> {
    try {
      const transporter = createTransporter();
      if (!transporter) return false;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
            body { font-family: 'Outfit', sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px; text-align: center; color: white; }
            .content { padding: 40px; color: #1f2937; }
            .rating-card { background: #f9fafb; padding: 24px; border-radius: 16px; border: 1px solid #f3f4f6; margin: 24px 0; }
            .stars { color: #facc15; font-size: 24px; margin-bottom: 8px; }
            .footer { padding: 30px; text-align: center; color: #6b7280; font-size: 14px; background: #f9fafb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="cid:${cidLogo}" alt="DineInGo" style="height: 48px; margin-bottom: 16px;">
              <h1 style="margin: 0; font-size: 28px;">Thanks for your review!</h1>
            </div>
            <div class="content">
              <h2 style="color: #059669; margin-top: 0;">Hi ${data.userName},</h2>
              <p>Thank you for taking the time to review <strong>${data.businessName}</strong>. Your feedback helps others make better dining choices!</p>
              
              <div class="rating-card">
                <div class="stars">${'★'.repeat(data.rating || 0)}</div>
                <p style="margin: 0; font-style: italic; color: #4b5563;">"${data.comment}"</p>
              </div>

              <p>Best regards,<br><strong>The DineInGo Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2026 DineInGo. Helping you find the best tastes.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: `"DineInGo" <${process.env.EMAIL_USER}>`,
        to: data.to,
        subject: `Start Rating: You reviewed ${data.businessName}`,
        html,
        attachments: [{
          filename: 'logo.png',
          path: logoPath,
          cid: cidLogo
        }]
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
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
            body { font-family: 'Outfit', sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px; text-align: center; color: white; }
            .content { padding: 40px; color: #1f2937; }
            .reply-box { background: #f0fdf4; padding: 24px; border-radius: 16px; border: 1px solid #d1fae5; margin: 24px 0; }
            .btn { display: inline-block; background: #10b981; color: white !important; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 20px; }
            .footer { padding: 30px; text-align: center; color: #6b7280; font-size: 14px; background: #f9fafb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="cid:${cidLogo}" alt="DineInGo" style="height: 48px; margin-bottom: 16px;">
              <h1 style="margin: 0; font-size: 28px;">New Reply to Your Review</h1>
            </div>
            <div class="content">
              <h2 style="color: #059669; margin-top: 0;">Hi ${data.userName},</h2>
              <p>The owner of <strong>${data.businessName}</strong> has just replied to your review.</p>
              
              <div class="reply-box">
                <p style="margin: 0 0 8px 0; font-weight: 600; color: #065f46;">Their Reply:</p>
                <p style="margin: 0; font-style: italic; color: #047857;">"${data.replyText}"</p>
              </div>

              <p>You can view the full conversation in your dashboard.</p>
              <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard" class="btn">View in Dashboard</a>

              <p style="margin-top: 30px;">Best regards,<br><strong>The DineInGo Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2026 DineInGo. Connecting food lovers everywhere.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: `"DineInGo" <${process.env.EMAIL_USER}>`,
        to: data.to,
        subject: `New Reply from ${data.businessName}`,
        html,
        attachments: [{
          filename: 'logo.png',
          path: logoPath,
          cid: cidLogo
        }]
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
              font-family: 'Outfit', sans-serif;
              line-height: 1.6;
              color: #1f2937;
              margin: 0;
              padding: 0;
              background-color: #f3f4f6;
            }
            .wrapper { width: 100%; background-color: #f3f4f6; padding-bottom: 40px; }
            .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
            .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 60px 40px; text-align: center; color: white; }
            .logo { height: 60px; margin-bottom: 24px; }
            .header h1 { margin: 0; font-size: 32px; font-weight: 700; }
            .content { padding: 40px; }
            .reservation-grid { display: block; width: 100%; margin-bottom: 32px; }
            .detail-row { display: table; width: 100%; border-bottom: 1px solid #f3f4f6; padding: 12px 0; }
            .detail-label { display: table-cell; font-size: 12px; font-weight: 600; color: #9ca3af; text-transform: uppercase; width: 40%; }
            .detail-value { display: table-cell; font-size: 16px; font-weight: 600; color: #111827; text-align: right; }
            .location-card { margin-top: 40px; background: #f9fafb; border-radius: 20px; border: 1px solid #e5e7eb; overflow: hidden; padding: 24px; text-align: center; }
            .btn-primary { display: inline-block; background: #10b981; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; margin-top: 16px; }
            .footer { padding: 40px; text-align: center; background-color: #f9fafb; border-top: 1px solid #f3f4f6; }
            .footer p { font-size: 13px; color: #6b7280; margin: 4px 0; }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <img src="cid:${cidLogo}" alt="DineInGo" class="logo" />
                <h1>Reservation Confirmed!</h1>
                <p style="margin: 8px 0 0 0; opacity: 0.9;">We've reserved a table just for you.</p>
              </div>
              
              <div class="content">
                <div style="text-align: center; margin-bottom: 32px;">
                  <div style="font-size: 24px; font-weight: 700; color: #059669;">${bookingName}</div>
                  <p style="color: #6b7280; margin: 4px 0 0 0;">We're excited to serve you soon!</p>
                </div>
                
                <div class="reservation-grid">
                  <div class="detail-row">
                    <span class="detail-label">GUEST</span>
                    <span class="detail-value">${data.fullName || 'Guest'}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">PARTY SIZE</span>
                    <span class="detail-value">${data.guests} Guests</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">DATE</span>
                    <span class="detail-value">${data.date}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">TIME</span>
                    <span class="detail-value">${data.time}</span>
                  </div>
                  ${data.table ? `
                  <div class="detail-row">
                    <span class="detail-label">TABLE</span>
                    <span class="detail-value">${data.table}</span>
                  </div>
                  ` : ''}
                </div>

                ${data.specialRequest ? `
                <div style="background: #fffbeb; padding: 16px; border-radius: 12px; border: 1px solid #fef3c7; margin-bottom: 32px;">
                  <span style="font-size: 12px; font-weight: 700; color: #d97706; display: block; margin-bottom: 4px; text-transform: uppercase;">Note / Special Request</span>
                  <span style="color: #92400e;">${data.specialRequest}</span>
                </div>
                ` : ''}

                <div class="location-card" style="background: #ffffff; padding: 0; border: 2px solid #f3f4f6; position: relative;">
                  <div style="background: #f0fdf4; height: 160px; display: flex; align-items: center; justify-content: center; border-bottom: 2px solid #f3f4f6; background-image: radial-gradient(#10b981 0.5px, #f0fdf4 0.5px); background-size: 10px 10px;">
                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.address || data.restaurantName)}" style="text-decoration: none; text-align: center;">
                      <div style="background: #10b981; color: white; padding: 8px 16px; border-radius: 99px; font-weight: 600; font-size: 13px; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.4);">📍 View Live Map</div>
                    </a>
                  </div>
                  <div style="padding: 24px;">
                    <div style="font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Meeting Point</div>
                    <div style="font-size: 16px; color: #1f2937; font-weight: 600; margin-bottom: 16px;">${data.address || 'Location details available on dashboard'}</div>
                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.address || data.restaurantName)}" class="btn-primary" style="margin-top: 0; width: 100%; box-sizing: border-box; text-align: center;">Get Precise Directions</a>
                  </div>
                </div>

                <div style="text-align: center; margin-top: 32px;">
                  <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard" style="color: #059669; text-decoration: none; font-weight: 600; font-size: 14px;">Manage in Dashboard →</a>
                </div>
              </div>
              
              <div class="footer">
                <p><strong>Need to make changes?</strong></p>
                <p>Contact support@dineingo.com or call +91-9876543210</p>
                <p style="margin-top: 24px; opacity: 0.6;">This is an automated confirmation for your booking at ${bookingName}.</p>
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
        text: `Your reservation at ${bookingName} has been confirmed for ${data.date} at ${data.time} for ${data.guests} guests.`,
        attachments: [
          {
            filename: 'logo.png',
            path: logoPath,
            cid: cidLogo
          },
          ...(data.attachments || [])
        ]
      };


      const info = await transporter.sendMail(mailOptions);
      console.log('Reservation confirmation email sent successfully to:', email);
      return true;
    } catch (error) {
      console.error('Error sending reservation confirmation email:', error);
      return false;
    }
  },
  async sendOTPEmail(to: string, otp: string, type: 'password-reset' | 'signup'): Promise<boolean> {
    try {
      const transporter = createTransporter();
      if (!transporter) return false;

      const title = type === 'password-reset' ? 'Password Reset' : 'Verify Your Email';
      const message = type === 'password-reset'
        ? 'We received a request to reset your password. Use the code below to continue.'
        : 'Thanks for signing up! Please use the code below to verify your email address.';

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
            body { font-family: 'Outfit', sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px; text-align: center; color: white; }
            .content { padding: 40px; text-align: center; color: #1f2937; }
            .otp-container { background: #f9fafb; border: 2px solid #10b981; border-radius: 16px; padding: 24px; margin: 24px 0; }
            .otp-code { font-size: 36px; font-weight: 700; color: #059669; letter-spacing: 8px; margin: 8px 0; }
            .footer { padding: 30px; text-align: center; color: #6b7280; font-size: 14px; background: #f9fafb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="cid:${cidLogo}" alt="DineInGo" style="height: 48px; margin-bottom: 16px;">
              <h1 style="margin: 0; font-size: 28px;">${title}</h1>
            </div>
            <div class="content">
              <p style="font-size: 16px; color: #4b5563;">${message}</p>
              <div class="otp-container">
                <div style="font-size: 12px; font-weight: 600; color: #9ca3af; text-transform: uppercase;">Verification Code</div>
                <div class="otp-code">${otp}</div>
                <div style="font-size: 12px; color: #9ca3af;">Valid for 10 minutes</div>
              </div>
              <p style="font-size: 14px; color: #9ca3af;">If you didn't request this, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2026 DineInGo. Secure and simple dining.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: `"DineInGo" <${process.env.EMAIL_USER}>`,
        to,
        subject: `${otp} is your ${title} code`,
        html,
        attachments: [{
          filename: 'logo.png',
          path: logoPath,
          cid: cidLogo
        }]
      });

      console.log(`OTP email (${type}) sent to ${to}`);
      return true;
    } catch (error) {
      console.error('Error sending OTP email:', error);
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
