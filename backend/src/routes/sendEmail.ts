import express from 'express';
import nodemailer from 'nodemailer';
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

      const success = await emailService.sendReservationConfirmationEmail(formData);

      if (success) {
        return res.json({
          success: true,
          message: 'Reservation email sent successfully'
        });
      } else {
        throw new Error('Failed to send reservation email via unified service');
      }
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