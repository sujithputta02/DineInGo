// Email service for sending invoice emails using nodemailer
// This integrates with the existing backend email functionality

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export const emailService = {
  // Send email using the backend API
  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      console.log('Sending email via backend API:', {
        to: emailData.to,
        subject: emailData.subject,
        hasAttachments: !!emailData.attachments
      });

      // Send email through the backend API
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/send-email/send-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
          attachments: emailData.attachments
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('Email sent successfully via backend:', result);
      return true;
    } catch (error) {
      console.error('Failed to send email via backend:', error);
      
      // Fallback: Try to send via Firebase Functions if backend is not available
      try {
        console.log('Attempting to send email via Firebase Functions...');
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions();
        const sendEmailFunction = httpsCallable(functions, 'sendInvoiceEmail');
        
        const result = await sendEmailFunction({
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html
        });
        
        console.log('Email sent successfully via Firebase Functions:', result);
        return true;
      } catch (firebaseError) {
        console.error('Failed to send email via Firebase Functions:', firebaseError);
        
        // Final fallback: Show email content in console for development
        console.log('Email content (development fallback):', {
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html.substring(0, 200) + '...',
          attachments: emailData.attachments?.length || 0
        });
        
        // In development, you can also open the email in a new tab to preview
        if (process.env.NODE_ENV === 'development') {
          const emailWindow = window.open('', '_blank');
          if (emailWindow) {
            emailWindow.document.write(emailData.html);
            emailWindow.document.close();
            console.log('Email preview opened in new tab');
          }
        }
        
        return false;
      }
    }
  },

  // Generate invoice email HTML
  generateInvoiceEmailHTML(invoice: any, booking: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice - ${invoice.restaurantName || invoice.eventName}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
          }
          .header { 
            background: linear-gradient(135deg, #10b981, #059669); 
            color: white; 
            padding: 30px; 
            text-align: center; 
            border-radius: 10px 10px 0 0; 
          }
          .content { 
            background: #f9fafb; 
            padding: 30px; 
            border-radius: 0 0 10px 10px; 
          }
          .invoice-details { 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
          }
          .items-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
            background: white; 
            border-radius: 8px; 
            overflow: hidden; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
          }
          .items-table th, .items-table td { 
            padding: 12px; 
            border: 1px solid #e5e7eb; 
            text-align: left; 
          }
          .items-table th { 
            background: #f3f4f6; 
            font-weight: 600; 
          }
          .total { 
            font-weight: bold; 
            font-size: 18px; 
            text-align: right; 
            background: #f0fdf4; 
            padding: 15px; 
            border-radius: 8px; 
            margin-top: 20px; 
          }
          .wallet-buttons { 
            text-align: center; 
            margin: 30px 0; 
          }
          .wallet-btn { 
            display: inline-block; 
            padding: 12px 24px; 
            margin: 0 10px; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: 600; 
            transition: all 0.3s ease; 
          }
          .apple-wallet { 
            background: #000; 
            color: white; 
          }
          .apple-wallet:hover { 
            background: #333; 
            transform: translateY(-2px); 
          }
          .google-wallet { 
            background: #4285f4; 
            color: white; 
          }
          .google-wallet:hover { 
            background: #3367d6; 
            transform: translateY(-2px); 
          }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 1px solid #e5e7eb; 
            color: #6b7280; 
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">DineInGo</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your Digital Dining Experience</p>
        </div>
        
        <div class="content">
          <h2 style="color: #059669; margin-bottom: 20px;">Invoice Generated Successfully!</h2>
          
          <div class="invoice-details">
            <h3 style="margin-top: 0; color: #374151;">Invoice #${invoice.invoiceNumber}</h3>
            <p><strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString()}</p>
            <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
            <p><strong>Customer:</strong> ${invoice.customerName}</p>
            <p><strong>Email:</strong> ${invoice.customerEmail}</p>
            <p><strong>Phone:</strong> ${invoice.customerPhone}</p>
          </div>
          
          <h3 style="color: #374151;">Booking Details</h3>
          <div class="invoice-details">
            <p><strong>${invoice.eventName ? 'Event' : 'Restaurant'}:</strong> ${invoice.restaurantName || invoice.eventName}</p>
            <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${booking.time}</p>
            ${booking.selectedSeats && booking.selectedSeats.length > 0 ? `
              <p><strong>Selected Seats:</strong> ${booking.selectedSeats.join(', ')}</p>
              <p><strong>Total Seats:</strong> ${booking.selectedSeats.length}</p>
            ` : `
              <p><strong>${invoice.eventName ? 'Attendees' : 'Guests'}:</strong> ${booking.numberOfGuests || booking.guests || 1}</p>
            `}
            ${booking.table ? `<p><strong>Table:</strong> ${booking.table}</p>` : ''}
          </div>
          
          ${invoice.items && invoice.items.length > 0 ? `
            <h3 style="color: #374151;">Order Items</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items.map((item: any) => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>₹${item.unitPrice}</td>
                    <td>₹${item.total}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          ` : ''}
          
          <div class="total">
            <p style="margin: 5px 0;">Subtotal: ₹${invoice.subtotal}</p>
            <p style="margin: 5px 0;">Tax (18%): ₹${invoice.tax}</p>
            <p style="margin: 5px 0; font-size: 20px; color: #059669;">Total: ₹${invoice.total}</p>
          </div>
          
          <div class="wallet-buttons">
            <h3 style="color: #374151; margin-bottom: 15px;">Add to Your Digital Wallet</h3>
            <a href="#" class="wallet-btn apple-wallet">📱 Add to Apple Wallet</a>
            <a href="#" class="wallet-btn google-wallet">📱 Add to Google Wallet</a>
          </div>
          
          ${invoice.notes ? `
            <div class="invoice-details">
              <h4 style="margin-top: 0; color: #374151;">Special Requests</h4>
              <p style="margin: 0;">${invoice.notes}</p>
            </div>
          ` : ''}
          
          <div class="footer">
            <p>Thank you for choosing DineInGo!</p>
            <p style="font-size: 14px; margin-top: 10px;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}; 