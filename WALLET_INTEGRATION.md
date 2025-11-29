# Wallet Integration Guide

## Overview
DineInGo now supports adding booking confirmations to both Apple Wallet and Google Wallet, making it easy for customers to access their reservations on their mobile devices.

## Features

### Apple Wallet Integration
- **Download .pkpass files** directly from the dashboard
- **QR Code** for easy check-in at the restaurant
- **Rich card design** with restaurant name, date, time, and guest count
- **Automatic notifications** when approaching reservation time (iOS feature)
- **Lock screen display** for easy access

### Google Wallet Integration
- **One-click save** to Google Wallet
- **QR Code** for restaurant check-in
- **Material Design** card with booking details
- **Automatic reminders** before reservation time
- **Works on Android devices**

## How It Works

### For Customers

#### Adding to Apple Wallet:
1. Go to your Dashboard
2. Find your booking
3. Click the "Apple" button
4. Download the .pkpass file
5. Open the file on your iPhone/iPad
6. Tap "Add" to add to Apple Wallet

#### Adding to Google Wallet:
1. Go to your Dashboard
2. Find your booking
3. Click the "Google" button
4. You'll be redirected to Google Wallet
5. Click "Save to Phone"
6. The pass is now in your Google Wallet app

### Email Integration
When a booking is confirmed, customers receive an email with:
- Booking confirmation details
- PDF invoice
- Apple Wallet pass (.pkpass file)
- Google Wallet pass 492731 (JSON file)

## Technical Implementation

### Frontend (React/TypeScript)

**Location:** `src/services/walletService.ts`

```typescript
// Generate Apple Wallet Pass
async generateAppleWalletPass(booking: any): Promise<{ passUrl: string; passData: Blob }>

// Generate Google Wallet Pass
async generateGoogleWalletPass(booking: any): Promise<{ passUrl: string; passData: Blob }>
```

### Backend (Node.js/Express)

**Location:** `backend/src/utils/walletPassGenerator.ts`

```typescript
// Generate Apple Wallet Pass
export async function generateAppleWalletPass(booking: BookingData)

// Generate Google Wallet Pass
export async function generateGoogleWalletPass(booking: BookingData)

// Generate both passes
export async function generateBothWalletPasses(booking: BookingData)
```

## Pass Structure

### Apple Wallet Pass (.pkpass)
```json
{
  "formatVersion": 1,
  "passTypeIdentifier": "pass.com.dineingo.booking",
  "serialNumber": "DINEINGO-{bookingId}",
  "organizationName": "DineInGo",
  "description": "{Restaurant Name} Reservation",
  "generic": {
    "primaryFields": [
      {
        "key": "restaurant",
        "label": "RESTAURANT",
        "value": "{Restaurant Name}"
      }
    ],
    "secondaryFields": [
      {
        "key": "date",
        "label": "DATE",
        "value": "{Date}"
      },
      {
        "key": "time",
        "label": "TIME",
        "value": "{Time}"
      }
    ],
    "auxiliaryFields": [
      {
        "key": "guests",
        "label": "GUESTS",
        "value": "{Number} Guests"
      },
      {
        "key": "table",
        "label": "TABLE",
        "value": "{Table Number}"
      }
    ]
  },
  "barcode": {
    "message": "DINEINGO-{bookingId}",
    "format": "PKBarcodeFormatQR",
    "messageEncoding": "iso-8859-1"
  }
}
```

### Google Wallet Pass
```json
{
  "id": "3388000000022{bookingId}",
  "classId": "3388000000022095071",
  "state": "ACTIVE",
  "barcode": {
    "type": "QR_CODE",
    "value": "DINEINGO-{bookingId}"
  },
  "cardTitle": {
    "defaultValue": {
      "language": "en-US",
      "value": "DineInGo Reservation"
    }
  },
  "header": {
    "defaultValue": {
      "language": "en-US",
      "value": "{Restaurant Name}"
    }
  },
  "subheader": {
    "defaultValue": {
      "language": "en-US",
      "value": "{Date} at {Time}"
    }
  },
  "body": {
    "defaultValue": {
      "language": "en-US",
      "value": "{Guests} Guests • Table {Table Number}"
    }
  }
}
```

## Production Considerations

### Apple Wallet
For production deployment, you'll need:
1. **Apple Developer Account** ($99/year)
2. **Pass Type ID** registered in Apple Developer Portal
3. **Certificate** for signing passes
4. **Private key** for pass signing

**Steps:**
1. Register a Pass Type ID in Apple Developer Portal
2. Create a Pass Type ID Certificate
3. Download and install the certificate
4. Update `passTypeIdentifier` and `teamIdentifier` in the code
5. Implement pass signing using the certificate

### Google Wallet
For production deployment, you'll need:
1. **Google Cloud Project**
2. **Google Wallet API** enabled
3. **Service Account** with Google Wallet API permissions
4. **Class ID** created in Google Wallet Console

**Steps:**
1. Create a Google Cloud Project
2. Enable Google Wallet API
3. Create a service account and download credentials
4. Create a Generic Pass Class in Google Wallet Console
5. Update `classId` in the code with your class ID
6. Implement JWT signing for pass creation

## Testing

### Apple Wallet Testing
- Test on physical iOS devices (iPhone/iPad)
- Use iOS Simulator for basic testing
- Verify QR code scanning works
- Check pass updates and notifications

### Google Wallet Testing
- Test on physical Android devices
- Use Android Emulator with Google Play Services
- Verify QR code scanning works
- Check pass updates and notifications

## Troubleshooting

### Apple Wallet Issues
**Problem:** Pass doesn't download
- **Solution:** Check file MIME type is `application/vnd.apple.pkpass`

**Problem:** Pass shows error when opening
- **Solution:** Verify JSON structure matches Apple's specification

**Problem:** Pass doesn't appear in Wallet
- **Solution:** Ensure all required fields are present

### Google Wallet Issues
**Problem:** "Save to Phone" button doesn't work
- **Solution:** Check the JWT token is properly formatted

**Problem:** Pass doesn't display correctly
- **Solution:** Verify all required fields in the pass object

**Problem:** QR code doesn't scan
- **Solution:** Ensure barcode value is properly formatted

## Future Enhancements

1. **Pass Updates:** Implement real-time pass updates when booking changes
2. **Location-based Notifications:** Show pass on lock screen when near restaurant
3. **Rich Media:** Add restaurant photos and logos to passes
4. **Multi-language Support:** Localize pass content
5. **Analytics:** Track pass usage and engagement
6. **Push Notifications:** Send updates about booking changes

## Resources

### Apple Wallet
- [Apple Wallet Developer Guide](https://developer.apple.com/wallet/)
- [PassKit Documentation](https://developer.apple.com/documentation/passkit)
- [Pass Design Guidelines](https://developer.apple.com/design/human-interface-guidelines/wallet)

### Google Wallet
- [Google Wallet API Documentation](https://developers.google.com/wallet)
- [Generic Pass Class Reference](https://developers.google.com/wallet/generic)
- [Google Wallet Console](https://pay.google.com/business/console)

## Support

For issues or questions about wallet integration:
- Check the documentation above
- Review the code in `src/services/walletService.ts` and `backend/src/utils/walletPassGenerator.ts`
- Test with sample bookings first
- Verify email attachments are working correctly
