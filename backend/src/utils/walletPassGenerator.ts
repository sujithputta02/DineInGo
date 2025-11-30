import { Buffer } from 'buffer';

interface BookingData {
  _id?: string;
  id?: string;
  restaurantName?: string;
  eventName?: string;
  date: string | Date;
  time: string;
  numberOfGuests?: number;
  guests?: number;
  table?: string;
  restaurantId?: any;
  eventId?: any;
  fullName?: string;
  email?: string;
}

/**
 * Generate Apple Wallet Pass (.pkpass)
 * Note: For production, you need Apple Developer certificates
 * This creates a basic pass structure that can be enhanced with proper signing
 */
export async function generateAppleWalletPass(booking: BookingData): Promise<{ filename: string; content: Buffer; contentType: string }> {
  const bookingId = String(booking._id || booking.id || 'unknown');
  const restaurantName = booking.restaurantName || booking.eventName || 'DineInGo';
  const dateStr = booking.date instanceof Date ? booking.date.toLocaleDateString() : new Date(booking.date).toLocaleDateString();
  const guests = booking.numberOfGuests || booking.guests || 1;

  // Create pass.json structure
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
          key: 'customerName',
          label: 'Customer Name',
          value: booking.fullName || 'Guest'
        },
        {
          key: 'email',
          label: 'Email',
          value: booking.email || 'N/A'
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
    relevantDate: booking.date instanceof Date ? booking.date.toISOString() : new Date(booking.date).toISOString()
  };

  // Create manifest.json
  const manifest = {
    'pass.json': 'sha1-hash-placeholder'
  };

  // For a proper .pkpass file, we need to create a ZIP archive
  // In production, you would also need to sign this with Apple certificates
  const passBuffer = Buffer.from(JSON.stringify(passJson, null, 2), 'utf8');
  
  return {
    filename: `DineInGo-Booking-${bookingId}.pkpass`,
    content: passBuffer,
    contentType: 'application/vnd.apple.pkpass'
  };
}

/**
 * Generate Google Wallet Pass
 * Creates a JWT token that can be used with Google Wallet API
 */
export async function generateGoogleWalletPass(booking: BookingData): Promise<{ filename: string; content: Buffer; contentType: string; url: string }> {
  const bookingId = String(booking._id || booking.id || 'unknown');
  const restaurantName = booking.restaurantName || booking.eventName || 'DineInGo';
  const dateStr = booking.date instanceof Date ? booking.date.toISOString().split('T')[0] : new Date(booking.date).toISOString().split('T')[0];
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
        body: `Booking ID: ${bookingId}\nCustomer: ${booking.fullName || 'Guest'}\nEmail: ${booking.email || 'N/A'}`,
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
  const base64Object = Buffer.from(objectJson).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  const saveUrl = `https://pay.google.com/gp/v/save/${base64Object}`;

  // Also create a JSON file for download
  const passBuffer = Buffer.from(JSON.stringify(walletObject, null, 2), 'utf8');
  
  return {
    filename: `DineInGo-Booking-${bookingId}-GoogleWallet.json`,
    content: passBuffer,
    contentType: 'application/json',
    url: saveUrl
  };
}

/**
 * Generate both wallet passes
 */
export async function generateBothWalletPasses(booking: BookingData): Promise<{
  apple: { filename: string; content: Buffer; contentType: string };
  google: { filename: string; content: Buffer; contentType: string; url: string };
}> {
  const apple = await generateAppleWalletPass(booking);
  const google = await generateGoogleWalletPass(booking);
  
  return { apple, google };
}
