const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Configure nodemailer with Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Store OTPs temporarily (in production, use a proper database)
const otpStore = new Map();

// Function to generate and store OTP
exports.sendOTPEmail = functions.https.onCall(async (data, context) => {
  const { email, otp } = data;
  
  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required');
  }

  try {
    // Store OTP with expiration (5 minutes)
    otpStore.set(email, {
      otp,
      expiry: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    // Send email with OTP
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your DineInGo Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10B981;">DineInGo Email Verification</h2>
          <p>Hello,</p>
          <p>Your verification code is:</p>
          <div style="background-color: #F3F4F6; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #10B981; margin: 0; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p>This code will expire in 5 minutes.</p>
          <p>If you didn't request this code, you can safely ignore this email.</p>
          <p>Best regards,<br>The DineInGo Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return { success: true, message: 'OTP email sent successfully' };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send OTP email');
  }
});

// Function to verify OTP
exports.verifyOTP = functions.https.onCall(async (data, context) => {
  const { email, otp } = data;
  
  if (!email || !otp) {
    throw new functions.https.HttpsError('invalid-argument', 'Email and OTP are required');
  }

  const storedData = otpStore.get(email);
  
  if (!storedData) {
    throw new functions.https.HttpsError('not-found', 'OTP expired or not found');
  }

  if (Date.now() > storedData.expiry) {
    otpStore.delete(email);
    throw new functions.https.HttpsError('deadline-exceeded', 'OTP has expired');
  }

  if (storedData.otp !== otp) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid OTP');
  }

  // Clear the OTP after successful verification
  otpStore.delete(email);
  
  return { valid: true };
});

// Test function to verify setup
exports.helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.json({message: "Hello from Firebase Functions!"});
});

// Example of a Firestore trigger function
exports.onUserCreated = functions.firestore
  .document('users/{userId}')
  .onCreate((snap, context) => {
    const newUser = snap.data();
    functions.logger.info('New user created:', newUser);
    return Promise.resolve();
  });

// Example of an Auth trigger function
exports.onUserSignUp = functions.auth
  .user()
  .onCreate((user) => {
    functions.logger.info('New user signed up:', user.email);
    return Promise.resolve();
  });

// Send invoice email with wallet integration
exports.sendInvoiceEmail = functions.https.onCall(async (data, context) => {
  const { to, subject, html } = data;
  
  if (!to || !subject || !html) {
    throw new functions.https.HttpsError('invalid-argument', 'to, subject, and html are required');
  }

  try {
    console.log('Sending invoice email to:', to);
    console.log('Email subject:', subject);

    const mailOptions = {
      from: `"DineInGo" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
      text: 'Please view this email in HTML format for the best experience with your digital wallet integration.'
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Invoice email sent successfully to:', to);
    console.log('Message ID:', info.messageId);
    
    return { 
      success: true, 
      message: 'Invoice email sent successfully',
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error sending invoice email:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send invoice email');
  }
});

// Send welcome email to new users
exports.sendWelcomeEmail = functions.auth.user().onCreate(async (user) => {
  const { email, displayName } = user;
  
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to DineInGo!',
      html: `
        <h1>Welcome to DineInGo, ${displayName || 'Valued Customer'}!</h1>
        <p>Thank you for joining our community. We're excited to have you on board!</p>
        <p>With DineInGo, you can:</p>
        <ul>
          <li>Discover great restaurants near you</li>
          <li>Save your favorite places</li>
          <li>Share your experiences</li>
          <li>And much more!</li>
        </ul>
        <p>Start exploring now!</p>
      `
    };

    await transporter.sendMail(mailOptions);
    functions.logger.info('Welcome email sent to:', email);
    return null;
  } catch (error) {
    functions.logger.error('Error sending welcome email:', error);
    return null;
  }
});

// Track user login history
exports.trackUserLogin = functions.analytics.event('login').onLog(async (event) => {
  const { user_id } = event;
  if (!user_id) return null;

  try {
    const userRef = admin.firestore().collection('users').doc(user_id);
    await userRef.update({
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
      loginCount: admin.firestore.FieldValue.increment(1)
    });
    return null;
  } catch (error) {
    functions.logger.error('Error tracking user login:', error);
    return null;
  }
});

// Clean up user data when account is deleted
exports.cleanupUserData = functions.auth.user().onDelete(async (user) => {
  const { uid } = user;
  
  try {
    // Delete user document
    await admin.firestore().collection('users').doc(uid).delete();
    
    // Delete user's favorites
    const favoritesRef = admin.firestore().collection('favorites').where('userId', '==', uid);
    const favoritesSnapshot = await favoritesRef.get();
    const deleteFavorites = favoritesSnapshot.docs.map(doc => doc.ref.delete());
    
    // Delete user's reviews
    const reviewsRef = admin.firestore().collection('reviews').where('userId', '==', uid);
    const reviewsSnapshot = await reviewsRef.get();
    const deleteReviews = reviewsSnapshot.docs.map(doc => doc.ref.delete());
    
    await Promise.all([...deleteFavorites, ...deleteReviews]);
    functions.logger.info('User data cleaned up for:', uid);
    return null;
  } catch (error) {
    functions.logger.error('Error cleaning up user data:', error);
    return null;
  }
});

// Set custom claims for user roles
exports.setUserRole = functions.https.onCall(async (data, context) => {
  // Ensure request is made by an authenticated admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  const adminUid = context.auth.uid;
  const adminDoc = await admin.firestore().collection('users').doc(adminUid).get();
  
  if (!adminDoc.exists || !adminDoc.data().isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Must be an admin');
  }

  const { uid, role } = data;
  if (!uid || !role) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing uid or role');
  }

  try {
    await admin.auth().setCustomUserClaims(uid, { role });
    await admin.firestore().collection('users').doc(uid).update({
      role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    functions.logger.error('Error setting user role:', error);
    throw new functions.https.HttpsError('internal', 'Error setting user role');
  }
}); 
