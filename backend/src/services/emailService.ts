import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';

interface ReviewEmailData {
  to: string;
  userName: string;
  businessName: string;
  rating?: number;
  comment?: string;
  replyText?: string;
}

let transporterInstance: any = null;

export const createTransporter = () => {
  if (transporterInstance) return transporterInstance;

  const brevoKey = process.env.BREVO_API_KEY?.trim();
  const brevoUser = process.env.BREVO_SMTP_USER?.trim();
  const gmailUser = process.env.EMAIL_USER?.trim();
  const gmailPass = process.env.EMAIL_PASS?.trim();

  // Primary: Brevo SMTP (User requested to keep this service)
  if (brevoKey && brevoUser) {
    console.log(`[EmailService] Initializing Brevo SMTP (User: ${brevoUser})`);
    transporterInstance = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 2525, // Using port 2525 as an alternative to 587/465 to bypass potential blocks
      secure: false, 
      auth: {
        user: brevoUser,
        pass: brevoKey,
      },
      // Debugging
      logger: true,
      debug: true,
      // Optimization: Pooled connections
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      connectionTimeout: 10000, 
      greetingTimeout: 10000,
      tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false
      }
    });
    
    // Verify connection immediately
    transporterInstance.verify((error: any) => {
      if (error) {
        console.error('[EmailService] Brevo SMTP Connection Error:', error);
        // If Brevo fails and we have Gmail, we could fallback, 
        // but user specifically asked for Brevo service.
      } else {
        console.log('[EmailService] Brevo SMTP Server is ready');
      }
    });

    return transporterInstance;
  }

  // Fallback: Gmail SMTP
  if (gmailUser && gmailPass) {
    const cleanPass = gmailPass.trim().replace(/\s/g, '');
    console.warn(`[EmailService] Falling back to Gmail SMTP (User: ${gmailUser})`);
    transporterInstance = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser.trim(),
        pass: cleanPass,
      },
    });
    return transporterInstance;
  }

  console.error('[EmailService] CRITICAL: No email providers configured (BREVO_API_KEY or EMAIL_PASS missing)');
  return null;
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
   * Determine the correct sender address based on the active provider
   */
  getSender(name: string = "DineInGo"): string {
    // ALWAYS use the verified sender address to prevent Brevo/Gmail from blocking the email
    // This is the most common cause of the 500 error in production
    const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || "sec.dineingo.team@gmail.com";
    return `"${name}" <${senderEmail}>`;
  },

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
        from: this.getSender(),
        to: data.to,
        subject: `Start Rating: You reviewed ${data.businessName}`,
        html,
        attachments: [
          ...(fs.existsSync(logoPath) ? [{
            filename: 'logo.png',
            path: logoPath,
            cid: cidLogo
          }] : [])
        ]
      });

      console.log(`Review submission email sent to ${data.to}`);
      return true;
    } catch (error: any) {
      console.error(`Error sending review submission email to ${data.to}:`, error.message || error);
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
        from: this.getSender(),
        to: data.to,
        subject: `New Reply from ${data.businessName}`,
        html,
        attachments: [
          ...(fs.existsSync(logoPath) ? [{
            filename: 'logo.png',
            path: logoPath,
            cid: cidLogo
          }] : [])
        ]
      });

      console.log(`Reply notification email sent to ${data.to}`);
      return true;
    } catch (error: any) {
      console.error(`Error sending reply notification email to ${data.to}:`, error.message || error);
      return false;
    }
  },

  /**
   * Send email to business owner when a user submits a new review
   */
  async sendNewReviewAlertEmail(data: ReviewEmailData & { ownerName?: string }): Promise<boolean> {
    try {
      const transporter = createTransporter();
      if (!transporter) return false;

      const ratingNum = data.rating || 0;
      const starsHtml = '★'.repeat(ratingNum) + '☆'.repeat(5 - ratingNum);

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
            body { font-family: 'Outfit', sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
            .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 40px; text-align: center; color: white; }
            .content { padding: 40px; color: #1f2937; }
            .review-card { background: #f9fafb; padding: 24px; border-radius: 16px; border: 1px solid #e5e7eb; margin: 24px 0; border-left: 4px solid #10b981; }
            .stars { color: #facc15; font-size: 24px; margin-bottom: 8px; }
            .reviewer-badge { display: inline-block; background: #d1fae5; color: #065f46; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 99px; margin-bottom: 12px; }
            .btn { display: inline-block; background: #059669; color: white !important; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 20px; }
            .footer { padding: 30px; text-align: center; color: #6b7280; font-size: 14px; background: #f9fafb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="cid:${cidLogo}" alt="DineInGo" style="height: 48px; margin-bottom: 16px;">
              <h1 style="margin: 0; font-size: 26px;">⭐ New Review Received!</h1>
            </div>
            <div class="content">
              <h2 style="color: #1e293b; margin-top: 0;">Hi ${data.ownerName || 'there'},</h2>
              <p>A customer just left a review for <strong>${data.businessName}</strong>. Here's what they said:</p>
              <div class="review-card">
                <span class="reviewer-badge">📝 ${data.userName}</span>
                <div class="stars">${starsHtml}</div>
                <p style="margin: 0; font-style: italic; color: #374151;">"${data.comment}"</p>
              </div>
              <p>Responding to reviews builds trust with your customers. Log in to your dashboard to reply.</p>
              <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/business/dashboard" class="btn">Reply in Dashboard</a>
              <p style="margin-top: 30px;">Best regards,<br><strong>The DineInGo Team</strong></p>
            </div>
            <div class="footer">
              <p>© 2026 DineInGo. Growing great businesses, one review at a time.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: this.getSender(),
        to: data.to,
        subject: `New ${ratingNum}⭐ Review on ${data.businessName}`,
        html,
        attachments: [
          ...(fs.existsSync(logoPath) ? [{
            filename: 'logo.png',
            path: logoPath,
            cid: cidLogo
          }] : [])
        ]
      });

      console.log(`New review alert email sent to business owner at ${data.to}`);
      return true;
    } catch (error: any) {
      console.error(`Error sending new review alert email to ${data.to}:`, error.message || error);
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
        from: this.getSender(),
        to: email,
        subject: `Reservation Confirmed - ${bookingName}`,
        html: htmlBody,
        text: `Your reservation at ${bookingName} has been confirmed for ${data.date} at ${data.time} for ${data.guests} guests.`,
        attachments: [
          ...(fs.existsSync(logoPath) ? [{
            filename: 'logo.png',
            path: logoPath,
            cid: cidLogo
          }] : []),
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
        from: this.getSender(),
        to,
        subject: `${otp} is your ${title} code`,
        html,
        attachments: [
          ...(fs.existsSync(logoPath) ? [{
            filename: 'logo.png',
            path: logoPath,
            cid: cidLogo
          }] : [])
        ]
      });

      console.log(`OTP email (${type}) sent to ${to}`);
      return true;
    } catch (error: any) {
      console.error(`Error sending OTP email (${type}) to ${to}:`, error.message || error);
      return false;
    }
  },

  /**
   * Send premium welcome email to new users
   */
  async sendAdminOTPEmail(email: string, otp: string): Promise<boolean> {
    try {
      const transporter = createTransporter();
      if (!transporter) {
         console.warn('Cannot send admin OTP: No transporter available');
         return false;
      }

      // Verify connection before sending
      try {
        await transporter.verify();
        console.log('✓ SMTP connection verified for Admin OTP');
      } catch (verifyError) {
        console.error('✗ SMTP verification failed for Admin OTP:', verifyError);
        return false;
      }

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; border-radius: 24px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0; font-size: 32px;">DineInGo</h1>
            <p style="color: #64748b; margin: 5px 0; font-weight: 600;">Admin Portal Access</p>
          </div>
          
          <div style="background: white; border-radius: 16px; padding: 40px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h2 style="color: #1e293b; margin-bottom: 24px; font-size: 20px;">Your Admin Login OTP</h2>
            <div style="background: #f1f5f9; border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0;">
              <span style="font-size: 36px; font-weight: bold; color: #059669; letter-spacing: 12px; margin-left: 12px;">${otp}</span>
            </div>
            <p style="color: #64748b; margin: 24px 0; font-size: 16px;">This OTP is valid for <strong>10 minutes</strong> only.</p>
            <div style="background: #fffbeb; padding: 12px; border-radius: 8px; border: 1px solid #fef3c7;">
               <p style="color: #92400e; font-size: 13px; margin: 0;">If you didn't request this OTP, please secure your account immediately.</p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px;">
              This is an automated security message from DineInGo Admin Systems.<br>
              © 2026 DineInGo. All rights reserved.
            </p>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: this.getSender("DineInGo Admin"),
        to: email,
        subject: `${otp} is your Admin Portal OTP`,
        html
      });

      console.log(`✓ Admin OTP email sent successfully to ${email}`);
      return true;
    } catch (error) {
      console.error('✗ Error sending admin OTP email:', error);
      return false;
    }
  },

  /**
   * Send security alert for admin portal login
   */
  async sendAdminLoginNotificationEmail(email: string, loginTime: Date, ipAddress?: string, timezone?: string): Promise<boolean> {
    try {
      const transporter = createTransporter();
      if (!transporter) return false;

      const formattedDate = loginTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: timezone || 'Asia/Kolkata'
      });
      
      const formattedTime = loginTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
        timeZone: timezone || 'Asia/Kolkata'
      });

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc; border-radius: 24px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0; font-size: 32px;">DineInGo</h1>
            <p style="color: #64748b; margin: 5px 0; font-weight: 600;">Security Alert</p>
          </div>
          
          <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
              <h2 style="color: #92400e; font-size: 18px; margin: 0 0 8px 0;">New Admin Login Detected</h2>
              <p style="color: #78350f; font-size: 14px; margin: 0;">We noticed a new login to your admin account. If this was you, no action is needed.</p>
            </div>
            
            <div style="padding: 24px; background: #f1f5f9; border-radius: 12px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #64748b; font-size: 14px; padding: 8px 0;">Date:</td>
                  <td style="color: #1e293b; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-size: 14px; padding: 8px 0;">Time:</td>
                  <td style="color: #1e293b; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">${formattedTime}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-size: 14px; padding: 8px 0;">IP Address:</td>
                  <td style="color: #1e293b; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">${ipAddress || 'Unknown'}</td>
                </tr>
              </table>
            </div>

            <div style="background: #eff6ff; border: 1px solid #3b82f6; border-radius: 12px; padding: 20px;">
              <h3 style="color: #1e40af; font-size: 16px; margin: 0 0 12px 0;">Security Recommendation</h3>
              <p style="color: #1e3a8a; font-size: 14px; margin: 0; line-height: 1.5;">
                If you did not initiate this login, please <strong>change your password immediately</strong> and contact DineInGo technical support.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px;">
              © 2026 DineInGo Security Operations.<br>
              This is an automated security notification.
            </p>
          </div>
        </div>
      `;

      await transporter.sendMail({
        from: this.getSender("DineInGo Security"),
        to: email,
        subject: `🔐 Admin Login Alert: ${formattedTime}`,
        html
      });

      console.log(`✓ Admin login notification sent to ${email}`);
      return true;
    } catch (error) {
      console.error('✗ Error sending admin login notification:', error);
      return false;
    }
  },

  /**
   * Send premium welcome email to new users
   */
  async sendUserWelcomeEmail(to: string, name: string): Promise<boolean> {
    try {
      const transporter = createTransporter();
      if (!transporter) return false;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&display=swap');
            body { 
              font-family: 'Outfit', sans-serif; 
              background-color: #f8fafc; 
              margin: 0; 
              padding: 0; 
              -webkit-font-smoothing: antialiased;
            }
            .wrapper { width: 100%; background-color: #f8fafc; padding: 40px 0; }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background: #ffffff; 
              border-radius: 32px; 
              overflow: hidden; 
              box-shadow: 0 20px 50px rgba(0,0,0,0.05);
              border: 1px solid rgba(0,0,0,0.05);
            }
            .header { 
              background: linear-gradient(135deg, #059669 0%, #10b981 100%); 
              padding: 60px 40px; 
              text-align: center; 
              color: white; 
            }
            .content { padding: 50px 40px; text-align: center; color: #0f172a; }
            .tagline { 
              text-transform: uppercase; 
              letter-spacing: 0.3em; 
              font-size: 12px; 
              font-weight: 900; 
              color: #10b981; 
              margin-bottom: 16px; 
              display: block;
            }
            h1 { 
              font-size: 36px; 
              font-weight: 900; 
              margin: 0 0 24px 0; 
              line-height: 1.1; 
              letter-spacing: -0.04em; 
            }
            .highlight { font-style: italic; color: #10b981; }
            p { font-size: 18px; line-height: 1.6; color: #64748b; margin-bottom: 32px; }
            .btn { 
              display: inline-block; 
              background: #059669; 
              color: white !important; 
              padding: 20px 40px; 
              border-radius: 100px; 
              text-decoration: none; 
              font-weight: 900; 
              font-size: 16px;
              box-shadow: 0 10px 20px rgba(5, 150, 105, 0.2);
              transition: all 0.3s ease;
            }
            .footer { 
              padding: 40px; 
              text-align: center; 
              color: #94a3b8; 
              font-size: 14px; 
              background: #f8fafc;
              border-top: 1px solid #f1f5f9;
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <img src="cid:${cidLogo}" alt="DineInGo" style="height: 56px; margin-bottom: 24px;">
                <h1 style="color: white; margin: 0;">Welcome to the <br/><span style="opacity: 0.8;">Future of Dining.</span></h1>
              </div>
              <div class="content">
                <span class="tagline">The Feast Awaits</span>
                <h1>Hi ${name}, <br/>Ready to <span class="highlight">Explore?</span></h1>
                <p>We're thrilled to have you at DineInGo. Your journey to discovering perfect tables and exclusive events starts right here.</p>
                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/explore" class="btn">Discover Experiences</a>
              </div>
              <div class="footer">
                <p>© 2026 DineInGo. Elevating your experiences.</p>
                <p style="margin-top: 10px; font-size: 12px;">This email was sent because you created an account on DineInGo.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: this.getSender(),
        to,
        subject: `Welcome to DineInGo, ${name}! 🎉`,
        html,
        attachments: [
          ...(fs.existsSync(logoPath) ? [{
            filename: 'logo.png',
            path: logoPath,
            cid: cidLogo
          }] : [])
        ]
      });

      console.log(`User welcome email sent to ${to}`);
      return true;
    } catch (error: any) {
      console.error(`Error sending user welcome email to ${to}:`, error.message || error);
      return false;
    }
  },

  /**
   * Send premium welcome email to new business owners
   */
  async sendBusinessWelcomeEmail(to: string, name: string): Promise<boolean> {
    try {
      const transporter = createTransporter();
      if (!transporter) return false;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&display=swap');
            body { 
              font-family: 'Outfit', sans-serif; 
              background-color: #0f172a; 
              margin: 0; 
              padding: 0; 
              -webkit-font-smoothing: antialiased;
            }
            .wrapper { width: 100%; background-color: #0f172a; padding: 60px 0; }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background: #1e293b; 
              border-radius: 32px; 
              overflow: hidden; 
              box-shadow: 0 40px 100px rgba(0,0,0,0.5);
              border: 1px solid rgba(255,255,255,0.1);
            }
            .header { 
              background: linear-gradient(135deg, #059669 0%, #10b981 100%); 
              padding: 70px 40px; 
              text-align: center; 
              color: white; 
            }
            .content { padding: 60px 40px; text-align: center; color: #f8fafc; }
            .tagline { 
              text-transform: uppercase; 
              letter-spacing: 0.4em; 
              font-size: 12px; 
              font-weight: 900; 
              color: #10b981; 
              margin-bottom: 20px; 
              display: block;
            }
            h1 { 
              font-size: 38px; 
              font-weight: 900; 
              margin: 0 0 24px 0; 
              line-height: 1; 
              letter-spacing: -0.04em; 
              color: #ffffff;
            }
            .highlight { font-style: italic; color: #fbbf24; }
            p { font-size: 18px; line-height: 1.6; color: #94a3b8; margin-bottom: 40px; }
            .btn { 
              display: inline-block; 
              background: #ffffff; 
              color: #0f172a !important; 
              padding: 20px 45px; 
              border-radius: 100px; 
              text-decoration: none; 
              font-weight: 900; 
              font-size: 16px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            }
            .footer { 
              padding: 40px; 
              text-align: center; 
              color: #475569; 
              font-size: 13px; 
              background: #0f172a;
              border-top: 1px solid rgba(255,255,255,0.05);
            }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="container">
              <div class="header">
                <img src="cid:${cidLogo}" alt="DineInGo" style="height: 60px; margin-bottom: 24px; filter: brightness(0) invert(1);">
                <h1 style="color: white; margin: 0;">Partner with <br/><span style="color: #fbbf24;">Intelligence.</span></h1>
              </div>
              <div class="content">
                <span class="tagline">For Venue Partners</span>
                <h1>Hi ${name}, <br/>Let's scale your <span class="highlight">Success.</span></h1>
                <p>Welcome to the DineInGo Business family. You now have the tools to manage your floors in 3D, automate bookings, and grow your revenue like never before.</p>
                <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/business/dashboard" class="btn">Access Dashboard</a>
              </div>
              <div class="footer">
                <p>© 2026 DineInGo for Business. The OS for hospitality.</p>
                <p style="margin-top: 10px; opacity: 0.5;">This email was sent to confirm your partner registration.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from: this.getSender("DineInGo Business"),
        to,
        subject: `Welcome to DineInGo for Business, ${name}! 🚀`,
        html,
        attachments: [
          ...(fs.existsSync(logoPath) ? [{
            filename: 'logo.png',
            path: logoPath,
            cid: cidLogo
          }] : [])
        ]
      });

      console.log(`Business welcome email sent to ${to}`);
      return true;
    } catch (error: any) {
      console.error(`Error sending business welcome email to ${to}:`, error.message || error);
      return false;
    }
  },

  /**
   * Generate specialized HTML for waitlist broadcasts
   */
  generateWaitlistTemplate(content: string, type: 'user' | 'business', recipientEmail?: string): string {
    const isBusiness = type === 'business';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Extract name from email if not provided
    let displayName = 'there';
    if (recipientEmail) {
      const namePart = recipientEmail.split('@')[0];
      // Capitalize first letter and handle dots/underscores
      displayName = namePart.split(/[._]/)[0].charAt(0).toUpperCase() + namePart.split(/[._]/)[0].slice(1);
    }

    // Default Content if empty
    const defaultContent = isBusiness 
      ? "DineInGo is more than just a management tool—it's the Operating System for the modern hospitality industry. We're building the infrastructure you need to thrive in a digital-first world."
      : "We're crafting an experience where every meal is an adventure. From AI-powered discoveries to immersive AR menus, DineInGo is your gateway to the city's finest flavors.";

    const finalContent = content && content.trim() ? content : defaultContent;
    
    // Features List
    const userFeatures = [
      { icon: '🔍', title: 'Smart Discovery', desc: 'AI-powered recommendations tailored to your unique vibe.' },
      { icon: '🎟️', title: 'Exclusive Events', desc: 'VIP access to the city’s most anticipated dining experiences.' },
      { icon: '📱', title: 'AR Menu Tech', desc: 'See dishes in stunning 3D before you even place your order.' },
      { icon: '🏆', title: 'Dining Rewards', desc: 'Earn points and unlock rare achievements as you explore.' }
    ];

    const businessFeatures = [
      { icon: '📊', title: 'Advanced Analytics', desc: 'Real-time insights into your venue’s performance and guests.' },
      { icon: '🗓️', title: 'Seamless Bookings', desc: 'Effortless reservation management designed for busy teams.' },
      { icon: '🚀', title: 'Growth Engine', desc: 'Targeted marketing tools to skyrocket your ROI and loyalty.' },
      { icon: '🛠️', title: 'Full Portal Control', desc: 'Manage your menu, staff, and events from a single powerhouse.' }
    ];

    const features = isBusiness ? businessFeatures : userFeatures;
    
    // Branding
    const primaryColor = isBusiness ? '#0f172a' : '#059669'; // Slate-900 for Business, Emerald-600 for User
    const accentColor = isBusiness ? '#eab308' : '#10b981'; // Yellow-500 for Business, Emerald-500 for User
    const instagramLink = 'https://www.instagram.com/dineingo.web/';
    
    // Links
    const ctaLink = isBusiness ? `${frontendUrl}/business` : `${frontendUrl}/`;
    const ctaText = isBusiness ? 'Explore Business Portal' : 'Discover DineInGo';
    const tagline = isBusiness ? 'The Operating System for Modern Dining' : 'Your Personal Dining Concierge';
    const heroTitle = isBusiness ? 'Empower Your Business' : 'Welcome to DineInGo';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&display=swap');
          body { font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
          .wrapper { width: 100%; table-layout: fixed; background-color: #f8fafc; padding: 40px 0; }
          .main { background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; color: #1e293b; border-radius: 32px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08); }
          .header { background: linear-gradient(135deg, ${primaryColor} 0%, #1e293b 100%); padding: 60px 40px; text-align: center; }
          .logo-box { background: #10b981; width: 80px; height: 80px; border-radius: 20px; margin: 0 auto 24px auto; display: table; }
          .logo-img { width: 44px; padding-top: 18px; }
          .hero-text { color: #ffffff; font-size: 36px; font-weight: 900; margin: 0; line-height: 1.1; letter-spacing: -0.04em; }
          .content { padding: 50px 40px; background-color: #ffffff; }
          .tagline { display: block; color: ${accentColor}; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3em; font-size: 11px; margin-bottom: 24px; text-align: center; }
          .greeting { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 20px; }
          .body-text { font-size: 16px; line-height: 1.8; color: #475569; margin-bottom: 40px; }
          
          /* Feature Section */
          .features-container { background-color: #f1f5f9; border-radius: 24px; padding: 30px; margin-bottom: 40px; }
          .feature-item { margin-bottom: 24px; }
          .feature-item:last-child { margin-bottom: 0; }
          .feature-icon { font-size: 24px; display: table-cell; padding-right: 15px; vertical-align: top; }
          .feature-content { display: table-cell; vertical-align: top; }
          .feature-title { font-weight: 800; color: #0f172a; font-size: 15px; margin-bottom: 4px; }
          .feature-desc { color: #64748b; font-size: 13px; line-height: 1.5; }
          
          .cta-box { text-align: center; margin-top: 40px; }
          .cta-btn { display: inline-block; background: ${primaryColor}; color: #ffffff !important; padding: 22px 48px; border-radius: 100px; text-decoration: none; font-weight: 800; font-size: 15px; box-shadow: 0 15px 30px -5px ${primaryColor}4D; transition: transform 0.2s; }
          
          .footer { padding: 40px; text-align: center; background-color: #f8fafc; border-top: 1px solid #f1f5f9; }
          .footer-text { color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 0; font-weight: 500; }
          .social-links { margin-top: 24px; }
          .social-icon { display: inline-block; margin: 0 15px; color: ${primaryColor}; text-decoration: none; font-size: 13px; font-weight: 800; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <table class="main" cellpadding="0" cellspacing="0">
            <tr>
              <td class="header">
                <div class="logo-box">
                  <img src="cid:${cidLogo}" alt="DineInGo" class="logo-img">
                </div>
                <h1 class="hero-text">${heroTitle}</h1>
              </td>
            </tr>
            <tr>
              <td class="content">
                <span class="tagline">${tagline}</span>
                <div class="greeting">Hello ${displayName},</div>
                <div class="body-text">
                  ${finalContent.replace(/\n/g, '<br/>')}
                </div>
                
                <div class="features-container">
                  <div style="font-size: 13px; font-weight: 900; color: #94a3b8; text-transform: uppercase; margin-bottom: 20px; letter-spacing: 0.1em;">What to Expect</div>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    ${features.map(f => `
                      <tr>
                        <td class="feature-item">
                          <div style="display: table; width: 100%;">
                            <div class="feature-icon">${f.icon}</div>
                            <div class="feature-content">
                              <div class="feature-title">${f.title}</div>
                              <div class="feature-desc">${f.desc}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                      <tr><td height="16"></td></tr>
                    `).join('')}
                  </table>
                </div>

                <div class="cta-box">
                  <a href="${ctaLink}" class="cta-btn">${ctaText}</a>
                </div>
              </td>
            </tr>
            <tr>
              <td class="footer">
                <p class="footer-text">
                  © 2026 DineInGo Official. All rights reserved.<br>
                  You are receiving this because you joined the elite DineInGo waitlist.
                </p>
                <div class="social-links">
                  <a href="${instagramLink}" class="social-icon">Instagram</a>
                  <a href="${frontendUrl}" class="social-icon">Website</a>
                  <a href="${frontendUrl}/terms" class="social-icon">Terms & Privacy</a>
                </div>
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f1f5f9;">
                  <a href="mailto:sec.dineingo.team@gmail.com?subject=Unsubscribe%20${recipientEmail}" style="color: #94a3b8; font-size: 11px; text-decoration: underline; font-weight: 600;">Unsubscribe from this list</a>
                </div>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Send a broadcast email to multiple recipients with detailed result tracking
   */
  async sendBroadcastEmail(
    recipients: string[], 
    subject: string, 
    html: string, 
    type: 'user' | 'business' = 'user'
  ): Promise<Array<{ email: string, status: 'sent' | 'soft_bounce' | 'hard_bounce' | 'failed', error?: string }>> {
    const allResults: Array<{ email: string, status: 'sent' | 'soft_bounce' | 'hard_bounce' | 'failed', error?: string }> = [];

    const transporter = createTransporter();
    if (!transporter) {
      return recipients.map(email => ({ email, status: 'failed', error: 'Transporter creation failed' }));
    }

    const batchSize = 5;
    const provider = process.env.BREVO_API_KEY && process.env.BREVO_SMTP_USER ? 'Brevo' : 'Gmail Fallback';
    console.log(`[EmailService] Starting broadcast of ${recipients.length} emails via ${provider}`);

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      console.log(`[EmailService] Processing batch ${Math.floor(i/batchSize) + 1} (${batch.length} recipients)`);
      
      const batchResults = await Promise.all(
        batch.map(async (to) => {
          try {
            // Generate personalized template for each recipient
            const personalizedHtml = this.generateWaitlistTemplate(html, type, to);
            
            const mailOptions: any = {
              from: this.getSender("DineInGo Official"),
              to,
              subject,
              html: personalizedHtml,
              text: personalizedHtml.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
              headers: {
                'List-Unsubscribe': `<mailto:sec.dineingo.team@gmail.com?subject=Unsubscribe%20${to}>`,
                'X-Entity-Ref-ID': Buffer.from(to).toString('base64'),
                'X-Priority': '3', // Normal
                'X-Mailer': 'DineInGo-Broadcast-Engine-v1'
              }
            };

            if (fs.existsSync(logoPath)) {
              mailOptions.attachments = [{
                filename: 'logo.png',
                path: logoPath,
                cid: cidLogo
              }];
            }

            const info = await transporter.sendMail(mailOptions);
            console.log(`[EmailService] ✓ Successfully sent to ${to} (${info.messageId})`);
            return { email: to, status: 'sent' as const };
          } catch (err: any) {
            console.error(`[EmailService] ✗ Failed to send to ${to}:`, err.message);
            
            let status: 'soft_bounce' | 'hard_bounce' | 'failed' = 'failed';
            const errorMessage = err.message || 'Unknown error';

            // Detect bounce types from SMTP codes (if available)
            if (err.responseCode) {
              if (err.responseCode >= 400 && err.responseCode < 500) {
                status = 'soft_bounce';
              } else if (err.responseCode >= 500) {
                status = 'hard_bounce';
              }
            } else if (errorMessage.toLowerCase().includes('mailbox full') || errorMessage.toLowerCase().includes('rate limit')) {
              status = 'soft_bounce';
            } else if (errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('invalid recipient')) {
              status = 'hard_bounce';
            }

            return { email: to, status, error: errorMessage };
          }
        })
      );

      allResults.push(...batchResults);
    }

    return allResults;
  },

  /**
   * Send security alert email to the team
   */
  async sendSecurityAlert(subject: string, body: string): Promise<boolean> {
    const alertEmail = process.env.EMAIL_USER || 'sec.dineingo.team@gmail.com';
    
    try {
      const transporter = createTransporter();
      if (!transporter) return false;

      const mailOptions: any = {
        from: this.getSender("DineInGo Security"),
        to: alertEmail,
        subject: `🚨 DineInGo Security Alert: ${subject}`,
        html: `
          <div style="font-family:monospace;background:#111;color:#0f0;padding:20px;border-radius:8px;">
            <h2 style="color:#ff4444;">🚨 Security Alert — DineInGo</h2>
            <pre style="color:#eee;">${body}</pre>
            <hr style="border:1px solid #333;"/>
            <p style="color:#888;">This is an automated alert from DineInGo Security Monitor.<br/>Time (IST): ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);

      console.log('Security alert sent successfully');
      return true;
    } catch (error) {
      console.error('Failed to send security alert:', error);
      return false;
    }
  },

  /**
   * Send general/feedback email
   */
  async sendGeneralEmail(options: {
    to?: string;
    from?: string;
    subject?: string;
    html?: string;
    text?: string;
    message?: string;
  }): Promise<boolean> {
    try {
      const transporter = createTransporter();
      if (!transporter) return false;

      const recipient = options.to || process.env.EMAIL_USER;
      const emailSubject = options.subject || 'DineInGo Feedback/General Email';
      const emailHtml = options.html || `<pre>${options.message || 'No message provided.'}</pre>`;
      const emailText = options.text || options.message || 'No message provided.';

      // Determine sender based on provider
      const defaultSenderStr = this.getSender();

      await transporter.sendMail({
        from: options.from ? `${options.from}` : defaultSenderStr,
        to: recipient,
        subject: emailSubject,
        html: emailHtml,
        text: emailText
      });

      console.log('General/feedback email sent successfully to:', recipient);
      return true;
    } catch (error) {
      console.error('Error sending general email:', error);
      return false;
    }
  },

  /**
   * Send invoice email with attachments
   */
  async sendInvoiceEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: any[];
  }): Promise<boolean> {
    try {
      const transporter = createTransporter();
      if (!transporter) return false;

      const mailOptions: any = {
        from: this.getSender(),
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || 'Please view this email in HTML format for the best experience.'
      };

      if (options.attachments && Array.isArray(options.attachments)) {
        mailOptions.attachments = options.attachments.map((attachment: any) => ({
          filename: attachment.filename,
          content: typeof attachment.content === 'string' ? Buffer.from(attachment.content, 'base64') : attachment.content,
          contentType: attachment.contentType
        }));
      }

      await transporter.sendMail(mailOptions);
      console.log('Invoice email sent successfully to:', options.to);
      return true;
    } catch (error) {
      console.error('Error sending invoice email:', error);
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
      from: emailService.getSender(),
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
