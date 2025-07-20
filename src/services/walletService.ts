import { auth } from '../firebase';
import { emailService } from '../utils/emailService';

export interface WalletPass {
  id: string;
  type: 'restaurant' | 'event';
  title: string;
  description: string;
  location: string;
  date: string;
  time: string;
  guests?: number;
  totalAmount?: number;
  restaurantName?: string;
  eventName?: string;
  bookingId: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: string;
  expiresAt: string;
}

export interface Invoice {
  id: string;
  bookingId: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  restaurantName?: string;
  eventName?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'paid' | 'pending' | 'overdue';
  paymentMethod?: string;
  notes?: string;
}

export interface InvoiceItem {
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

class WalletService {
  // Generate Apple Wallet pass
  async generateAppleWalletPass(booking: any): Promise<{ passUrl: string; passData: Buffer }> {
    // Create a proper .pkpass file structure
    const passData = {
      formatVersion: 1,
      passTypeIdentifier: 'pass.com.dineingo.booking',
      serialNumber: `booking-${booking.id || booking._id}`,
      teamIdentifier: 'DINEINGO',
      organizationName: 'DineInGo',
      description: `${booking.restaurantName || booking.eventName} Booking`,
      generic: {
        primaryFields: [
          {
            key: 'event',
            label: 'BOOKING',
            value: booking.restaurantName || booking.eventName
          }
        ],
        secondaryFields: [
          {
            key: 'date',
            label: 'DATE',
            value: new Date(booking.date).toLocaleDateString()
          },
          {
            key: 'time',
            label: 'TIME',
            value: booking.time
          },
          {
            key: 'guests',
            label: 'GUESTS',
            value: booking.numberOfGuests || booking.guests
          }
        ]
      },
      barcodes: [
        {
          format: 'PKBarcodeFormatQR',
          message: JSON.stringify({
            bookingId: booking.id || booking._id,
            type: booking.restaurantId ? 'restaurant' : 'event',
            date: booking.date,
            time: booking.time
          }),
          messageEncoding: 'iso-8859-1'
        }
      ]
    };

    // Convert to Buffer for email attachment
    const passBuffer = Buffer.from(JSON.stringify(passData), 'utf8');
    const passUrl = `data:application/vnd.apple.pkpass;base64,${passBuffer.toString('base64')}`;
    
    return { passUrl, passData: passBuffer };
  }

  // Generate Google Wallet pass
  async generateGoogleWalletPass(booking: any): Promise<{ passUrl: string; passData: Buffer }> {
    const passData = {
      id: `booking-${booking.id || booking._id}`,
      issuerName: 'DineInGo',
      programName: 'Restaurant & Event Bookings',
      eventTicketObjects: [
        {
          id: 'event-ticket',
          eventName: {
            defaultValue: {
              language: 'en-US',
              value: booking.restaurantName || booking.eventName
            }
          },
          dateTime: {
            start: {
              date: booking.date
            }
          },
          venueName: {
            defaultValue: {
              language: 'en-US',
              value: booking.restaurantId?.address || booking.eventId?.location || 'Location TBD'
            }
          },
          seatInfo: {
            defaultValue: {
              language: 'en-US',
              value: `Guests: ${booking.numberOfGuests || booking.guests}`
            }
          }
        }
      ]
    };

    // Convert to Buffer for email attachment
    const passBuffer = Buffer.from(JSON.stringify(passData, null, 2), 'utf8');
    const passUrl = `https://pay.google.com/gp/v/save/${btoa(JSON.stringify(passData))}`;
    
    return { passUrl, passData: passBuffer };
  }

  // Generate invoice for booking
  async generateInvoice(booking: any): Promise<Invoice> {
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const user = auth.currentUser;
    
    const items = booking.selectedItems || [];
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.18;
    const total = subtotal + tax;

    return {
      id: `invoice-${Date.now()}`,
      bookingId: booking.id || booking._id,
      invoiceNumber,
      date: new Date().toISOString(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      customerName: user?.displayName || 'Guest',
      customerEmail: user?.email || '',
      customerPhone: booking.phoneNumber || '',
      restaurantName: booking.restaurantName,
      eventName: booking.eventName,
      items: items.map((item: any) => ({
        name: item.name,
        description: item.description || '',
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.price * item.quantity
      })),
      subtotal,
      tax,
      total,
      status: 'pending',
      notes: booking.specialRequest || ''
    };
  }

  // Send invoice via email
  async sendInvoiceEmail(invoice: Invoice, booking: any): Promise<boolean> {
    try {
      console.log('Starting to send invoice email...');
      console.log('Invoice details:', {
        customerEmail: invoice.customerEmail,
        restaurantName: invoice.restaurantName,
        total: invoice.total
      });
      
      const html = emailService.generateInvoiceEmailHTML(invoice, booking);
      
      // Generate wallet passes as attachments
      const attachments = [];
      
      try {
        console.log('Generating Apple Wallet pass...');
        // Generate Apple Wallet pass
        const applePass = await this.generateAppleWalletPass(booking);
        attachments.push({
          filename: `dineingo-booking-${booking.id || booking._id}.pkpass`,
          content: applePass.passData.toString('base64'),
          contentType: 'application/vnd.apple.pkpass'
        });
        console.log('Apple Wallet pass generated successfully');
        
        console.log('Generating Google Wallet pass...');
        // Generate Google Wallet pass
        const googlePass = await this.generateGoogleWalletPass(booking);
        attachments.push({
          filename: `dineingo-booking-${booking.id || booking._id}-google.json`,
          content: googlePass.passData.toString('base64'),
          contentType: 'application/json'
        });
        console.log('Google Wallet pass generated successfully');
        
        console.log(`Total attachments: ${attachments.length}`);
      } catch (walletError) {
        console.warn('Failed to generate wallet passes for email attachment:', walletError);
        // Continue without wallet attachments if they fail
      }
      
      const emailData = {
        to: invoice.customerEmail,
        subject: `Invoice for your booking at ${invoice.restaurantName || invoice.eventName}`,
        html: html,
        attachments: attachments
      };

      console.log('Sending email with attachments...');
      const success = await emailService.sendEmail(emailData);
      
      if (success) {
        console.log('Invoice email sent successfully to:', invoice.customerEmail);
        return true;
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      console.error('Error sending invoice email:', error);
      
      // Show user-friendly error message
      if (error instanceof Error && error.message.includes('Email service not configured')) {
        alert('Email service not configured. Please set up Gmail credentials in the backend .env file. Check EMAIL_SETUP.md for instructions.');
      } else {
        alert('Failed to send invoice email. Please try again or contact support.');
      }
      
      throw new Error('Failed to send invoice email');
    }
  }

  // Get all invoices for a user
  async getUserInvoices(): Promise<Invoice[]> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    return [
      {
        id: 'invoice-1',
        bookingId: 'booking-1',
        invoiceNumber: 'INV-2024-001',
        date: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        customerPhone: '+1234567890',
        restaurantName: 'Spice Garden',
        items: [
          {
            name: 'Butter Chicken',
            description: 'Tender chicken in rich curry',
            quantity: 2,
            unitPrice: 450,
            total: 900
          }
        ],
        subtotal: 900,
        tax: 162,
        total: 1062,
        status: 'paid'
      }
    ];
  }
}

export const walletService = new WalletService(); 