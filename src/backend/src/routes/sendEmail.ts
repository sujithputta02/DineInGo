import express from 'express';
import { emailService } from '../services/emailService';


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
    
    // Add attachments if provided and convert to Buffer from base64 if necessary
    const processedAttachments = attachments && Array.isArray(attachments) 
      ? attachments.map((attachment: any) => ({
          ...attachment,
          content: typeof attachment.content === 'string' ? Buffer.from(attachment.content, 'base64') : attachment.content
        }))
      : undefined;

    // Send invoice email (non-blocking)
    emailService.sendInvoiceEmail({
      to,
      subject,
      html,
      text,
      attachments: processedAttachments
    }).catch(err => console.error('Error in /send-invoice non-blocking send:', err));

    res.json({
      success: true,
      message: 'Invoice email sending initiated'
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

      // Send reservation confirmation (non-blocking)
      emailService.sendReservationConfirmationEmail(formData).catch(err => 
        console.error('Error in reservation email non-blocking send:', err)
      );

      return res.json({
        success: true,
        message: 'Reservation email sending initiated'
      });
    }

    // Handle general/feedback emails
    const recipient = to || process.env.EMAIL_USER;
    console.log('Sending general/feedback email to:', recipient);

    // Send general email (non-blocking)
    emailService.sendGeneralEmail({
      to: recipient,
      from,
      subject,
      html,
      text,
      message
    }).catch(err => console.error('Error in general email non-blocking send:', err));

    res.json({
      success: true,
      message: 'Email sending initiated'
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