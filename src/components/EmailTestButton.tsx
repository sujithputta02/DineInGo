import React from 'react';
import { walletService } from '../services/walletService';

export default function EmailTestButton() {
  const handleTestEmail = async () => {
    try {
      console.log('Testing email functionality...');
      
      // Create a mock booking for testing
      const mockBooking = {
        id: 'test-booking-123',
        restaurantName: 'Test Restaurant',
        date: '2025-07-20',
        time: '7:00 PM',
        numberOfGuests: 2,
        selectedItems: [
          {
            name: 'Test Dish',
            description: 'A delicious test dish',
            quantity: 2,
            price: 500
          }
        ],
        phoneNumber: '+1234567890'
      };

      // Generate invoice
      const invoice = await walletService.generateInvoice(mockBooking);
      console.log('Generated invoice:', invoice);

      // Send email
      const success = await walletService.sendInvoiceEmail(invoice, mockBooking);
      
      if (success) {
        alert('Test email sent successfully! Check your email for the invoice with wallet passes.');
      } else {
        alert('Failed to send test email. Check console for details.');
      }
    } catch (error) {
      console.error('Test email error:', error);
      alert('Test email failed. Check console for error details.');
    }
  };

  return (
    <div className="p-4 bg-blue-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Email & Wallet Test</h3>
      <p className="text-sm text-gray-600 mb-4">
        Test the email functionality with wallet pass attachments.
      </p>
      <button
        onClick={handleTestEmail}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Send Test Email with Wallet Passes
      </button>
    </div>
  );
} 