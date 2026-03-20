import express from 'express';
import { createTransporter } from '../services/emailService';

const router = express.Router();

router.post('/test', async (req, res) => {
  const { to } = req.body;

  if (!to) {
    return res.status(400).json({ error: 'Recipient email "to" is required' });
  }

  console.log(`Starting email delivery test to: ${to}...`);

  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      return res.status(500).json({ 
        error: 'Transporter creation failed. Check if BREVO_API_KEY or EMAIL_USER are set in Environment Variables.' 
      });
    }

    // Verify connection configuration
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('SMTP connection verified successfully!');

    const sender = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER;

    const mailOptions = {
      from: `"DineInGo Test" <${sender}>`,
      to,
      subject: 'DineInGo System Diagnosis: Test Email',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #10b981; border-radius: 10px;">
          <h2 style="color: #10b981;">DineInGo Diagnostics</h2>
          <p>This is a test email triggered from the <strong>Production Server</strong> diagnostic tool.</p>
          <p>If you received this, your SMTP configuration is 100% Correct!</p>
          <hr/>
          <p style="font-size: 12px; color: #666;">Generated at: ${new Date().toISOString()}</p>
        </div>
      `
    };

    console.log('Attempting to send mail...');
    const info = await transporter.sendMail(mailOptions);
    console.log('Mail sent successfully:', info.messageId);

    res.json({
      success: true,
      messageId: info.messageId,
      response: info.response,
      envelope: info.envelope,
      provider: process.env.BREVO_API_KEY ? 'Brevo' : 'Gmail'
    });

  } catch (error: any) {
    console.error('DIAGNOSTIC ERROR:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack
    });
  }
});

export default router;
