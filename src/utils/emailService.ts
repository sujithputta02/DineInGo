import axios from 'axios';
import { API_CONFIG } from '../config/api';

/**
 * Service to handle email communications via backend or fallback
 */
export const emailService = {
  /**
   * Send reservation invoice to user
   */
  async sendInvoice(invoiceData: {
    to: string;
    userName: string;
    bookingId: string;
    amount: number;
    items: any[];
    restaurantName: string;
    date: string;
  }) {
    try {
      console.log('Attempting to send invoice email via backend:', invoiceData.bookingId);
      
      // Try to send via our backend first
      // This is the preferred method as it uses our primary email infrastructure
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/send-email/send-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      if (response.ok) {
        return await response.json();
      }
      
      const errorData = await response.json().catch(() => ({}));
      console.warn('Backend email failed, attempting fallback:', errorData.message);
      
      // Fallback: Try to send via Firebase Functions if backend is not available
      try {
        console.log('Attempting to send email via Firebase Functions...');
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions();
        const sendEmailFunction = httpsCallable(functions, 'sendInvoiceEmail');
        
        const result = await sendEmailFunction(invoiceData);
        return result.data;
      } catch (fallbackError) {
        console.error('All email methods failed:', fallbackError);
        throw new Error('Could not send email. Please try again later.');
      }
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  },

  /**
   * Send a general email
   */
  async sendEmail(emailData: {
    to: string;
    subject: string;
    html: string;
    attachments?: any[];
  }): Promise<boolean> {
    try {
      console.log('Sending email to:', emailData.to);
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      return response.ok;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  },

  /**
   * Generate HTML for invoice email
   */
  generateInvoiceEmailHTML(invoice: any, booking: any): string {
    return `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Order Confirmation - ${invoice.restaurantName || invoice.eventName}</h2>
        <p>Hi ${invoice.customerName},</p>
        <p>Thank you for booking with DineInGo! Your reservation is confirmed.</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <p><strong>Booking ID:</strong> ${invoice.bookingId}</p>
          <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> ${booking.time}</p>
          <p><strong>Total Amount:</strong> ₹${invoice.total}</p>
        </div>
        <p>Your wallet passes are attached to this email for easy access.</p>
        <p>Enjoy your meal!</p>
        <p>Best regards,<br/>The DineInGo Team</p>
      </div>
    `;
  }
};