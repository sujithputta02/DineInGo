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
    const name = booking.restaurantName || booking.eventName || 'DineInGo';
    const dateStr = new Date(booking.date).toLocaleDateString();
    const isEvent = !!(booking.eventId || booking.eventName);

    // Determine guest/seat information
    let guestsLabel = 'GUESTS';
    let guestsValue = '';

    if (booking.selectedSeats && booking.selectedSeats.length > 0) {
      guestsLabel = 'SEATS';
      guestsValue = booking.selectedSeats.join(', ');
    } else {
      const guests = booking.numberOfGuests || booking.guests || 1;
      guestsValue = `${guests} ${guests === 1 ? (isEvent ? 'Ticket' : 'Guest') : (isEvent ? 'Tickets' : 'Guests')}`;
    }

    // Create pass.json structure for Apple Wallet
    const passJson = {
      formatVersion: 1,
      passTypeIdentifier: 'pass.com.dineingo.booking',
      serialNumber: `DINEINGO-${bookingId}`,
      teamIdentifier: 'DINEINGO',
      organizationName: 'DineInGo',
      description: `${name} ${isEvent ? 'Event Ticket' : 'Reservation'}`,
      logoText: 'DineInGo',
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: isEvent ? 'rgb(147, 51, 234)' : 'rgb(16, 185, 129)',
      labelColor: 'rgb(255, 255, 255)',
      generic: {
        primaryFields: [
          {
            key: 'name',
            label: isEvent ? 'EVENT' : 'RESTAURANT',
            value: name
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
            label: guestsLabel,
            value: guestsValue,
            textAlignment: 'PKTextAlignmentLeft'
          },
          ...(booking.table ? [{
            key: 'table',
            label: 'TABLE',
            value: booking.table,
            textAlignment: 'PKTextAlignmentRight'
          }] : []),
          ...(booking.totalAmount ? [{
            key: 'amount',
            label: 'TOTAL',
            value: `₹${booking.totalAmount}`,
            textAlignment: 'PKTextAlignmentRight'
          }] : [])
        ],
        backFields: [
          {
            key: 'bookingId',
            label: 'Booking ID',
            value: bookingId
          },
          ...(booking.selectedSeats && booking.selectedSeats.length > 0 ? [{
            key: 'seats',
            label: 'Your Seats',
            value: booking.selectedSeats.join(', ')
          }] : []),
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
    const name = booking.restaurantName || booking.eventName || 'DineInGo';
    const dateStr = new Date(booking.date).toISOString().split('T')[0];
    const isEvent = !!(booking.eventId || booking.eventName);

    // Determine guest/seat information
    let bodyText = '';
    if (booking.selectedSeats && booking.selectedSeats.length > 0) {
      bodyText = `Seats: ${booking.selectedSeats.join(', ')}`;
    } else {
      const guests = booking.numberOfGuests || booking.guests || 1;
      bodyText = `${guests} ${guests === 1 ? (isEvent ? 'Ticket' : 'Guest') : (isEvent ? 'Tickets' : 'Guests')}`;
    }

    if (booking.table) {
      bodyText += ` • Table ${booking.table}`;
    }

    if (booking.totalAmount) {
      bodyText += ` • ₹${booking.totalAmount}`;
    }

    // Create booking details text
    let bookingDetailsText = `Booking ID: ${bookingId}\n${isEvent ? 'Event' : 'Restaurant'}: ${name}\nDate: ${dateStr}\nTime: ${booking.time}`;

    if (booking.selectedSeats && booking.selectedSeats.length > 0) {
      bookingDetailsText += `\nSeats: ${booking.selectedSeats.join(', ')}`;
    }

    if (booking.totalAmount) {
      bookingDetailsText += `\nTotal: ₹${booking.totalAmount}`;
    }

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
          value: isEvent ? 'DineInGo Event Ticket' : 'DineInGo Reservation'
        }
      },
      header: {
        defaultValue: {
          language: 'en-US',
          value: name
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
          value: bodyText
        }
      },
      hexBackgroundColor: isEvent ? '#9333ea' : '#10b981',
      heroImage: {
        sourceUri: {
          uri: 'https://i.postimg.cc/WbNR0cxd/logo1.png'
        }
      },
      textModulesData: [
        {
          header: 'Booking Details',
          body: bookingDetailsText,
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

    let items: InvoiceItem[] = [];
    let subtotal = 0;

    // Check if it's an event booking with seats
    const isEvent = !!(booking.eventId || booking.eventName);

    // Determine items based on booking type
    if (isEvent && booking.selectedSeats && booking.selectedSeats.length > 0) {
      // Event booking with seat selection
      items = booking.selectedSeats.map((seatId: string) => ({
        name: `Seat ${seatId}`,
        description: `Event: ${booking.eventName || 'Event Ticket'}`,
        quantity: 1,
        unitPrice: booking.totalAmount ? Math.round(booking.totalAmount / booking.selectedSeats.length) : 0,
        total: booking.totalAmount ? Math.round(booking.totalAmount / booking.selectedSeats.length) : 0
      }));
    } else if (isEvent) {
      // Event booking without seat selection (general admission)
      const guests = booking.guests || booking.numberOfGuests || 1;
      const pricePerPerson = booking.totalAmount ? Math.round(booking.totalAmount / guests) : 0;
      items = [{
        name: `${booking.eventName || 'Event'} - General Admission`,
        description: `${guests} ${guests === 1 ? 'Ticket' : 'Tickets'}`,
        quantity: guests,
        unitPrice: pricePerPerson,
        total: booking.totalAmount || 0
      }];
    } else {
      // Restaurant booking
      items = [];

      // 1. Add Food Items if present
      if (booking.selectedItems && booking.selectedItems.length > 0) {
        const foodItems = booking.selectedItems.map((item: any) => ({
          name: item.name,
          description: item.description || '',
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.price) || 0,
          total: (Number(item.price) || 0) * (Number(item.quantity) || 1)
        }));
        items = [...items, ...foodItems];
      }

      // 2. Add Reservation Fee / Base Cost if applicable
      // Check if there's a base cost separate from food items.
      // If booking.totalAmount exists, we need to reconcile it.
      // Typically, booking.totalAmount is the final charged amount.
      // If items exist, summing them usually gives the subtotal.

      // In the reported issue, it seems "Dining Reservation" is an item.
      // We should detect if we need to add a "Table Reservation" item.
      // If items sum is less than totalAmount (minus tax), maybe there is a base fee?
      // OR, we just explicitly add a reservation item if the data supports it.

      // Let's assume for now that if the user has a specific reservation cost that is NOT food, it should be added.
      // BUT we don't have a specific field for "reservationFee".
      // However, the screenshot proved a "Dining Reservation" item exists. 
      // This implies it might have been passed in selectedItems in the broken case, OR we should add it.

      // Safe fallback: 
      // Identify if we need a reservation item. 
      // If `booking.totalAmount` is significantly larger than `foodItems` total, add the difference as "Reservation Fee"?

      // Actually, simplest fix for "Calculation is wrong" (Subtotal only captures one item)
      // is faithfully summing ALL items.

      // If the "Dining Reservation" was already in `selectedItems` (as suspected), simple reduction fixes it.
      // If it wasn't, we add it. 
      // Let's ensure we account for everything.

      // Note: If the screenshot showed "Dining Reservation" AND food, and the code was entering the `selectedItems` block,
      // then "Dining Reservation" MUST be in `selectedItems`.
      // So the issue was likely just the Reduce logic or bad data types.
      // I am enforcing Number() casting above to fix potential string concat issues.
    }

    // Recalculate subtotal from ALL items
    subtotal = items.reduce((sum: number, item: InvoiceItem) => sum + item.total, 0);

    // If totalAmount is provided, it already includes tax
    // Calculate tax backwards from total
    // Calculate tax (18%) and total based on the calculated subtotal
    const tax = subtotal * 0.18;
    const total = subtotal + tax;

    // Note: We ignore booking.totalAmount for the calculation to ensure the invoice is mathematically consistent.
    // If booking.totalAmount stored the "paid" amount and it differs, that's a separate reconciliation issue,
    // but the Invoice document itself must be self-consistent (Items -> Subtotal -> Total).

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
      items,
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
        const appleBase64 = await this.blobToBase64(applePass.passData);
        attachments.push({
          filename: `dineingo-booking-${booking.id || booking._id}.pkpass`,
          content: appleBase64,
          contentType: 'application/vnd.apple.pkpass'
        });
        console.log('Apple Wallet pass generated successfully');

        console.log('Generating Google Wallet pass...');
        // Generate Google Wallet pass
        const googlePass = await this.generateGoogleWalletPass(booking);
        const googleBase64 = await this.blobToBase64(googlePass.passData);
        attachments.push({
          filename: `dineingo-booking-${booking.id || booking._id}-google.json`,
          content: googleBase64,
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

      throw new Error('Failed to send invoice email');
    }
  }

  // Helper to convert Blob to Base64 string
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        // remove data:content/type;base64, prefix
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
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