import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

// Send invoice email
router.post('/send-invoice', async (req, res) => {
  const { to, subject, html, text, attachments } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({ 
      error: 'Missing required fields: to, subject, and html are required' 
    });
  }

  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email credentials not configured');
    return res.status(500).json({ 
      error: 'Email service not configured',
      details: 'EMAIL_USER and EMAIL_PASS environment variables are required'
    });
  }

  try {
    console.log('Sending invoice email to:', to);
    console.log('Email subject:', subject);
    console.log('Has attachments:', !!attachments);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions: any = {
      from: `"DineInGo" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
      text: text || 'Please view this email in HTML format for the best experience.'
    };

    // Add attachments if provided
    if (attachments && Array.isArray(attachments)) {
      mailOptions.attachments = attachments.map((attachment: any) => ({
        filename: attachment.filename,
        content: Buffer.from(attachment.content, 'base64'),
        contentType: attachment.contentType
      }));
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('Invoice email sent successfully to:', to);
    console.log('Message ID:', info.messageId);
    
    res.json({ 
      success: true, 
      message: 'Invoice email sent successfully',
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Error sending invoice email:', error);
    res.status(500).json({ 
      error: 'Failed to send invoice email',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Restaurant reservation email handler
router.post('/', async (req, res) => {
  const { to, subject, html, text, message, from, formData, type, restaurantId } = req.body;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email credentials not configured');
    return res.status(500).json({ 
      error: 'Email service not configured',
      details: 'EMAIL_USER and EMAIL_PASS environment variables are required'
    });
  }

  try {
    // Handle restaurant reservation emails
    if (type === 'reservation' && formData) {
      console.log('Sending restaurant reservation email to:', formData.email);
      
      const logoUrl = 'https://i.postimg.cc/KYpqtvPC/Dine-In-Go-Logo.png';
      const bookingName = formData.restaurantName || 'Restaurant';
      
      // Create HTML email template for restaurant reservation
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
                  <span class="detail-value">${formData.fullName || 'Guest'}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Date:</span>
                  <span class="detail-value">${formData.date}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Time:</span>
                  <span class="detail-value">${formData.time}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Number of Guests:</span>
                  <span class="detail-value">${formData.guests}</span>
                </div>
                
                ${formData.table ? `
                <div class="detail-row">
                  <span class="detail-label">Table:</span>
                  <span class="detail-value">${formData.table}</span>
                </div>
                ` : ''}
                
                ${formData.occasion ? `
                <div class="detail-row">
                  <span class="detail-label">Occasion:</span>
                  <span class="detail-value">${formData.occasion}</span>
                </div>
                ` : ''}
                
                ${formData.specialRequest ? `
                <div class="detail-row">
                  <span class="detail-label">Special Request:</span>
                  <span class="detail-value">${formData.specialRequest}</span>
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

      const mailOptions = {
        from: `"DineInGo" <${process.env.EMAIL_USER}>`,
        to: formData.email,
        subject: `Reservation Confirmed - ${bookingName}`,
        html: htmlBody,
        text: `Your reservation at ${bookingName} has been confirmed for ${formData.date} at ${formData.time} for ${formData.guests} guests.`
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('Restaurant reservation email sent successfully to:', formData.email);
      console.log('Message ID:', info.messageId);
      
      return res.json({ 
        success: true, 
        message: 'Reservation email sent successfully',
        messageId: info.messageId
      });
    }

    // Handle general/feedback emails
    const recipient = to || process.env.EMAIL_USER;
    const emailSubject = subject || 'DineInGo Feedback/General Email';
    const emailHtml = html || `<pre>${message || 'No message provided.'}</pre>`;
    const emailText = text || message || 'No message provided.';

    console.log('Sending general/feedback email to:', recipient);
    console.log('Email subject:', emailSubject);
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    
    const mailOptions: any = {
      from: from ? `${from}` : `"DineInGo" <${process.env.EMAIL_USER}>`,
      to: recipient,
      subject: emailSubject,
      html: emailHtml,
      text: emailText
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('General/feedback email sent successfully to:', recipient);
    console.log('Message ID:', info.messageId);
    
    res.json({ 
      success: true, 
      message: 'Email sent successfully',
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 