import { Request, Response } from 'express';
import { Admin, AdminOTP } from '../models/Admin';
import { User } from '../models/User';
import { Business } from '../models/Business';
import { Booking } from '../models/Booking';
import Notification from '../models/Notification';
import UserNotification from '../models/UserNotification';
import BusinessNotification from '../models/BusinessNotification';
import AllUserNotification from '../models/AllUserNotification';
import NotificationStats from '../models/NotificationStats';
import { getSystemSettings } from '../models/SystemSettings';
import nodemailer from 'nodemailer';
import * as crypto from 'crypto';
import { generateAdminToken } from '../middleware/adminAuth';

// Email configuration - create transporter lazily
let transporter: nodemailer.Transporter | null = null;

const getEmailTransporter = () => {
  if (transporter) {
    return transporter;
  }
  
  const emailUser = process.env.EMAIL_USER?.trim();
  const emailPass = process.env.EMAIL_PASS?.trim().replace(/\s/g, ''); // Remove any spaces and trim
  
  console.log('Initializing email transporter...');
  console.log('Email User:', emailUser);
  console.log('Email Pass length:', emailPass?.length || 0);
  console.log('Email Pass (first 4 chars):', emailPass?.substring(0, 4) || 'N/A');
  
  if (!emailUser || !emailPass) {
    console.warn('Email credentials not configured properly');
    return null;
  }
  
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
      user: emailUser,
      pass: emailPass
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    debug: false, // Disable debug in production
    logger: false // Disable logging in production
  });
  
  return transporter;
};

// Super admin email (DineInGo owner)
const SUPER_ADMIN_EMAIL = 'sujithputta02@gmail.com';

// Initialize super admin on first run
export const initializeSuperAdmin = async () => {
  try {
    console.log('Initializing super admin...');
    console.log('Super admin email:', SUPER_ADMIN_EMAIL);
    
    const existingSuperAdmin = await Admin.findOne({ email: SUPER_ADMIN_EMAIL });
    if (!existingSuperAdmin) {
      console.log('Creating super admin...');
      await Admin.create({
        email: SUPER_ADMIN_EMAIL,
        role: 'super_admin',
        isActive: true,
        addedBy: 'system'
      });
      console.log('Super admin initialized:', SUPER_ADMIN_EMAIL);
    } else {
      console.log('Super admin already exists:', SUPER_ADMIN_EMAIL);
    }
  } catch (error) {
    console.error('Error initializing super admin:', error);
  }
};

// Generate 6-digit OTP
const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

// Send OTP email
const sendOTPEmail = async (email: string, otp: string): Promise<boolean> => {
  try {
    console.log('Preparing to send email to:', email);
    
    // Get transporter (creates it if not exists)
    const emailTransporter = getEmailTransporter();
    
    // Check if email credentials are configured
    if (!emailTransporter) {
      console.log('=== EMAIL NOT CONFIGURED - OTP FOR TESTING ===');
      console.log('Email:', email);
      console.log('OTP:', otp);
      console.log('Use this OTP to login to the admin portal');
      console.log('==============================================');
      return true;
    }
    
    // Test the transporter connection first
    try {
      console.log('Testing SMTP connection...');
      await emailTransporter.verify();
      console.log('✓ SMTP connection verified successfully');
    } catch (verifyError: any) {
      console.error('✗ SMTP connection verification failed:', verifyError.message);
      console.error('Error code:', verifyError.code);
      
      // Fallback to console logging
      console.log('=== EMAIL CONNECTION FAILED - OTP FOR TESTING ===');
      console.log('Email:', email);
      console.log('OTP:', otp);
      console.log('Use this OTP to login to the admin portal');
      console.log('Error details:', verifyError.message);
      console.log('=================================================');
      return true;
    }
    
    const mailOptions = {
      from: `"DineInGo Admin" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'DineInGo Admin Portal - Login OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0;">DineInGo</h1>
            <p style="color: #64748b; margin: 5px 0;">Admin Portal Access</p>
          </div>
          
          <div style="background: #f8fafc; border-radius: 12px; padding: 30px; text-align: center;">
            <h2 style="color: #1e293b; margin-bottom: 20px;">Your Admin Login OTP</h2>
            <div style="background: white; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; color: #dc2626; letter-spacing: 8px;">${otp}</span>
            </div>
            <p style="color: #64748b; margin: 20px 0;">This OTP is valid for 10 minutes only.</p>
            <p style="color: #64748b; font-size: 14px;">If you didn't request this OTP, please ignore this email.</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px;">
              This is an automated message from DineInGo Admin Portal.<br>
              Please do not reply to this email.
            </p>
          </div>
        </div>
      `
    };

    console.log('Sending email...');
    const result = await emailTransporter.sendMail(mailOptions);
    console.log('✓ Email sent successfully!');
    console.log('Message ID:', result.messageId);
    return true;

  } catch (error: any) {
    console.error('✗ Error sending OTP email:', error.message);
    
    // Always fallback to console logging for testing
    console.log('=== EMAIL SEND FAILED - OTP FOR TESTING ===');
    console.log('Email:', email);
    console.log('OTP:', otp);
    console.log('Use this OTP to login to the admin portal');
    console.log('Error:', error.message);
    console.log('===========================================');
    
    return true; // Always return true so the system works
  }
};

// Request OTP for admin login
export const requestAdminOTP = async (req: Request, res: Response) => {
  try {
    console.log('Admin OTP request received:', req.body);
    const { email } = req.body;

    if (!email) {
      console.log('No email provided');
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    console.log('Looking for admin with email:', email.toLowerCase());

    // Check if email is a valid admin
    const admin = await Admin.findOne({ email: email.toLowerCase(), isActive: true });
    console.log('Admin found:', admin ? 'Yes' : 'No');
    
    if (!admin) {
      console.log('Admin not found or inactive');
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. You are not authorized as an admin.' 
      });
    }

    // Check if account is locked
    if (admin.lockUntil && admin.lockUntil > new Date()) {
      console.log('Admin account is locked');
      return res.status(423).json({ 
        success: false, 
        message: 'Account is temporarily locked due to multiple failed attempts. Please try again later.' 
      });
    }

    // Clear any old OTP records for this email first
    await AdminOTP.deleteMany({ email: email.toLowerCase() });
    console.log('Cleared old OTP records');

    // Check for recent OTP requests (rate limiting) - reduced to 1 minute
    const recentOTP = await AdminOTP.findOne({
      email: email.toLowerCase(),
      createdAt: { $gt: new Date(Date.now() - 1 * 60 * 1000) } // 1 minute
    });

    if (recentOTP) {
      console.log('Recent OTP found, rate limiting');
      return res.status(429).json({ 
        success: false, 
        message: 'Please wait 1 minute before requesting a new OTP.' 
      });
    }

    // Generate and save OTP
    const otp = generateOTP();
    console.log('Generated OTP:', otp);
    
    await AdminOTP.create({
      email: email.toLowerCase(),
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });
    console.log('OTP saved to database');

    // Send OTP email
    console.log('Attempting to send email...');
    const emailSent = await sendOTPEmail(email, otp);
    console.log('Email sent:', emailSent);
    
    // Always succeed in development or when email fails
    console.log('OTP request successful');
    res.json({ 
      success: true, 
      message: 'OTP sent successfully. Check your email or console logs for the OTP.'
    });

  } catch (error) {
    console.error('Error requesting admin OTP:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error: ' + (error as Error).message 
    });
  }
};

// Verify OTP and login
export const verifyAdminOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and OTP are required' 
      });
    }

    // Check if account is locked
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (admin && admin.lockUntil && admin.lockUntil > new Date()) {
      const minutesLeft = Math.ceil((admin.lockUntil.getTime() - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked due to too many failed attempts. Try again in ${minutesLeft} minutes.`,
        locked: true,
        lockUntil: admin.lockUntil
      });
    }

    // Find valid OTP
    const otpRecord = await AdminOTP.findOne({
      email: email.toLowerCase(),
      otp,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!otpRecord) {
      // Increment failed attempts for the admin
      if (admin) {
        admin.loginAttempts += 1;
        
        // Lock account after 5 failed attempts
        if (admin.loginAttempts >= 5) {
          admin.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
          await admin.save();
          
          // Log failed login attempt
          const { logFailedLogin } = await import('../middleware/adminAuditLog');
          const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || 'Unknown';
          await logFailedLogin(email.toLowerCase(), ipAddress, 'Account locked after 5 failed attempts');
          
          return res.status(423).json({
            success: false,
            message: 'Account locked due to too many failed attempts. Try again in 15 minutes.',
            locked: true,
            lockUntil: admin.lockUntil
          });
        }
        
        await admin.save();
        
        // Log failed login attempt
        const { logFailedLogin } = await import('../middleware/adminAuditLog');
        const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || 'Unknown';
        await logFailedLogin(email.toLowerCase(), ipAddress, `Invalid OTP (${admin.loginAttempts}/5 attempts)`);
      }

      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired OTP',
        attemptsRemaining: admin ? 5 - admin.loginAttempts : undefined
      });
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    // Update admin login info
    if (admin) {
      admin.lastLogin = new Date();
      admin.loginAttempts = 0; // Reset failed attempts
      admin.lockUntil = undefined; // Remove lock
      await admin.save();
    }

    // Generate JWT token (4 hours expiration)
    const token = generateAdminToken(admin!.email, admin!.role);

    // Send login notification email (non-blocking)
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'Unknown';
    sendLoginNotificationEmail(admin!.email, admin!.lastLogin!, ipAddress).catch(err => {
      console.error('Failed to send login notification:', err);
    });

    res.json({ 
      success: true, 
      message: 'Login successful',
      token,
      tokenExpiresIn: '4h',
      admin: {
        email: admin?.email,
        role: admin?.role,
        lastLogin: admin?.lastLogin
      }
    });

  } catch (error) {
    console.error('Error verifying admin OTP:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get all admins (only for super admin)
export const getAdmins = async (req: Request, res: Response) => {
  try {
    // Admin is already verified by middleware (verifySuperAdmin)
    // req.admin contains the authenticated admin's data
    
    const admins = await Admin.find({}, { 
      email: 1, 
      role: 1, 
      isActive: 1, 
      addedBy: 1, 
      createdAt: 1, 
      lastLogin: 1 
    }).sort({ createdAt: -1 });

    const settings = await getSystemSettings();

    res.json({ 
      success: true, 
      admins,
      totalCount: admins.length,
      maxAdmins: settings.maxAdmins
    });

  } catch (error) {
    console.error('Error getting admins:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Add new admin (only for super admin)
export const addAdmin = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    // Admin is already verified by middleware (verifySuperAdmin)
    // req.admin contains the authenticated super admin's data

    // Get max admins from settings
    const settings = await getSystemSettings();
    const MAX_ADMINS = settings.maxAdmins;

    // Check admin limit
    const currentAdminCount = await Admin.countDocuments({ isActive: true });
    if (currentAdminCount >= MAX_ADMINS) {
      return res.status(400).json({ 
        success: false, 
        message: `Maximum admin limit reached (${MAX_ADMINS}). Please remove an admin before adding a new one.` 
      });
    }

    // Check if email already exists
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: 'This email is already registered as an admin.' 
      });
    }

    // Create new admin
    const newAdmin = await Admin.create({
      email: email.toLowerCase(),
      role: 'admin',
      isActive: true,
      addedBy: req.admin!.email
    });

    // Send welcome email
    const welcomeEmailSent = await sendWelcomeEmail(email);

    res.json({ 
      success: true, 
      message: 'Admin added successfully',
      admin: {
        email: newAdmin.email,
        role: newAdmin.role,
        addedBy: newAdmin.addedBy,
        createdAt: newAdmin.createdAt
      },
      welcomeEmailSent
    });

  } catch (error) {
    console.error('Error adding admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Send login notification email to admin
const sendLoginNotificationEmail = async (email: string, loginTime: Date, ipAddress?: string): Promise<boolean> => {
  try {
    const emailTransporter = getEmailTransporter();
    
    if (!emailTransporter) {
      console.log('Email transporter not configured, skipping login notification');
      return false;
    }

    // Format date and time
    const formattedDate = loginTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const formattedTime = loginTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });

    // Get browser/device info from user agent (if available)
    const deviceInfo = ipAddress ? `IP Address: ${ipAddress}` : 'Device information not available';
    
    const mailOptions = {
      from: `"DineInGo Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Admin Portal Login Alert - DineInGo',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center; }
            .logo { color: #ffffff; font-size: 32px; font-weight: bold; margin: 0; }
            .subtitle { color: #d1fae5; font-size: 14px; margin: 5px 0 0 0; }
            .content { padding: 40px 30px; }
            .alert-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .alert-icon { font-size: 32px; margin-bottom: 10px; }
            .alert-title { color: #92400e; font-size: 18px; font-weight: bold; margin: 0 0 10px 0; }
            .alert-text { color: #78350f; font-size: 14px; line-height: 1.6; margin: 0; }
            .info-card { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
            .info-row:last-child { border-bottom: none; }
            .info-label { color: #64748b; font-size: 14px; font-weight: 600; }
            .info-value { color: #1e293b; font-size: 14px; font-weight: 500; text-align: right; }
            .security-tips { background: #eff6ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 20px; margin: 20px 0; }
            .security-title { color: #1e40af; font-size: 16px; font-weight: bold; margin: 0 0 15px 0; display: flex; align-items: center; }
            .security-title::before { content: '🛡️'; margin-right: 8px; font-size: 20px; }
            .security-list { margin: 0; padding-left: 20px; }
            .security-list li { color: #1e40af; font-size: 13px; line-height: 1.8; margin-bottom: 8px; }
            .action-button { display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0; }
            .footer-text { color: #64748b; font-size: 12px; line-height: 1.6; margin: 5px 0; }
            .divider { height: 1px; background: linear-gradient(to right, transparent, #e2e8f0, transparent); margin: 30px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div class="header">
              <h1 class="logo">DineInGo</h1>
              <p class="subtitle">Admin Portal Security Alert</p>
            </div>

            <!-- Content -->
            <div class="content">
              <!-- Alert Box -->
              <div class="alert-box">
                <div class="alert-icon">🔐</div>
                <h2 class="alert-title">Successful Admin Login Detected</h2>
                <p class="alert-text">
                  Your admin account was successfully accessed. If this was you, no action is needed. 
                  If you did not authorize this login, please take immediate action to secure your account.
                </p>
              </div>

              <!-- Login Details -->
              <div class="info-card">
                <div class="info-row">
                  <span class="info-label">📧 Account</span>
                  <span class="info-value">${email}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">📅 Date</span>
                  <span class="info-value">${formattedDate}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">🕐 Time</span>
                  <span class="info-value">${formattedTime}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">🌐 Location</span>
                  <span class="info-value">${deviceInfo}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">✅ Status</span>
                  <span class="info-value" style="color: #10b981; font-weight: 700;">Verified & Authenticated</span>
                </div>
              </div>

              <div class="divider"></div>

              <!-- Security Tips -->
              <div class="security-tips">
                <h3 class="security-title">Security Best Practices</h3>
                <ul class="security-list">
                  <li>Never share your admin credentials with anyone</li>
                  <li>Always log out when finished using the admin portal</li>
                  <li>Use a strong, unique password for your admin account</li>
                  <li>Be cautious of phishing emails requesting your credentials</li>
                  <li>Report any suspicious activity immediately</li>
                </ul>
              </div>

              <!-- Unauthorized Access Warning -->
              <div style="text-align: center; margin: 30px 0;">
                <p style="color: #64748b; font-size: 14px; margin-bottom: 15px;">
                  <strong>Didn't authorize this login?</strong>
                </p>
                <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin-bottom: 20px;">
                  If you did not perform this login, your account may be compromised. 
                  Please contact the super administrator immediately.
                </p>
                <a href="mailto:${process.env.EMAIL_USER}" class="action-button">
                  🚨 Report Unauthorized Access
                </a>
              </div>
            </div>

            <!-- Footer -->
            <div class="footer">
              <p class="footer-text">
                <strong>DineInGo Admin Portal</strong><br>
                This is an automated security notification. Please do not reply to this email.
              </p>
              <p class="footer-text" style="margin-top: 15px;">
                © ${new Date().getFullYear()} DineInGo. All rights reserved.
              </p>
              <p class="footer-text" style="color: #94a3b8; font-size: 11px; margin-top: 10px;">
                This email was sent to ${email} because you are registered as an administrator.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await emailTransporter.sendMail(mailOptions);
    console.log('✓ Login notification email sent to:', email);
    return true;
  } catch (error) {
    console.error('Error sending login notification email:', error);
    return false;
  }
};

// Send welcome email to new admin
const sendWelcomeEmail = async (email: string): Promise<boolean> => {
  try {
    const emailTransporter = getEmailTransporter();
    
    if (!emailTransporter) {
      console.log('Email transporter not configured, skipping welcome email');
      return false;
    }
    
    const mailOptions = {
      from: `"DineInGo Admin" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to DineInGo Admin Portal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin: 0;">DineInGo</h1>
            <p style="color: #64748b; margin: 5px 0;">Admin Portal</p>
          </div>
          
          <div style="background: #f8fafc; border-radius: 12px; padding: 30px;">
            <h2 style="color: #1e293b; margin-bottom: 20px;">Welcome to the Admin Team!</h2>
            <p style="color: #64748b; line-height: 1.6;">
              You have been added as an administrator for the DineInGo platform. 
              You now have access to the admin portal where you can manage users, businesses, and platform operations.
            </p>
            
            <div style="background: white; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
              <h3 style="color: #1e293b; margin-top: 0;">How to Access:</h3>
              <ol style="color: #64748b; line-height: 1.6;">
                <li>Visit the admin login page</li>
                <li>Enter your email address</li>
                <li>Check your email for the OTP</li>
                <li>Enter the OTP to access the admin portal</li>
              </ol>
            </div>
            
            <p style="color: #64748b; line-height: 1.6;">
              <strong>Important:</strong> Keep your admin access secure and do not share your login credentials with anyone.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #94a3b8; font-size: 12px;">
              Welcome to the DineInGo team!<br>
              If you have any questions, please contact the super admin.
            </p>
          </div>
        </div>
      `
    };

    await emailTransporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

// Remove admin (only for super admin)
export const removeAdmin = async (req: Request, res: Response) => {
  try {
    const { adminEmail } = req.body;

    if (!adminEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin email is required' 
      });
    }

    // Admin is already verified by middleware (verifySuperAdmin)
    // req.admin contains the authenticated super admin's data

    // Prevent removing super admin
    if (adminEmail.toLowerCase() === SUPER_ADMIN_EMAIL) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot remove the super admin.' 
      });
    }

    // Remove admin
    const removedAdmin = await Admin.findOneAndDelete({ 
      email: adminEmail.toLowerCase(),
      role: 'admin' // Only allow removing regular admins
    });

    if (!removedAdmin) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admin not found or cannot be removed.' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Admin removed successfully'
    });

  } catch (error) {
    console.error('Error removing admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get admin dashboard stats
export const getAdminStats = async (req: Request, res: Response) => {
  try {
    // Admin is already verified by middleware, get from req.admin
    const adminEmail = req.admin?.email;

    if (!adminEmail) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Get real-time statistics
    const [
      totalUsers,
      activeUsers,
      totalBusinesses,
      activeBusinesses,
      totalBookings,
      todayBookings,
      pendingBusinesses,
      recentUsers,
      recentBookings,
      monthlyStats
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: { $ne: 'admin' } }), // Active users (non-admin)
      Business.countDocuments(),
      Business.countDocuments({ status: 'active' }),
      Booking.countDocuments(),
      Booking.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }),
      Business.countDocuments({ status: 'draft' }), // Pending businesses
      User.find({ role: { $ne: 'admin' } }).sort({ createdAt: -1 }).limit(5).select('name displayName email createdAt role'),
      Booking.find().sort({ createdAt: -1 }).limit(5).populate('userId', 'name displayName email').populate('businessId', 'name'),
      getMonthlyStats()
    ]);

    // Calculate revenue (mock calculation - you can implement real revenue logic)
    const totalRevenue = totalBookings * 25; // Average booking value
    const monthlyRevenue = todayBookings * 25 * 30; // Estimated monthly

    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalBusinesses,
        activeBusinesses,
        totalBookings,
        todayBookings,
        pendingBusinesses,
        totalRevenue,
        monthlyRevenue,
        systemHealth: 98.5,
        responseTime: Math.floor(Math.random() * 200) + 100
      },
      recentActivity: [
        ...recentUsers.map(user => ({
          id: user._id,
          type: 'user_signup',
          user: user.displayName || user.name || user.email,
          time: getTimeAgo(user.createdAt),
          status: user.role === 'admin' ? 'inactive' : 'success'
        })),
        ...recentBookings.map(booking => ({
          id: booking._id,
          type: 'booking_made',
          user: (booking.userId as any)?.displayName || (booking.userId as any)?.name || 'Unknown User',
          business: (booking.businessId as any)?.name || 'Unknown Business',
          time: getTimeAgo(booking.createdAt),
          status: booking.status || 'pending'
        }))
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10),
      monthlyStats
    });

  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get monthly statistics for charts
const getMonthlyStats = async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyData = await Promise.all([
    // Users by month
    User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]),
    // Businesses by month
    Business.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]),
    // Bookings by month
    Booking.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ])
  ]);

  // Format data for charts
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const chartData = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    const users = monthlyData[0].find(item => item._id.year === year && item._id.month === month)?.count || 0;
    const businesses = monthlyData[1].find(item => item._id.year === year && item._id.month === month)?.count || 0;
    const bookings = monthlyData[2].find(item => item._id.year === year && item._id.month === month)?.count || 0;

    chartData.push({
      name: months[month - 1],
      users,
      businesses,
      revenue: bookings * 25 // Mock revenue calculation
    });
  }

  return chartData;
};

// Helper function to get time ago
const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  return `${diffInDays} days ago`;
};

// Get all users for admin management
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search = '', status = 'all' } = req.query;

    // Admin is already verified by middleware
    if (!req.admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Build query
    const query: any = {};
    if (search) {
      query.$or = [
        { displayName: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (status !== 'all') {
      // Use role to determine active/inactive status
      if (status === 'active') {
        query.role = { $ne: 'admin' };
      } else {
        query.role = 'admin';
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [users, totalUsers] = await Promise.all([
      User.find(query)
        .select('displayName name email phoneNumber role createdAt lastLogin')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      success: true,
      users,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalUsers / Number(limit)),
        totalUsers,
        hasNext: skip + Number(limit) < totalUsers,
        hasPrev: Number(page) > 1
      }
    });

  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Get all businesses for admin management
export const getAllBusinesses = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search = '', status = 'all' } = req.query;

    // Admin is already verified by middleware
    if (!req.admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Build query
    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'locationData.city': { $regex: search, $options: 'i' } }
      ];
    }
    if (status !== 'all') {
      if (status === 'pending') {
        query.status = 'draft';
      } else if (status === 'active') {
        query.status = 'active';
      } else {
        query.status = 'paused';
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [businesses, totalBusinesses] = await Promise.all([
      Business.find(query)
        .select('name ownerId locationData status createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Business.countDocuments(query)
    ]);

    res.json({
      success: true,
      businesses,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalBusinesses / Number(limit)),
        totalBusinesses,
        hasNext: skip + Number(limit) < totalBusinesses,
        hasPrev: Number(page) > 1
      }
    });

  } catch (error) {
    console.error('Error getting businesses:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Toggle user status
export const toggleUserStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    // Admin is already verified by middleware
    if (!req.admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Toggle user role between customer and admin (as a way to activate/deactivate)
    const newRole = user.role === 'admin' ? 'customer' : 'admin';
    user.role = newRole;
    await user.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('userStatusChanged', {
        userId: user._id,
        isActive: newRole !== 'admin',
        name: user.displayName || user.name,
        email: user.email
      });
    }

    res.json({
      success: true,
      message: `User ${newRole !== 'admin' ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        name: user.displayName || user.name,
        email: user.email,
        isActive: newRole !== 'admin'
      }
    });

  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Toggle business status
export const toggleBusinessStatus = async (req: Request, res: Response) => {
  try {
    const { businessId } = req.body;

    // Admin is already verified by middleware
    if (!req.admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ 
        success: false, 
        message: 'Business not found' 
      });
    }

    // Toggle business status between active and paused
    const newStatus = business.status === 'active' ? 'paused' : 'active';
    business.status = newStatus;
    await business.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('businessStatusChanged', {
        businessId: business._id,
        isActive: newStatus === 'active',
        status: newStatus,
        name: business.name,
        ownerId: business.ownerId
      });
    }

    res.json({
      success: true,
      message: `Business ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      business: {
        id: business._id,
        name: business.name,
        ownerId: business.ownerId,
        isActive: newStatus === 'active',
        status: newStatus
      }
    });

  } catch (error) {
    console.error('Error toggling business status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Send notification to users
export const sendNotification = async (req: Request, res: Response) => {
  try {
    const { title, message, type = 'info', targetType = 'all', targetIds = [] } = req.body;

    // Admin is already verified by middleware
    const adminEmail = req.admin?.email;
    if (!adminEmail) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!title || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title and message are required' 
      });
    }

    // Determine recipients and notification model based on target type
    let recipients: string[] = [];
    let NotificationModel: any;
    
    if (targetType === 'all') {
      // Send to all non-admin users (customers + business owners)
      const users = await User.find({ role: { $ne: 'admin' } }).select('uid');
      recipients = users.map((user: any) => user.uid);
      NotificationModel = AllUserNotification;
      console.log(`Found ${recipients.length} users for "all" target (customers + business owners)`);
    } else if (targetType === 'users') {
      // Send to customers only
      const users = await User.find({ role: 'customer' }).select('uid');
      recipients = users.map((user: any) => user.uid);
      NotificationModel = UserNotification;
      console.log(`Found ${recipients.length} customers`);
    } else if (targetType === 'businesses') {
      // Send to business owners only
      const users = await User.find({ role: 'owner' }).select('uid');
      recipients = users.map((user: any) => user.uid);
      NotificationModel = BusinessNotification;
      console.log(`Found ${recipients.length} business owners`);
    } else if (targetIds && targetIds.length > 0) {
      // Send to specific users - use AllUserNotification for custom targets
      recipients = targetIds;
      NotificationModel = AllUserNotification;
      console.log(`Sending to ${recipients.length} specific users`);
    }

    if (recipients.length === 0) {
      console.log('No recipients found for notification');
      return res.json({
        success: true,
        message: 'No recipients found for the selected target',
        recipientCount: 0
      });
    }

    console.log(`Creating notifications for ${recipients.length} recipients`);
    console.log('Target type:', targetType);
    console.log('Notification type:', type);
    console.log('Using collection:', NotificationModel.collection.name);
    console.log('Sample recipient UIDs:', recipients.slice(0, 3));

    // Create individual notifications for each recipient in the appropriate collection
    const notifications = recipients.map((userId: string) => ({
      userId,
      title,
      message,
      type,
      isRead: false,
      sentBy: adminEmail,
      createdAt: new Date()
    }));

    const result = await NotificationModel.insertMany(notifications);
    console.log(`Successfully created ${result.length} notifications in ${NotificationModel.collection.name}`);

    // Record notification stats
    await NotificationStats.create({
      date: new Date(),
      targetType,
      notificationType: type,
      recipientCount: recipients.length,
      title,
      sentBy: adminEmail
    });
    console.log('Notification stats recorded');

    // Emit real-time notification to all connected clients
    const io = req.app.get('io');
    if (io) {
      // Emit to specific users
      recipients.forEach((userId: string) => {
        io.to(`user_${userId}`).emit('newNotification', {
          title,
          message,
          type,
          targetType,
          createdAt: new Date()
        });
      });
      
      // Also emit a general notification event
      io.emit('adminNotification', {
        title,
        message,
        type,
        targetType,
        recipientCount: recipients.length,
        sentBy: adminEmail,
        sentAt: new Date()
      });
      
      console.log('Real-time notifications emitted via Socket.IO');
    }

    res.json({
      success: true,
      message: `Notification sent to ${recipients.length} ${targetType === 'all' ? 'users' : targetType}`,
      recipientCount: recipients.length,
      targetType
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Toggle admin status (only for super admin)
export const toggleAdminStatus = async (req: Request, res: Response) => {
  try {
    const { adminEmail } = req.body;

    if (!adminEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin email is required' 
      });
    }

    // Admin is already verified by middleware (verifySuperAdmin)
    // req.admin contains the authenticated super admin's data

    // Prevent toggling super admin
    if (adminEmail.toLowerCase() === SUPER_ADMIN_EMAIL) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot modify super admin status.' 
      });
    }

    const admin = await Admin.findOne({ email: adminEmail.toLowerCase(), role: 'admin' });
    if (!admin) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admin not found.' 
      });
    }

    admin.isActive = !admin.isActive;
    await admin.save();

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('adminStatusChanged', {
        adminEmail: admin.email,
        isActive: admin.isActive,
        changedBy: req.admin!.email
      });
    }

    res.json({ 
      success: true, 
      message: `Admin ${admin.isActive ? 'activated' : 'deactivated'} successfully`,
      admin: {
        email: admin.email,
        isActive: admin.isActive
      }
    });

  } catch (error) {
    console.error('Error toggling admin status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};


// Get notification statistics
export const getNotificationStats = async (req: Request, res: Response) => {
  try {
    // Admin is already verified by middleware
    if (!req.admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - 7));

    // Get today's notifications count
    const todayCount = await NotificationStats.aggregate([
      { $match: { createdAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: '$recipientCount' } } }
    ]);

    // Get this week's notifications count
    const weekCount = await NotificationStats.aggregate([
      { $match: { createdAt: { $gte: weekStart } } },
      { $group: { _id: null, total: { $sum: '$recipientCount' } } }
    ]);

    // Get total notifications count
    const totalCount = await NotificationStats.aggregate([
      { $group: { _id: null, total: { $sum: '$recipientCount' } } }
    ]);

    // Get recent notifications
    const recentNotifications = await NotificationStats.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title targetType notificationType recipientCount sentBy createdAt');

    res.json({
      success: true,
      stats: {
        today: todayCount[0]?.total || 0,
        week: weekCount[0]?.total || 0,
        total: totalCount[0]?.total || 0
      },
      recent: recentNotifications
    });

  } catch (error) {
    console.error('Error getting notification stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Update max admins capacity (only for super admin)
export const updateMaxAdmins = async (req: Request, res: Response) => {
  try {
    const { maxAdmins } = req.body;

    if (!maxAdmins || typeof maxAdmins !== 'number' || maxAdmins < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid max admins number is required (minimum 1)' 
      });
    }

    // Get current admin count
    const currentAdminCount = await Admin.countDocuments({ isActive: true });
    
    if (maxAdmins < currentAdminCount) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot set max admins to ${maxAdmins}. You currently have ${currentAdminCount} active admins. Please remove some admins first.` 
      });
    }

    // Update settings
    const settings = await getSystemSettings();
    settings.maxAdmins = maxAdmins;
    await settings.save();

    res.json({ 
      success: true, 
      message: `Admin capacity updated to ${maxAdmins} successfully`,
      maxAdmins: settings.maxAdmins
    });

  } catch (error) {
    console.error('Error updating max admins:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};
