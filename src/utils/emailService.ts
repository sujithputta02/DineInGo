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
  }
};