# 🚀 Quick Setup Guide - Wallet Passes in Email

## ✅ Current Status
- ✅ Backend server running on port 5000
- ✅ Frontend server running on port 5173
- ✅ Wallet pass generation working
- ✅ Email service configured
- ⚠️ **Need to configure Gmail credentials**

## 🔧 Step 1: Configure Gmail Email (Required)

### Create .env file in backend folder:

1. **Navigate to backend folder:**
   ```bash
   cd backend
   ```

2. **Create .env file with your Gmail credentials:**
   ```env
   EMAIL_USER=your-actual-gmail@gmail.com
   EMAIL_PASS=your-16-character-app-password
   PORT=5000
   ```

### Get Gmail App Password:

1. Go to: https://myaccount.google.com/
2. Enable **2-Factor Authentication** (if not already enabled)
3. Go to **Security** → **App passwords**
4. Select **Mail** and click **Generate**
5. Copy the 16-character password
6. Replace `your-16-character-app-password` in the .env file

## 🧪 Step 2: Test Email Functionality

### Option A: Use Test Button (Recommended)
1. Open your DineInGo app: http://localhost:5173
2. Go to Dashboard
3. Look for **"Email & Wallet Test"** button in the sidebar
4. Click **"Send Test Email with Wallet Passes"**
5. Check your email for the invoice with wallet attachments

### Option B: Test with Real Booking
1. Make a restaurant booking
2. Go to reservation confirmation page
3. Click **"Generate Invoice"** button
4. Check your email

## 📧 What You'll Receive

Once configured, you'll get emails containing:
- ✅ **Professional HTML Invoice** with booking details
- ✅ **Apple Wallet Pass** (.pkpass file) - Add to Apple Wallet
- ✅ **Google Wallet Pass** (JSON file) - Add to Google Wallet
- ✅ **QR Code** for easy check-in

## 🔍 Troubleshooting

### "Email service not configured" Error
- Make sure .env file exists in backend folder
- Check Gmail credentials are correct
- Restart backend server after creating .env

### "Authentication failed" Error
- Use App Password, not regular Gmail password
- Ensure 2FA is enabled on Gmail
- Check the 16-character password is correct

### No Email Received
- Check spam/junk folder
- Verify email address is correct
- Check browser console for errors

### Firestore Error
- This is normal if you're not using Firebase
- The app will fall back to backend email service

## 🎯 Success Indicators

When working correctly, you should see:
- ✅ Console logs: "Email sent successfully"
- ✅ Toast notification: "Invoice generated and sent via email!"
- ✅ Email in your inbox with attachments
- ✅ Professional HTML formatting

## 📱 Adding to Digital Wallets

### Apple Wallet:
1. Download the .pkpass file from email
2. Open on iOS device
3. Tap "Add to Apple Wallet"

### Google Wallet:
1. Use the "Add to Google Wallet" button in the app
2. Or manually import the JSON data

## 🆘 Still Having Issues?

1. **Check Console Logs**: Open browser dev tools (F12) and look for errors
2. **Check Backend Logs**: Look at the terminal running the backend server
3. **Verify Email Setup**: Double-check your .env file and Gmail App Password
4. **Test Connection**: Try the test button in the dashboard

---

**Need Help?** Check the detailed `EMAIL_SETUP.md` file for more information. 