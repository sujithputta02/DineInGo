import { Buffer } from 'buffer';

export async function generateAppleWalletPass(booking: any): Promise<{ filename: string; content: Buffer; contentType: string }> {
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
  const passBuffer = Buffer.from(JSON.stringify(passData), 'utf8');
  return {
    filename: `dineingo-booking-${booking.id || booking._id}.pkpass`,
    content: passBuffer,
    contentType: 'application/vnd.apple.pkpass'
  };
}

export async function generateGoogleWalletPass(booking: any): Promise<{ filename: string; content: Buffer; contentType: string }> {
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
  const passBuffer = Buffer.from(JSON.stringify(passData, null, 2), 'utf8');
  return {
    filename: `dineingo-booking-${booking.id || booking._id}-google.json`,
    content: passBuffer,
    contentType: 'application/json'
  };
} 