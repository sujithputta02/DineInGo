# Email Setup for Wallet Passes

## Quick Setup Guide

To receive wallet passes in your email, you need to configure Gmail SMTP:

### 1. Create .env file in backend folder

Create a file called `.env` in the `backend` folder with this content:

```env
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
PORT=5000
```

### 2. Get Gmail App Password

1. Go to your Google Account settings: https://myaccount.google.com/
2. Enable 2-Factor Authentication if not already enabled
3. Go to "Security" → "App passwords"
4. Generate a new app password for "Mail"
5. Use this 16-character password as your `EMAIL_PASS`

### 3. Restart Backend Server

After creating the .env file, restart the backend server:

```bash
cd backend
npm run dev
```

### 4. Test Email Functionality

1. Go to your DineInGo dashboard
2. Find any booking
3. Click "Generate Invoice" or "Test Email Setup"
4. Check your email for the invoice with wallet pass attachments

## Troubleshooting

- **"Email service not configured"**: Make sure .env file exists in backend folder
- **"Authentication failed"**: Check your Gmail App Password is correct
- **No attachments**: Check browser console for any errors
- **Email not received**: Check spam folder

## What You'll Receive

Once configured, you'll receive emails with:
- Professional invoice PDF
- Apple Wallet pass (.pkpass file)
- Google Wallet pass (JSON file)

You can then add these to your respective digital wallets! 