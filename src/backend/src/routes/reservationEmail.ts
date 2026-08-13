import express from 'express';
import nodemailer from 'nodemailer';
import { emailService } from '../services/emailService';


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
    address?: string;
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

  try {
    console.log('Sending reservation confirmation email to:', to);
    console.log('Reservation details:', reservationDetails);

    const success = await emailService.sendReservationConfirmationEmail({
      ...reservationDetails,
      to
    });

    if (success) {
      console.log('Reservation confirmation email sent successfully to:', to);
      res.json({
        success: true,
        message: 'Reservation confirmation email sent successfully'
      });
    } else {
      throw new Error('Failed to send reservation confirmation email via unified service');
    }
  } catch (error) {
    console.error('Error sending reservation confirmation email:', error);
    res.status(500).json({
      error: 'Failed to send reservation confirmation email',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }

});

export default router; 