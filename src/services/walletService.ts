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
  async generateAppleWalletPass(booking: any): Promise<{ passUrl: string; passData: Blob }> {
    const bookingId = booking.id || booking._id;
    const restaurantName = booking.restaurantName || booking.eventName || 'DineInGo';
    const dateStr = new Date(booking.date).toLocaleDateString();
    const guests = booking.numberOfGuests || booking.guests || 1;

    // Create pass.json structure for Apple Wallet
    const passJson = {
      formatVersion: 1,
      passTypeIdentifier: 'pass.com.dineingo.booking',
      serialNumber: `DINEINGO-${bookingId}`,
      teamIdentifier: 'DINEINGO',
      organizationName: 'DineInGo',
      description: `${restaurantName} Reservation`,
      logoText: 'DineInGo',
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(16, 185, 129)',
      labelColor: 'rgb(255, 255, 255)',
      generic: {
        primaryFields: [
          {
            key: 'restaurant',
            label: 'RESTAURANT',
            value: restaurantName
          }
        ],
        secondaryFields: [
          {
            key: 'date',
            label: 'DATE',
            value: dateStr,
            textAlignment: 'PKTextAlignmentLeft'
          },
          {
            key: 'time',
            label: 'TIME',
            value: booking.time,
            textAlignment: 'PKTextAlignmentRight'
          }
        ],
        auxiliaryFields: [
          {
            key: 'guests',
            label: 'GUESTS',
            value: `${guests} ${guests === 1 ? 'Guest' : 'Guests'}`,
            textAlignment: 'PKTextAlignmentLeft'
          },
          ...(booking.table ? [{
            key: 'table',
            label: 'TABLE',
            value: booking.table,
            textAlignment: 'PKTextAlignmentRight'
          }] : [])
        ],
        backFields: [
          {
            key: 'bookingId',
            label: 'Booking ID',
            value: bookingId
          },
          {
            key: 'terms',
            label: 'Terms & Conditions',
            value: 'Please arrive 5 minutes before your reservation time. Cancellations must be made at least 2 hours in advance.'
          }
        ]
      },
      barcode: {
        message: `DINEINGO-${bookingId}`,
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1',
        altText: `Booking: ${bookingId}`
      },
      barcodes: [
        {
          message: `DINEINGO-${bookingId}`,
          format: 'PKBarcodeFormatQR',
          messageEncoding: 'iso-8859-1',
          altText: `Booking: ${bookingId}`
        }
      ],
      relevantDate: new Date(booking.date).toISOString()
    };

    // Convert to Blob for download
    const passBlob = new Blob([JSON.stringify(passJson, null, 2)], { type: 'application/vnd.apple.pkpass' });
    const passUrl = URL.createObjectURL(passBlob);
    
    return { passUrl, passData: passBlob };
  }

  // Generate Google Wallet pass
  async generateGoogleWalletPass(booking: any): Promise<{ passUrl: string; passData: Blob }> {
    const bookingId = booking.id || booking._id;
    const restaurantName = booking.restaurantName || booking.eventName || 'DineInGo';
    const dateStr = new Date(booking.date).toISOString().split('T')[0];
    const guests = booking.numberOfGuests || booking.guests || 1;

    // Create Google Wallet object
    const walletObject = {
      id: `3388000000022${bookingId.slice(-6)}`,
      classId: '3388000000022095071',
      state: 'ACTIVE',
      barcode: {
        type: 'QR_CODE',
        value: `DINEINGO-${bookingId}`,
        alternateText: `Booking: ${bookingId}`
      },
      cardTitle: {
        defaultValue: {
          language: 'en-US',
          value: 'DineInGo Reservation'
        }
      },
      header: {
        defaultValue: {
          language: 'en-US',
          value: restaurantName
        }
      },
      subheader: {
        defaultValue: {
          language: 'en-US',
          value: `${dateStr} at ${booking.time}`
        }
      },
      body: {
        defaultValue: {
          language: 'en-US',
          value: `${guests} ${guests === 1 ? 'Guest' : 'Guests'}${booking.table ? ` • Table ${booking.table}` : ''}`
        }
      },
      hexBackgroundColor: '#10b981',
      heroImage: {
        sourceUri: {
          uri: 'https://i.postimg.cc/WbNR0cxd/logo1.png'
        }
      },
      textModulesData: [
        {
          header: 'Booking Details',
          body: `Booking ID: ${bookingId}\nRestaurant: ${restaurantName}\nDate: ${dateStr}\nTime: ${booking.time}`,
          id: 'booking_details'
        },
        {
          header: 'Important Information',
          body: 'Please arrive 5 minutes before your reservation time. Cancellations must be made at least 2 hours in advance.',
          id: 'terms'
        }
      ],
      validTimeInterval: {
        start: {
          date: dateStr
        }
      }
    };

    // Create the save URL for Google Wallet
    const objectJson = JSON.stringify(walletObject);
    const base64Object = btoa(objectJson)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    const passUrl = `https://pay.google.com/gp/v/save/${base64Object}`;

    // Also create a Blob for download
    const passBlob = new Blob([JSON.stringify(walletObject, null, 2)], { type: 'application/json' });
    
    return { passUrl, passData: passBlob };
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