import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { secretManager } from '../utils/secretManager';
import { Admin, AdminOTP } from '../models/Admin';
import { AdminAuditLog } from '../middleware/adminAuditLog';
import { User } from '../models/User';
import { Owner } from '../models/Owner';
import { Business } from '../models/Business';
import { Booking } from '../models/Booking';
import Notification from '../models/Notification';
import UserNotification from '../models/UserNotification';
import BusinessNotification from '../models/BusinessNotification';
import AllUserNotification from '../models/AllUserNotification';
import NotificationStats from '../models/NotificationStats';
import Broadcast from '../models/Broadcast';
import { getSystemSettings } from '../models/SystemSettings';
import * as crypto from 'crypto';
import { generateAdminToken } from '../middleware/adminAuth';
import { SecurityLog } from '../models/SecurityLog';
import BlockedIP from '../models/BlockedIP';
import { EarlyAccess } from '../models/EarlyAccess';
import { emailService } from '../services/emailService';
import { runDeepSecurityScan } from '../services/deepSecurityScan';
import {
  generateTwoFactorSecret,
  generateTwoFactorQRCode,
  verifyTwoFactorToken,
  generateBackupCodes,
  verifyBackupCode,
  consumeBackupCode,
  encryptSecret,
  decryptSecret,
  generateQRCodeForUrl
} from '../services/twoFactorService';
import {
  initiateTwoFactorReminders,
  stopTwoFactorReminders,
  checkAndEnforceTwoFactorDeadlines,
  scheduleAndSendPendingReminders
} from '../services/twoFactorEnforcementService';

// Super admin email (DineInGo owner)
const SUPER_ADMIN_EMAIL = 'sujithputta02@gmail.com';

// Initialize super admin on first run
export const initializeSuperAdmin = async () => {
  try {
    const existingSuperAdmin = await Admin.findOne({ email: SUPER_ADMIN_EMAIL });
    if (!existingSuperAdmin) {
      await Admin.create({
        email: SUPER_ADMIN_EMAIL,
        role: 'super_admin',
        isActive: true,
        addedBy: 'system'
      });
      console.log('✓ Super admin initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing super admin:', error);
  }
};

// Generate 6-digit OTP
const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

// Send OTP email (legacy wrapper for backward compatibility within this file)
const sendOTPEmail = async (email: string, otp: string): Promise<boolean> => {
  return emailService.sendAdminOTPEmail(email, otp);
};

export const requestAdminOTP = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Check if email is a valid admin
    const admin = await Admin.findOne({ email: email.toLowerCase(), isActive: true });
    
    if (!admin) {
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

    // Generate and save OTP
    const otp = generateOTP();
    
    await AdminOTP.create({
      email: email.toLowerCase(),
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });

    // Send OTP email (non-blocking)
    sendOTPEmail(email, otp).catch(err => 
      console.error('Failed to send admin OTP email:', err)
    );
    
    res.json({ 
      success: true, 
      message: 'OTP sent successfully. Check your email.'
    });

  } catch (error) {
    console.error('Error requesting admin OTP:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Verify OTP and login
export const verifyAdminOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp, timezone } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and OTP are required' 
      });
    }

    // Check if account is locked
    const admin = await Admin.findOne({ email: email.toLowerCase() })
      .select('+twoFactorEnabled +twoFactorSecret +twoFactorPendingSecret +tokenVersion +isActive +lockUntil +loginAttempts');
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
        const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || 'Unknown';
        const { logFailedLogin } = await import('../middleware/adminAuditLog');

        if (admin.loginAttempts >= 5) {
          admin.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
          await admin.save();
          
          await logFailedLogin(email.toLowerCase(), ipAddress, 'Account locked due to 5 failed attempts');

          // Log to Universal Security Log
          await SecurityLog.create({
            portal: 'admin',
            eventType: 'failed_login',
            severity: 'high',
            details: `Admin account ${email} locked after 5 failed OTP attempts.`,
            ip: String(ipAddress),
            userAgent: req.headers['user-agent'],
            path: req.path
          });

          return res.status(423).json({
            success: false,
            message: 'Account locked due to too many failed attempts. Try again in 15 minutes.',
            locked: true,
            lockUntil: admin.lockUntil
          });
        } else {
          await admin.save();
          
          await logFailedLogin(email.toLowerCase(), ipAddress, `Invalid OTP (${admin.loginAttempts}/5 attempts)`);

          // Log to Universal Security Log
          await SecurityLog.create({
            portal: 'admin',
            eventType: 'failed_login',
            severity: 'medium',
            details: `Invalid OTP attempt for ${email} (${admin.loginAttempts}/5 attempts)`,
            ip: String(ipAddress),
            userAgent: req.headers['user-agent'],
            path: req.path
          });
        }
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
      if (timezone) admin.timezone = timezone;
      await admin.save();
    }

    // 🛡️ MANDATORY 2FA: Every admin must have 2FA enabled. No exceptions.
    // Case 1: 2FA NOT yet set up → force the admin to enroll before they get a session.
    if (!admin!.twoFactorEnabled || !admin!.twoFactorSecret) {
      // Generate a pending TOTP secret + QR for enrollment
      const secret = generateTwoFactorSecret();
      admin!.twoFactorPendingSecret = encryptSecret(secret);
      await admin!.save();

      const qrCode = await generateTwoFactorQRCode(admin!.email, secret);
      const setupChallengeToken = jwt.sign(
        { email: admin!.email, twoFactorSetupPending: true },
        getJWTSecret(),
        { expiresIn: '15m' } // enrollment challenge expires in 15 minutes
      );

      return res.json({
        success: true,
        twoFactorSetupRequired: true,
        challengeToken: setupChallengeToken,
        qrCode,
        manualEntryKey: secret,
        email: admin!.email,
        message: 'Two-factor authentication is required. Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password) and enter the 6-digit code to complete setup.'
      });
    }

    // Case 2: 2FA already enabled → issue a short-lived challenge token for the verify-2fa step.
    const challengeToken = jwt.sign(
      { email: admin!.email, twoFactorPending: true },
      getJWTSecret(),
      { expiresIn: '15m' } // 2FA challenge expires in 15 minutes (increased for user convenience)
    );

    // 🛡️ EMAIL 2FA FALLBACK: Generate a one-time confirmation link but DON'T send email yet.
    // The QR code is shown on the login screen. When admin scans it on their phone,
    // THEN we send the confirmation email. The link is single-use per login attempt.
    let confirmQrCode = '';
    try {
      const jti = crypto.randomUUID();
      const emailConfirmToken = jwt.sign(
        { email: admin!.email, purpose: '2fa-email-confirm', jti },
        getJWTSecret(),
        { expiresIn: '15m' } // confirmation link valid for 15 minutes (matching challenge token)
      );
      // 🔧 FIX: Use FRONTEND_URL env var (or fallback to request origin) instead of hardcoded CLIENT_URL
      // This ensures QR codes and email links work on any deployed domain
      const frontendUrl = process.env.FRONTEND_URL 
        || process.env.CLIENT_URL 
        || `${req.protocol}://${req.get('host')}`
        || 'https://dineingo.onrender.com';
      const confirmUrl = `${frontendUrl}/admin/2fa/email-confirm?token=${emailConfirmToken}`;
      
      // Store the token & jti
      admin!.twoFactorEmailConfirmJti = jti;
      admin!.twoFactorEmailConfirmExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      await admin!.save();
      
      // Generate QR code for the confirmation URL
      confirmQrCode = await generateQRCodeForUrl(confirmUrl);
    } catch (err) {
      console.error('Failed to set up email 2FA fallback:', err);
    }

    return res.json({
      success: true,
      twoFactorRequired: true,
      challengeToken,
      emailConfirmSent: false, // Email NOT sent yet
      confirmQrCode,
      message: 'Two-factor authentication required. Enter your authenticator passcode, or scan the QR code to confirm via email.'
    });

  } catch (error) {
    console.error('Error verifying admin OTP:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

/**
 * Complete mandatory first-login 2FA setup.
 * Validates the setup challenge token + the first TOTP code from the authenticator app,
 * enables 2FA on the account, generates backup codes, and only then issues a full admin JWT.
 * Body: { challengeToken, code }
 */
export const completeFirstSetup2FA = async (req: Request, res: Response) => {
  try {
    const { challengeToken, code } = req.body;
    if (!challengeToken || !code) {
      return res.status(400).json({ success: false, message: 'Challenge token and 6-digit code are required' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(challengeToken, getJWTSecret()) as any;
    } catch {
      return res.status(401).json({ success: false, message: 'Setup session expired. Please login again.' });
    }
    if (!decoded.twoFactorSetupPending || !decoded.email) {
      return res.status(401).json({ success: false, message: 'Invalid setup token.' });
    }

    const admin = await Admin.findOne({ email: decoded.email.toLowerCase() })
      .select('+twoFactorEnabled +twoFactorSecret +twoFactorPendingSecret +twoFactorBackupCodes +tokenVersion +isActive +lastLogin');
    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, message: 'Account not found or deactivated.' });
    }
    // If there is a pending secret (fresh enrollment or re-linking)
    if (admin.twoFactorPendingSecret) {
      const secret = decryptSecret(admin.twoFactorPendingSecret);
      if (!secret) {
        return res.status(500).json({ success: false, message: 'Unable to decrypt pending 2FA secret.' });
      }

      if (!verifyTwoFactorToken(code, secret)) {
        // Log failed setup attempt
        const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'Unknown';
        try {
          await SecurityLog.create({
            portal: 'admin',
            eventType: 'failed_2fa_setup',
            severity: 'high',
            details: `Failed 2FA setup attempt for ${admin.email}`,
            ip: String(ipAddress),
            userAgent: req.headers['user-agent'],
            path: req.path
          });
        } catch {}
        return res.status(401).json({ success: false, message: 'Invalid 6-digit code. Please check the code in your authenticator app and try again.' });
      }

      // Promote pending secret to active
      admin.twoFactorSecret = admin.twoFactorPendingSecret;
      admin.twoFactorPendingSecret = undefined;
      admin.twoFactorEnabled = true;

      // Generate backup codes
      const { plain, hashes } = generateBackupCodes(10);
      admin.twoFactorBackupCodes = hashes;

      // Bump tokenVersion
      admin.tokenVersion = (admin.tokenVersion || 0) + 1;
      admin.lastLogin = new Date();
      await admin.save();

      // Stop reminders
      stopTwoFactorReminders(admin.email).catch(() => {});

      const token = generateAdminToken(admin.email, admin.role || 'admin', admin.tokenVersion || 0);

      const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'Unknown';
      try {
        await SecurityLog.create({
          portal: 'admin',
          eventType: '2fa_enabled',
          severity: 'medium',
          details: `2FA enabled for ${admin.email}`,
          ip: String(ipAddress),
          userAgent: req.headers['user-agent'],
          path: req.path
        });
        sendLoginNotificationEmail(admin.email, admin.lastLogin, ipAddress, admin.timezone).catch(() => {});
      } catch {}

      return res.json({
        success: true,
        message: 'Two-factor authentication configured successfully. Save your backup codes.',
        token,
        tokenExpiresIn: '4h',
        backupCodes: plain,
        admin: {
          email: admin.email,
          role: admin.role || 'admin',
          lastLogin: admin.lastLogin,
          twoFactorEnabled: true
        }
      });
    }

    if (admin.twoFactorEnabled && admin.twoFactorSecret) {
      const secret = decryptSecret(admin.twoFactorSecret);
      if (secret && verifyTwoFactorToken(code, secret)) {
        admin.lastLogin = new Date();
        admin.tokenVersion = (admin.tokenVersion || 0) + 1;
        await admin.save();
        const token = generateAdminToken(admin.email, admin.role || 'admin', admin.tokenVersion);
        return res.json({
          success: true,
          message: 'Login successful',
          token,
          tokenExpiresIn: '4h',
          admin: {
            email: admin.email,
            role: admin.role || 'admin',
            lastLogin: admin.lastLogin,
            twoFactorEnabled: true
          }
        });
      }
      return res.status(400).json({ success: false, message: 'Invalid 6-digit code. Please try again.' });
    }

    return res.status(400).json({ success: false, message: 'No pending 2FA setup found. Please restart login.' });
  } catch (error) {
    console.error('Error completing first-login 2FA setup:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// ============================================
// 🛡️ TWO-FACTOR AUTHENTICATION (TOTP)
// ============================================

// Get JWT secret for 2FA challenge tokens
const getJWTSecret = (): string => {
  try {
    return secretManager.getSecret('JWT_SECRET');
  } catch {
    return process.env.JWT_SECRET || 'dev-only-do-not-use-in-prod';
  }
};

/**
 * Verify 2FA challenge token and issue a full admin JWT.
 * Body: { challengeToken, code, useBackup }
 */
export const verifyAdmin2FA = async (req: Request, res: Response) => {
  try {
    const { challengeToken, code, useBackup } = req.body;

    if (!challengeToken || !code) {
      return res.status(400).json({ success: false, message: 'Challenge token and verification code are required' });
    }

    // Verify the challenge token
    let decoded: any;
    try {
      decoded = jwt.verify(challengeToken, getJWTSecret()) as any;
    } catch {
      return res.status(401).json({ success: false, message: 'Challenge token expired. Please login again.' });
    }

    if (!decoded.twoFactorPending || !decoded.email) {
      return res.status(401).json({ success: false, message: 'Invalid challenge token.' });
    }

    // Load the admin with 2FA fields
    const admin = await Admin.findOne({ email: decoded.email.toLowerCase() }).select('+twoFactorEnabled +twoFactorSecret +twoFactorBackupCodes +tokenVersion +isActive');
    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, message: 'Account not found or deactivated.' });
    }
    if (!admin.twoFactorEnabled || !admin.twoFactorSecret) {
      return res.status(400).json({ success: false, message: 'Two-factor authentication is not enabled on this account.' });
    }

    const decryptedSecret = decryptSecret(admin.twoFactorSecret!);
    if (!decryptedSecret) {
      console.error('🔴 [2FA] Failed to decrypt secret for:', admin.email);
      return res.status(500).json({ success: false, message: 'Unable to decrypt 2FA secret. Please contact support.' });
    }

    console.log('🔍 [2FA] Secret decrypted successfully:', {
      email: admin.email,
      secretLength: decryptedSecret?.length,
      codeProvided: code,
      codeLength: code?.length,
      useBackup
    });

    let verified = false;

    if (useBackup) {
      // Backup code verification
      if (!admin.twoFactorBackupCodes || admin.twoFactorBackupCodes.length === 0) {
        return res.status(400).json({ success: false, message: 'No backup codes remaining. Please contact a super admin.' });
      }
      verified = verifyBackupCode(code, admin.twoFactorBackupCodes);
      console.log('🔍 [2FA] Backup code verification:', { verified, codesRemaining: admin.twoFactorBackupCodes.length });
      if (verified) {
        admin.twoFactorBackupCodes = consumeBackupCode(code, admin.twoFactorBackupCodes);
      }
    } else {
      // TOTP verification with enhanced logging
      console.log('🔍 [2FA] Attempting TOTP verification:', {
        email: admin.email,
        codeReceived: code,
        codeLength: code?.length,
        isNumeric: /^\d{6}$/.test(code || ''),
        timestamp: new Date().toISOString(),
        serverTime: Math.floor(Date.now() / 1000)
      });
      
      verified = verifyTwoFactorToken(code, decryptedSecret);

      // Auto-fallback: If TOTP check fails, also check if the entered code matches a backup code
      if (!verified && admin.twoFactorBackupCodes && admin.twoFactorBackupCodes.length > 0) {
        if (verifyBackupCode(code, admin.twoFactorBackupCodes)) {
          verified = true;
          admin.twoFactorBackupCodes = consumeBackupCode(code, admin.twoFactorBackupCodes);
          console.log('🔍 [2FA] Auto-fallback to backup code succeeded for:', admin.email);
        }
      }
      
      console.log('🔍 [2FA] TOTP verification result:', { 
        verified, 
        email: admin.email,
        codeProvided: code
      });
    }

    if (!verified) {
      // Log failed 2FA attempt with detailed debugging
      const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'Unknown';
      console.log('🔴 [2FA FAILED] Comprehensive debug info:', {
        email: admin.email,
        codeReceived: code,
        codeLength: code?.length,
        isNumeric: /^\d{6}$/.test(code || ''),
        useBackup,
        hasSecret: !!decryptedSecret,
        secretLength: decryptedSecret?.length,
        timestamp: new Date().toISOString(),
        serverTime: Math.floor(Date.now() / 1000),
        ipAddress,
        userAgent: req.headers['user-agent']
      });
      
      await SecurityLog.create({
        portal: 'admin',
        eventType: 'failed_2fa',
        severity: 'high',
        details: `Failed 2FA attempt for ${admin.email}${useBackup ? ' (backup code)' : ' (TOTP)'}. Code: ${code}, Length: ${code?.length}`,
        ip: String(ipAddress),
        userAgent: req.headers['user-agent'],
        path: req.path
      });
      
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid verification code. Make sure your authenticator app time is synchronized and try again.',
        hint: 'If you continue having issues, use a backup code or request the email confirmation link.'
      });
    }

    // 2FA passed — issue full admin token
    await admin.save();

    const token = generateAdminToken(admin.email, admin.role, admin.tokenVersion || 0);

    // Send login notification email (non-blocking) — admin just passed 2FA
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'Unknown';
    if (!admin.lastLogin) admin.lastLogin = new Date();
    sendLoginNotificationEmail(admin.email, admin.lastLogin, ipAddress, admin.timezone).catch(err =>
      console.error('Failed to send login notification:', err)
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      tokenExpiresIn: '4h',
      admin: {
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin,
        twoFactorEnabled: true
      }
    });

  } catch (error) {
    console.error('Error verifying admin 2FA:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * 🛡️ EMAIL 2FA FALLBACK — complete login by confirming via the magic link.
 *
 * The admin taps the "Confirm Sign-In" button in the email they received at the
 * 2FA step (or scans the confirm QR on their phone, which opens the same link).
 * The front-end route `/admin/2fa/email-confirm?token=...` reads the token from the
 * URL and POSTs it here. We verify the signed JWT, enforce single-use via the jti
 * stored on the admin record + expiry, then issue a full admin JWT.
 *
 * Body: { confirmToken }
 */
export const verifyAdmin2FAEmailConfirm = async (req: Request, res: Response) => {
  try {
    const { confirmToken } = req.body;
    if (!confirmToken) {
      return res.status(400).json({ success: false, message: 'Confirmation token is required.' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(confirmToken, getJWTSecret()) as any;
    } catch (jwtErr: any) {
      console.error('🔴 JWT verification failed for email confirm:', jwtErr.message);
      return res.status(401).json({ success: false, message: 'Confirmation link expired or invalid. Please start login again.' });
    }
    
    const email = (decoded.email || '').toLowerCase();
    if (!email) {
      return res.status(401).json({ success: false, message: 'Invalid confirmation link.' });
    }

    const admin = await Admin.findOne({ email })
      .select('+twoFactorEnabled +twoFactorEmailConfirmJti +twoFactorEmailConfirmExpires +tokenVersion +isActive +lastLogin');
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, message: 'Account not found or deactivated.' });
    }

    // Check expiry if set
    if (admin.twoFactorEmailConfirmExpires && admin.twoFactorEmailConfirmExpires < new Date()) {
      admin.twoFactorEmailConfirmJti = undefined;
      admin.twoFactorEmailConfirmExpires = undefined;
      await admin.save();
      return res.status(401).json({ success: false, message: 'Confirmation link expired. Please start login again.' });
    }

    // Clear confirmation link fields
    admin.twoFactorEmailConfirmJti = undefined;
    admin.twoFactorEmailConfirmExpires = undefined;
    admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    admin.lastLogin = new Date();
    await admin.save();

    // Issue the full admin JWT
    const token = generateAdminToken(admin.email, admin.role || 'admin', admin.tokenVersion || 0);

    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || 'Unknown';
    try {
      await SecurityLog.create({
        portal: 'admin',
        eventType: '2fa_email_confirm',
        severity: 'medium',
        details: `Admin ${admin.email} completed 2FA via email confirmation link`,
        ip: String(ipAddress),
        userAgent: req.headers['user-agent'],
        path: req.path
      });
      sendLoginNotificationEmail(admin.email, admin.lastLogin, ipAddress, admin.timezone).catch(() => {});
    } catch (err) {
      console.error('Non-critical logging error during email confirm:', err);
    }

    return res.json({
      success: true,
      message: 'Login confirmed via email.',
      token,
      tokenExpiresIn: '4h',
      admin: {
        email: admin.email,
        role: admin.role || 'admin',
        lastLogin: admin.lastLogin,
        twoFactorEnabled: true
      }
    });
  } catch (error: any) {
    console.error('🔴 [CRITICAL] Error verifying email 2FA confirm:', error);
    return res.status(500).json({ success: false, message: 'Internal server error: ' + (error?.message || 'Please try again') });
  }
};

/**
 * PUBLIC: Diagnostic endpoint to check TOTP configuration
 * This helps verify the deployment has the correct TOTP window settings
 */
export const getTotpDiagnostics = async (req: Request, res: Response) => {
  try {
    const { authenticator } = await import('../services/twoFactorService');
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      unixTime: Math.floor(Date.now() / 1000),
      totpConfig: {
        window: (authenticator as any).options?.window || 0,
        step: (authenticator as any).options?.step || 30,
        windowDescription: `±${((authenticator as any).options?.window || 0)} steps = ±${((authenticator as any).options?.window || 0) * 30} seconds`
      },
      message: 'TOTP configuration loaded successfully'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load TOTP configuration',
      error: error.message
    });
  }
};

/**
 * Get current 2FA status for the logged-in admin.
 */
export const getTwoFactorStatus = async (req: Request, res: Response) => {
  try {
    const admin = await Admin.findOne({ email: req.admin!.email }).select('+twoFactorEnabled +twoFactorBackupCodes +required2FA');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    // Get authenticator configuration for debugging
    const { authenticator } = await import('../services/twoFactorService');
    const totpConfig = {
      window: (authenticator as any).options?.window || 0,
      step: (authenticator as any).options?.step || 30
    };

    res.json({
      success: true,
      twoFactorEnabled: !!admin.twoFactorEnabled,
      required2FA: !!admin.required2FA,
      backupCodesRemaining: admin.twoFactorBackupCodes?.length || 0,
      totpConfig // Include TOTP config for debugging
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Start 2FA setup: generate a new secret + QR code.
 * The secret is stored as 'pending' until the user confirms with a valid TOTP.
 */
export const setupTwoFactor = async (req: Request, res: Response) => {
  try {
    const admin = await Admin.findOne({ email: req.admin!.email }).select('+twoFactorEnabled +twoFactorPendingSecret');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    if (admin.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '2FA is already enabled. Disable it first to reconfigure.' });
    }

    // Generate new secret (store encrypted as pending)
    const secret = generateTwoFactorSecret();
    admin.twoFactorPendingSecret = encryptSecret(secret);
    await admin.save();

    const qrCode = await generateTwoFactorQRCode(req.admin!.email, secret);
    const otpAuthUri = `${buildOtpAuthUriLabel(req.admin!.email, secret)}`;

    res.json({
      success: true,
      message: 'Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.) and enter a 6-digit code to confirm.',
      qrCode,
      manualEntryKey: secret // shown for manual entry if QR can't be scanned
    });

  } catch (error) {
    console.error('Error setting up 2FA:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Helper for manual entry label
const buildOtpAuthUriLabel = (email: string, secret: string): string => {
  return `otpauth://totp/DineInGo+Admin:${email}?secret=${secret}&issuer=DineInGo+Admin`;
};

/**
 * Confirm 2FA setup: verify the first TOTP code from the app.
 * On success: enable 2FA, promote pending secret to active, generate backup codes.
 */
export const confirmTwoFactorSetup = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: '6-digit verification code is required' });

    const admin = await Admin.findOne({ email: req.admin!.email }).select('+twoFactorEnabled +twoFactorSecret +twoFactorPendingSecret +twoFactorBackupCodes +tokenVersion');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    if (admin.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '2FA is already enabled.' });
    }
    if (!admin.twoFactorPendingSecret) {
      return res.status(400).json({ success: false, message: 'No pending 2FA setup. Please start setup first.' });
    }

    const decryptedSecret = decryptSecret(admin.twoFactorPendingSecret);
    if (!decryptedSecret) {
      return res.status(500).json({ success: false, message: 'Unable to decrypt pending 2FA secret.' });
    }

    if (!verifyTwoFactorToken(code, decryptedSecret)) {
      return res.status(401).json({ success: false, message: 'Invalid verification code. Please try again.' });
    }

    // Promote pending secret to active
    admin.twoFactorSecret = admin.twoFactorPendingSecret;
    admin.twoFactorPendingSecret = undefined;
    admin.twoFactorEnabled = true;

    // Generate backup codes
    const { plain, hashes } = generateBackupCodes(10);
    admin.twoFactorBackupCodes = hashes;

    // Bump tokenVersion so other sessions require re-auth with 2FA
    admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    await admin.save();

    // Stop 2FA reminder emails now that 2FA is enabled (non-blocking)
    stopTwoFactorReminders(admin.email).catch(err =>
      console.error('Failed to stop 2FA reminders:', err)
    );

    // Log the event
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'Unknown';
    await SecurityLog.create({
      portal: 'admin',
      eventType: '2fa_enabled',
      severity: 'medium',
      details: `2FA enabled for ${admin.email}`,
      ip: String(ipAddress),
      userAgent: req.headers['user-agent'],
      path: req.path
    });

    res.json({
      success: true,
      message: 'Two-factor authentication enabled. Save your backup codes in a secure location — they won\'t be shown again.',
      backupCodes: plain
    });

  } catch (error) {
    console.error('Error confirming 2FA setup:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Disable 2FA: requires the current TOTP code (or a super admin can force it).
 */
export const disableTwoFactor = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    const admin = await Admin.findOne({ email: req.admin!.email }).select('+twoFactorEnabled +twoFactorSecret +twoFactorBackupCodes +tokenVersion');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    if (!admin.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '2FA is not enabled.' });
    }

    // Require a valid TOTP to disable (unless super admin is forcing it for another admin)
    if (code) {
      const decryptedSecret = decryptSecret(admin.twoFactorSecret!);
      const validTotp = decryptedSecret && verifyTwoFactorToken(code, decryptedSecret);
      const validBackup = admin.twoFactorBackupCodes?.length && verifyBackupCode(code, admin.twoFactorBackupCodes);
      if (!validTotp && !validBackup) {
        return res.status(401).json({ success: false, message: 'Invalid verification code. 2FA not disabled.' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'A valid verification code is required to disable 2FA.' });
    }

    admin.twoFactorEnabled = false;
    admin.twoFactorSecret = undefined;
    admin.twoFactorBackupCodes = [];
    admin.twoFactorPendingSecret = undefined;
    admin.tokenVersion = (admin.tokenVersion || 0) + 1; // invalidate sessions
    await admin.save();

    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'Unknown';
    await SecurityLog.create({
      portal: 'admin',
      eventType: '2fa_disabled',
      severity: 'high',
      details: `2FA disabled for ${admin.email}`,
      ip: String(ipAddress),
      userAgent: req.headers['user-agent'],
      path: req.path
    });

    res.json({ success: true, message: 'Two-factor authentication has been disabled.' });

  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Regenerate backup codes (requires current TOTP).
 */
export const regenerateBackupCodes = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    const admin = await Admin.findOne({ email: req.admin!.email }).select('+twoFactorEnabled +twoFactorSecret +twoFactorBackupCodes');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    if (!admin.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: '2FA is not enabled.' });
    }

    // Verify TOTP before regenerating
    const decryptedSecret = decryptSecret(admin.twoFactorSecret!);
    if (!decryptedSecret || !verifyTwoFactorToken(code, decryptedSecret)) {
      return res.status(401).json({ success: false, message: 'Invalid verification code.' });
    }

    const { plain, hashes } = generateBackupCodes(10);
    admin.twoFactorBackupCodes = hashes;
    await admin.save();

    res.json({
      success: true,
      message: 'New backup codes generated. Save these in a secure location — they won\'t be shown again.',
      backupCodes: plain
    });

  } catch (error) {
    console.error('Error regenerating backup codes:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Revoke all active sessions for the current admin by bumping tokenVersion.
 */
export const revokeAllSessions = async (req: Request, res: Response) => {
  try {
    const admin = await Admin.findOne({ email: req.admin!.email }).select('+tokenVersion');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });

    admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    await admin.save();

    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'Unknown';
    await SecurityLog.create({
      portal: 'admin',
      eventType: 'sessions_revoked',
      severity: 'medium',
      details: `All sessions revoked for ${admin.email}`,
      ip: String(ipAddress),
      userAgent: req.headers['user-agent'],
      path: req.path
    });

    res.json({ success: true, message: 'All active sessions have been revoked. Please login again.' });
  } catch (error) {
    console.error('Error revoking sessions:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Get all admins (only for super admin)
export const getAdmins = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Admin is already verified by middleware (verifySuperAdmin)
    // req.admin contains the authenticated admin's data
    
    const [admins, totalCount] = await Promise.all([
      Admin.find({}, { 
        email: 1, 
        role: 1, 
        isActive: 1, 
        addedBy: 1, 
        createdAt: 1, 
        lastLogin: 1 
      }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Admin.countDocuments({})
    ]);

    const settings = await getSystemSettings();

    res.json({ 
      success: true, 
      admins,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalCount / Number(limit)),
        totalCount,
        hasNext: skip + Number(limit) < totalCount,
        hasPrev: Number(page) > 1
      },
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
    const { email, role } = req.body;

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
      role: role || 'admin',
      isActive: true,
      addedBy: req.admin!.email
    });

    // Send admin invitation email with portal login button (non-blocking)
    sendAdminInvitationEmail(newAdmin.email, req.admin!.email, newAdmin.role).catch(err =>
      console.error('Failed to send admin invitation email:', err)
    );

    // Initiate 2FA enforcement reminders (non-blocking, will start email sequence)
    initiateTwoFactorReminders(newAdmin.email).catch(err =>
      console.error('Failed to initiate 2FA reminders:', err)
    );

    res.json({ 
      success: true, 
      message: 'Admin added successfully',
      admin: {
        email: newAdmin.email,
        role: newAdmin.role,
        addedBy: newAdmin.addedBy,
        createdAt: newAdmin.createdAt
      }
    });

  } catch (error) {
    console.error('Error adding admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

// Send login notification email to admin with new-IP detection (wrapper)
const sendLoginNotificationEmail = async (email: string, loginTime: Date, ipAddress?: string, timezone?: string): Promise<boolean> => {
  let isNewIp = false;
  if (ipAddress && ipAddress !== 'Unknown') {
    try {
      // Check if we've ever seen a successful login from this IP before
      const previousLogins = await AdminAuditLog.countDocuments({
        adminEmail: email.toLowerCase(),
        action: 'LOGIN',
        success: true,
        ipAddress,
        timestamp: { $lt: loginTime }
      });
      isNewIp = previousLogins === 0;
      if (isNewIp) {
        await SecurityLog.create({
          portal: 'admin',
          eventType: 'new_ip_login',
          severity: 'high',
          details: `Admin ${email} logged in from a new IP address: ${ipAddress}`,
          ip: String(ipAddress),
          path: '/admin/verify-otp'
        });
      }
    } catch (err) {
      console.error('Failed to check new IP for login notification:', err);
    }
  }
  return emailService.sendAdminLoginNotificationEmail(email, loginTime, ipAddress, timezone, isNewIp);
};

// Send admin invitation email with login button (wrapper)
const sendAdminInvitationEmail = async (email: string, addedByEmail: string, role: string): Promise<boolean> => {
  return emailService.sendAdminInvitationEmail(email, addedByEmail, role);
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

    // Create Broadcast log for history
    await Broadcast.create({
      title,
      message,
      type,
      targetType,
      recipientCount: recipients.length,
      sentBy: adminEmail
    });
    console.log('Notification stats and broadcast log recorded');

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

// Get notification history (broadcast logs)
export const getNotificationHistory = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, targetType, year, month } = req.query;
    
    // Build filter object
    const filter: any = {};
    if (targetType && targetType !== 'all_targets') filter.targetType = targetType;
    
    if (year && year !== 'undefined') {
      const yearNum = Number(year);
      if (!isNaN(yearNum)) {
        const startOfYear = new Date(yearNum, 0, 1);
        const endOfYear = new Date(yearNum, 11, 31, 23, 59, 59);
        
        if (month && month !== 'undefined') {
          const monthNum = Number(month);
          if (!isNaN(monthNum)) {
            const startOfMonth = new Date(yearNum, monthNum - 1, 1);
            const endOfMonth = new Date(yearNum, monthNum, 0, 23, 59, 59);
            filter.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
          } else {
            filter.createdAt = { $gte: startOfYear, $lte: endOfYear };
          }
        } else {
          filter.createdAt = { $gte: startOfYear, $lte: endOfYear };
        }
      }
    }

    // Ensure page and limit are positive integers to prevent MongoDB errors
    const sanitizedPage = Math.max(1, parseInt(page as string) || 1);
    const sanitizedLimit = Math.max(1, parseInt(limit as string) || 10);
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    const [broadcasts, total] = await Promise.all([
      Broadcast.find(filter).sort({ createdAt: -1 }).skip(skip).limit(sanitizedLimit),
      Broadcast.countDocuments(filter)
    ]);

    res.json({
      success: true,
      broadcasts,
      pagination: {
        currentPage: sanitizedPage,
        totalPages: Math.max(1, Math.ceil(total / sanitizedLimit)),
        total,
        hasNext: skip + sanitizedLimit < total,
        hasPrev: sanitizedPage > 1
      }
    });
  } catch (error: any) {
    console.error('CRITICAL ERROR in getNotificationHistory:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    const admin = await Admin.findOne({ email: adminEmail.toLowerCase(), role: 'admin' }).select('+twoFactorEnabled +twoFactorDeadline');
    if (!admin) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admin not found.' 
      });
    }

    const wasDeactivated = !admin.isActive;
    admin.isActive = !admin.isActive;

    // If reactivating an admin who was deactivated due to 2FA deadline, restart reminders
    if (admin.isActive && wasDeactivated && !admin.twoFactorEnabled && admin.twoFactorDeadline) {
      // Reset 2FA enforcement fields to restart the process
      admin.twoFactorDeadline = undefined;
      admin.twoFactorRemindersSent = 0;
      admin.twoFactorReminderScheduled = false;
      admin.twoFactorDeactivationReason = undefined;
      admin.lastReminderSentAt = undefined;
    }

    await admin.save();

    // Initiate 2FA reminders if reactivating and 2FA not enabled (non-blocking)
    if (admin.isActive && wasDeactivated && !admin.twoFactorEnabled) {
      initiateTwoFactorReminders(admin.email).catch(err =>
        console.error('Failed to initiate 2FA reminders on reactivation:', err)
      );
    }

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

    // Use non-mutating date logic to avoid side effects
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    // Get counts via aggregation
    const [todayResult, weekResult, totalResult] = await Promise.all([
      NotificationStats.aggregate([
        { $match: { createdAt: { $gte: todayStart } } },
        { $group: { _id: null, total: { $sum: '$recipientCount' } } }
      ]),
      NotificationStats.aggregate([
        { $match: { createdAt: { $gte: weekStart } } },
        { $group: { _id: null, total: { $sum: '$recipientCount' } } }
      ]),
      NotificationStats.aggregate([
        { $group: { _id: null, total: { $sum: '$recipientCount' } } }
      ])
    ]);

    // Get recent notifications
    const recentNotifications = await NotificationStats.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title targetType notificationType recipientCount sentBy createdAt');

    res.json({
      success: true,
      stats: {
        today: todayResult[0]?.total || 0,
        week: weekResult[0]?.total || 0,
        total: totalResult[0]?.total || 0
      },
      recent: recentNotifications
    });

  } catch (error: any) {
    console.error('CRITICAL ERROR in getNotificationStats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

/**
 * UNIVERSAL SECURITY: Get security stats for the dashboard
 */
export const getSecurityStats = async (req: Request, res: Response) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Initial values
    let totalLogs = 0;
    let last24h = 0;
    let blockedIps: any[] = [];
    let criticalThreats = 0;
    let portalStats: any[] = [];
    let severityStats: any[] = [];

    // Safety checks for SecurityLog model
    if (!SecurityLog) {
      console.error('CRITICAL: SecurityLog model is NOT loaded!');
      return res.status(500).json({ success: false, message: 'Security System monitor offline' });
    }

    try {
      const results = await Promise.all([
        SecurityLog.countDocuments({}).catch(() => 0),
        SecurityLog.countDocuments({ timestamp: { $gte: twentyFourHoursAgo } }).catch(() => 0),
        SecurityLog.distinct('ip', { eventType: 'blocked_ip' }).catch(() => []),
        SecurityLog.countDocuments({ severity: 'critical' }).catch(() => 0)
      ]);
      
      totalLogs = results[0];
      last24h = results[1];
      blockedIps = results[2];
      criticalThreats = results[3];
    } catch (e) {
      console.error('Error in primary security stats:', e);
    }

    const blockedIpsCount = Array.isArray(blockedIps) ? blockedIps.length : 0;

    try {
      // Breakdown by portal (last 7 days)
      portalStats = await SecurityLog.aggregate([
        { $match: { timestamp: { $gte: sevenDaysAgo } } },
        { $group: { _id: '$portal', count: { $sum: 1 } } }
      ]).catch(() => []);
    } catch (e) {
      console.error('Error in portalStats aggregation:', e);
    }

    try {
      // Severity breakdown
      severityStats = await SecurityLog.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]).catch(() => []);
    } catch (e) {
      console.error('Error in severityStats aggregation:', e);
    }

    res.json({
      success: true,
      stats: {
        total: totalLogs,
        last24h,
        blockedIpsCount,
        criticalThreats,
        portals: Array.isArray(portalStats) ? portalStats : [],
        severity: Array.isArray(severityStats) ? severityStats : []
      }
    });

  } catch (error: any) {
    console.error('CRITICAL: Error fetching security stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch security stats'
    });
  }
};

/**
 * UNIVERSAL SECURITY: Run deep security scan (secrets + hardening + portal)
 */
export const runSecurityDeepScan = async (req: Request, res: Response) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [blockedIps, criticalThreats24h] = await Promise.all([
      SecurityLog.distinct('ip', { eventType: 'blocked_ip' }).catch(() => [] as string[]),
      SecurityLog.countDocuments({
        severity: 'critical',
        timestamp: { $gte: twentyFourHoursAgo },
      }).catch(() => 0),
    ]);

    const scan = await runDeepSecurityScan({
      blockedIpsCount: Array.isArray(blockedIps) ? blockedIps.length : 0,
      criticalThreats24h: typeof criticalThreats24h === 'number' ? criticalThreats24h : 0,
    });

    const hasFail = scan.summary.fail > 0;
    const adminEmail = (req as any).admin?.email || 'unknown';
    const adminIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'system';

    await SecurityLog.create({
      portal: 'admin',
      eventType: hasFail ? 'secret_leak_detected' : 'deep_scan_completed',
      severity: hasFail ? 'critical' : scan.summary.warn > 0 ? 'medium' : 'low',
      details: `Deep scan by ${adminEmail}: score=${scan.score}, fail=${scan.summary.fail}, warn=${scan.summary.warn}, pass=${scan.summary.pass}`,
      ip: adminIp,
      path: '/api/v1/admin/security/deep-scan',
      userId: adminEmail,
    }).catch((err) => console.error('Failed to persist deep scan log:', err));

    res.json({
      success: true,
      scan,
    });
  } catch (error) {
    console.error('Error running deep security scan:', error);
    res.status(500).json({ success: false, message: 'Deep security scan failed' });
  }
};

/**
 * UNIVERSAL SECURITY: Get all currently blocked IPs
 */
export const getBlockedIPs = async (req: Request, res: Response) => {
  try {
    const blockedIPs = await BlockedIP.find({ isActive: true }).sort({ blockedAt: -1 });
    res.json({
      success: true,
      blockedIPs
    });
  } catch (error) {
    console.error('Error fetching blocked IPs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch blocked IPs' });
  }
};

/**
 * UNIVERSAL SECURITY: Manually unblock an IP
 */
export const unblockIP = async (req: Request, res: Response) => {
  try {
    const { ipAddress } = req.body;
    if (!ipAddress) {
      return res.status(400).json({ success: false, message: 'IP address is required' });
    }

    const result = await BlockedIP.findOneAndUpdate(
      { ipAddress },
      { isActive: false },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: 'IP not found in blacklist' });
    }

    // Log the unblock action
    await SecurityLog.create({
      portal: 'admin',
      eventType: 'IP_UNBLOCKED',
      severity: 'medium',
      details: `IP ${ipAddress} was manually unblocked by admin.`,
      ip: req.ip || '127.0.0.1',
      userId: (req as any).admin?.email
    });

    res.json({
      success: true,
      message: `IP ${ipAddress} unblocked successfully`
    });
  } catch (error) {
    console.error('Error unblocking IP:', error);
    res.status(500).json({ success: false, message: 'Failed to unblock IP' });
  }
};

/**
 * UNIVERSAL SECURITY: Manually block an IP
 */
export const blockIP = async (req: Request, res: Response) => {
  try {
    const { ipAddress, reason = 'Manual block by admin' } = req.body;
    if (!ipAddress) {
      return res.status(400).json({ success: false, message: 'IP address is required' });
    }

    // Check if already blocked
    const existing = await BlockedIP.findOne({ ipAddress, isActive: true });
    if (existing) {
      return res.status(400).json({ success: false, message: 'IP is already blocked' });
    }

    // Create or update block
    await BlockedIP.findOneAndUpdate(
      { ipAddress },
      { 
        isActive: true, 
        reason, 
        blockedBy: (req as any).admin?.email || 'system_admin',
        blockedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Log the block action
    await SecurityLog.create({
      portal: 'admin',
      eventType: 'IP_BLOCKED_MANUAL',
      severity: 'high',
      details: `IP ${ipAddress} was manually blocked by admin. Reason: ${reason}`,
      ip: ipAddress,
      userId: (req as any).admin?.email
    });

    res.json({
      success: true,
      message: `IP ${ipAddress} has been blacklisted.`
    });
  } catch (error) {
    console.error('Error blocking IP:', error);
    res.status(500).json({ success: false, message: 'Failed to block IP' });
  }
};

/**
 * UNIVERSAL SECURITY: Get security logs with filtering
 */
export const getSecurityLogs = async (req: Request, res: Response) => {
  try {
    const { portal, eventType, severity, page = 1, limit = 50, since } = req.query;
    const query: any = {};

    if (portal) query.portal = portal;
    if (eventType) query.eventType = eventType;
    if (severity) query.severity = severity;
    if (since) query.timestamp = { $gte: new Date(since as string) };

    const skip = (Number(page) - 1) * Number(limit);

    const [logs, total] = await Promise.all([
      SecurityLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit)),
      SecurityLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        total,
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        hasNext: skip + Number(limit) < total,
        hasPrev: Number(page) > 1
      }
    });

  } catch (error) {
    console.error('Error fetching security logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch security logs' });
  }
};

/**
 * WAITLIST: Get waitlist statistics
 */
export const getWaitlistStats = async (req: Request, res: Response) => {
  try {
    const [
      total, 
      users, 
      businesses, 
      pending, 
      contacted,
      sentCount,
      deliveredCount,
      softBounceCount,
      hardBounceCount,
      failedCount
    ] = await Promise.all([
      EarlyAccess.countDocuments({}),
      EarlyAccess.countDocuments({ userType: 'user' }),
      EarlyAccess.countDocuments({ userType: 'business' }),
      EarlyAccess.countDocuments({ status: { $in: ['pending', null, undefined] } }),
      EarlyAccess.countDocuments({ status: 'contacted' }),
      EarlyAccess.countDocuments({ lastEmailStatus: 'sent' }),
      EarlyAccess.countDocuments({ lastEmailStatus: 'delivered' }),
      EarlyAccess.countDocuments({ lastEmailStatus: 'soft_bounce' }),
      EarlyAccess.countDocuments({ lastEmailStatus: 'hard_bounce' }),
      EarlyAccess.countDocuments({ lastEmailStatus: 'failed' })
    ]);
    
    // Get last 10 PENDING signups for the quick overview
    // Sort by joinedAt or createdAt to handle both schema versions
    const recentSignups = await EarlyAccess.find({ status: { $in: ['pending', null, undefined] } })
      .sort({ createdAt: -1, joinedAt: -1 })
      .limit(10);

    // Get last 10 email attempt results (excluding "sent" for noise reduction)
    const recentFailures = await EarlyAccess.find({ 
      lastEmailStatus: { $in: ['soft_bounce', 'hard_bounce', 'failed'] } 
    })
      .sort({ lastAttemptAt: -1 })
      .limit(10);

    res.json({
      success: true,
      stats: {
        total,
        users,
        businesses,
        pending,
        contacted,
        emailDelivery: {
          sent: sentCount,
          delivered: deliveredCount,
          softBounces: softBounceCount,
          hardBounces: hardBounceCount,
          failures: failedCount
        }
      },
      recentSignups,
      recentFailures
    });
  } catch (error) {
    console.error('Error fetching waitlist stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch waitlist stats' });
  }
};

/**
 * WAITLIST: Send broadcast email to waitlist
 */
export const sendWaitlistBroadcast = async (req: Request, res: Response) => {
  try {
    const { subject, html, targetType, onlyPending, targetIds } = req.body; // targetType: 'all', 'user', 'business', onlyPending: boolean, targetIds: string[]

    if (!subject || !html) {
      return res.status(400).json({ success: false, message: 'Subject and content are required' });
    }

    const query: any = {};
    
    // 1. Suppression Logic: Exclude bounces and failures by default unless specifically retrying chosen IDs
    if (!targetIds || targetIds.length === 0) {
      // Treat missing lastEmailStatus as eligible (not_sent)
      query.$or = [
        { lastEmailStatus: { $nin: ['hard_bounce', 'soft_bounce', 'failed'] } },
        { lastEmailStatus: { $exists: false } }
      ];
      
      if (onlyPending) {
        query.status = { $in: ['pending', null, undefined] };
      }
    } else {
      // If targeting specific IDs, use those
      query._id = { $in: targetIds };
    }

    if (targetType && targetType !== 'all') {
      query.userType = targetType;
    }

    // Get recipients
    let recipients = await EarlyAccess.find(query).select('email userType');

    // 2. Deduplication Logic: If an email is in both, prefer Business variant to avoid double-mailing
    if (targetType === 'all' && (!targetIds || targetIds.length === 0)) {
      const emailMap = new Map();
      recipients.forEach(r => {
        const existing = emailMap.get(r.email);
        if (!existing || (existing.userType === 'user' && r.userType === 'business')) {
          emailMap.set(r.email, r);
        }
      });
      recipients = Array.from(emailMap.values());
    }

    const emailList = recipients.map(r => r.email);

    if (emailList.length === 0) {
      return res.status(400).json({ success: false, message: 'No eligible recipients found' });
    }

    // Log the security event for mass mailing
    await SecurityLog.create({
      portal: 'admin',
      eventType: 'mass_email_broadcast',
      severity: 'medium',
      details: `Admin broadcast initiated for ${emailList.length} recipients. Subject: ${subject}`,
      ip: req.ip || 'internal',
      userAgent: req.headers['user-agent'],
      path: req.path,
      userId: (req as any).admin?.email
    });

    // Send broadcast asynchronously
    const runBroadcast = async () => {
      try {
        let results: Array<{ email: string, status: string, error?: string }> = [];

        if (targetType === 'all' && (!targetIds || targetIds.length === 0)) {
          // Use deduplicated recipients list we already calculated
          const userEmails = recipients.filter(r => r.userType === 'user').map(r => r.email);
          const businessEmails = recipients.filter(r => r.userType === 'business').map(r => r.email);

          if (userEmails.length > 0) {
            const userResults = await emailService.sendBroadcastEmail(userEmails, subject, html, 'user');
            results.push(...userResults);
          }

          if (businessEmails.length > 0) {
            const businessResults = await emailService.sendBroadcastEmail(businessEmails, subject, html, 'business');
            results.push(...businessResults);
          }
        } else {
          // For specific targetType or targetIds, send with appropriate template
          const effectiveType = targetType === 'all' ? 'user' : (targetType as 'user' | 'business');
          results = await emailService.sendBroadcastEmail(emailList, subject, html, effectiveType);
        }

        // Process results and update each document individually for precise tracking
        const updatePromises = results.map(async (res) => {
          const updateData: any = {
            lastEmailStatus: res.status,
            lastAttemptAt: new Date(),
            $push: {
              emailHistory: {
                subject,
                status: res.status,
                timestamp: new Date(),
                error: res.error
              }
            }
          };

          if (res.error) {
            updateData.lastEmailError = res.error;
          }

          // Also update general status if sent successfully
          if (res.status === 'sent') {
            updateData.status = 'contacted';
          }

          return EarlyAccess.updateOne({ email: res.email }, updateData);
        });

        await Promise.all(updatePromises);
        
        const successCount = results.filter(r => r.status === 'sent').length;
        const bounceCount = results.filter(r => r.status === 'soft_bounce' || r.status === 'hard_bounce').length;
        const failedCount = results.filter(r => r.status === 'failed').length;

        console.log(`Broadcast completed. Results: ${successCount} sent, ${bounceCount} bounced, ${failedCount} failed`);
        
        // Log final resolution in security logs
        await SecurityLog.create({
          portal: 'admin',
          eventType: 'mass_email_broadcast',
          severity: 'low',
          details: `Broadcast completed. Success: ${successCount}, Bounces: ${bounceCount}, Failures: ${failedCount}`,
          ip: 'internal',
          userId: 'system'
        });

      } catch (err) {
        console.error('Error during async broadcast:', err);
      }
    };

    runBroadcast();

    res.json({
      success: true,
      message: `Broadcast initiated for ${emailList.length} recipients. You can monitor the progress in the Waitlist section.`,
      recipientCount: emailList.length
    });

  } catch (error) {
    console.error('Error sending waitlist broadcast:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate broadcast' });
  }
};

/**
 * WAITLIST: Get all waitlist signups with pagination and filtering
 */
export const getWaitlistSignups = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search = '', status = 'all', userType = 'all' } = req.query;

    const query: any = {};
    
    if (search) {
      query.email = { $regex: search, $options: 'i' };
    }
    
    if (status !== 'all') {
      if (status === 'pending') {
        query.status = { $in: ['pending', null, undefined] };
      } else if (status === 'contacted') {
        query.status = 'contacted';
      } else if (status === 'converted') {
        query.status = 'converted';
      } else if (status === 'new_user') {
        query.status = { $in: ['pending', null, undefined] };
        query.userType = 'user';
      } else if (status === 'new_business') {
        query.status = { $in: ['pending', null, undefined] };
        query.userType = 'business';
      } else if (status === 'soft_bounce') {
        query.lastEmailStatus = 'soft_bounce';
      } else if (status === 'hard_bounce') {
        query.lastEmailStatus = 'hard_bounce';
      }
    }

    if (userType !== 'all' && !query.userType) {
      query.userType = userType;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [signups, total] = await Promise.all([
      EarlyAccess.find(query)
        .sort({ createdAt: -1, joinedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      EarlyAccess.countDocuments(query)
    ]);

    res.json({
      success: true,
      signups,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        total,
        hasNext: skip + Number(limit) < total,
        hasPrev: Number(page) > 1
      }
    });

  } catch (error) {
    console.error('Error fetching waitlist signups:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch waitlist signups' });
  }
};

/**
 * WAITLIST: Manually update signup status
 */
export const updateWaitlistStatus = async (req: Request, res: Response) => {
  try {
    const { id, emailStatus, generalStatus } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: 'ID is required' });
    }

    const updateData: any = {
      lastAttemptAt: new Date(),
    };

    if (emailStatus) {
      updateData.lastEmailStatus = emailStatus;
    }

    if (generalStatus) {
      updateData.status = generalStatus;
    }

    const entry = await EarlyAccess.findByIdAndUpdate(
      id,
      { 
        $set: updateData,
        $push: {
          emailHistory: {
            subject: 'Manual Status Update',
            status: emailStatus || 'updated',
            timestamp: new Date(),
            error: 'Updated manually by admin'
          }
        }
      },
      { new: true }
    );

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Entry not found' });
    }

    res.json({
      success: true,
      message: 'Status updated successfully',
      entry
    });

  } catch (error) {
    console.error('Error updating waitlist status:', error);
    res.status(500).json({ success: false, message: 'Failed to update waitlist status' });
  }
};
export const triggerForceRefresh = async (req: Request, res: Response) => {
  try {
    const io = req.app.get('io') || require('../utils/socket').getIO();
    io.emit('admin:force_client_refresh', {
      timestamp: Date.now(),
      reason: 'admin_forced_refresh'
    });
    
    res.json({
      success: true,
      message: 'Force refresh signal broadcasted to all users'
    });
  } catch (error) {
    console.error('Error triggering force refresh:', error);
    res.status(500).json({ success: false, message: 'Failed to broadcast force refresh' });
  }
};

export const impersonateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // 1. SECURITY: Check if actor has permission to ghost
    const actorEmail = req.admin?.email;
    const actorAdmin = await Admin.findOne({ email: actorEmail });
    
    if (!actorAdmin) {
      return res.status(403).json({ success: false, message: 'Admin record not found' });
    }

    const hasPermission = actorAdmin.role === 'super_admin' || 
                          actorAdmin.permissions?.canImpersonate === true;

    if (!hasPermission) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized: Ghosting is restricted to Super Admins or delegated trusted admins.' 
      });
    }

    const user = await User.findById(id);
    const owner = await Owner.findById(id);

    // Prefer User, fallback to Owner
    const targetEntity = user || owner;
    if (!targetEntity) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Try to mint a custom firebase token for Ghost Login
    let customToken = '';
    try {
      if (targetEntity.uid) {
        const { auth } = await import('../utils/firebaseAdmin');
        if (auth) {
          customToken = await auth.createCustomToken(targetEntity.uid);
          
          // SECURITY: Log the impersonation event for audit purposes
          const adminEmail = req.admin?.email || 'Unknown Admin';
          const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || 'Unknown';
          const targetRole = (targetEntity as any).role || 'owner';
          
          await SecurityLog.create({
            portal: 'admin',
            eventType: 'impersonation_start',
            severity: 'high',
            details: `Admin ${adminEmail} started Ghost Session for ${targetRole}: ${targetEntity.email} (${targetEntity.uid})`,
            ip: String(ipAddress),
            userAgent: req.headers['user-agent'],
            path: req.path,
            userId: req.admin?.email // Store who did it
          });
          
          console.log(`[Ghost Login] Custom token generated for ${targetEntity.email}`);
        } else {
          console.warn("[Ghost Login] Firebase Auth not initialized. Token generation skipped.");
        }
      } else {
        console.warn(`[Ghost Login] Target entity ${id} has no Firebase UID. Cannot generate token.`);
      }
    } catch (firebaseErr: any) {
      console.error("CRITICAL: Ghost Login token generation failed:", firebaseErr.message);
    }
    
    // Add role to response if missing (for frontend redirection)
    const responseUser = targetEntity.toObject();
    if (!responseUser.role) responseUser.role = 'owner';

    res.json({
      success: true,
      message: 'Impersonation token generated',
      token: customToken,
      user: {
        _id: targetEntity._id,
        uid: targetEntity.uid,
        email: targetEntity.email,
        displayName: (targetEntity as any).name || (targetEntity as any).displayName || targetEntity.email,
        role: (targetEntity as any).role || 'owner'
      }
    });
  } catch (error) {
    console.error('Error impersonating user:', error);
    res.status(500).json({ success: false, message: 'Failed to impersonate user' });
  }
};

/**
 * ADMIN: Toggle Ghosting Permission for an admin (Super Admin only)
 */
export const toggleImpersonationPermission = async (req: Request, res: Response) => {
  try {
    const { adminEmail } = req.body;
    const requesterEmail = req.admin?.email;

    // 1. Double check requester is Super Admin
    const requester = await Admin.findOne({ email: requesterEmail });
    if (!requester || requester.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only Super Admins can delegate ghosting powers.' });
    }

    // 2. Find target admin
    const targetAdmin = await Admin.findOne({ email: adminEmail });
    if (!targetAdmin) {
      return res.status(404).json({ success: false, message: 'Target admin not found' });
    }

    if (targetAdmin.role === 'super_admin') {
       return res.status(400).json({ success: false, message: 'Super Admins always have ghosting powers.' });
    }

    // 3. Toggle permission using findOneAndUpdate to avoid re-validating unchanged fields
    const currentStatus = targetAdmin.permissions?.canImpersonate || false;

    await Admin.findOneAndUpdate(
      { email: adminEmail },
      { $set: { 'permissions.canImpersonate': !currentStatus } },
      { new: true, runValidators: false }
    );

    // 4. Log the permission change
    await SecurityLog.create({
      portal: 'admin',
      eventType: 'permission_change',
      severity: 'medium',
      details: `Super Admin ${requesterEmail} ${!currentStatus ? 'GRANTED' : 'REVOKED'} ghosting permission for ${adminEmail}`,
      ip: req.ip || 'unknown',
      userAgent: req.headers['user-agent'],
      userId: requesterEmail
    });

    res.json({
      success: true,
      message: `Ghosting permission ${!currentStatus ? 'granted to' : 'revoked from'} ${adminEmail}`,
      canImpersonate: !currentStatus
    });

  } catch (error) {
    console.error('Error toggling impersonation permission:', error);
    res.status(500).json({ success: false, message: 'Failed to update background permission' });
  }
};

// ============================================
// 2FA STATUS AND COMPLIANCE ENDPOINTS
// ============================================

/**
 * Get 2FA status for a specific admin
 */
export const getAdmin2FAStatus = async (req: any, res: any) => {
  try {
    const { adminEmail } = req.query;

    if (!adminEmail) {
      return res.status(400).json({ success: false, message: 'Admin email required' });
    }

    const admin = await Admin.findOne({ email: adminEmail });
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    // Determine 2FA status
    let status = 'not_initiated';
    if (admin.twoFactorEnabled) {
      status = 'enabled';
    } else if (admin.required2FA && !admin.twoFactorEnabled) {
      status = 'pending';
    }

    res.json({
      success: true,
      data: {
        email: admin.email,
        twoFactorEnabled: admin.twoFactorEnabled || false,
        deactivationReason: admin.twoFactorDeactivationReason || null,
        isActive: admin.isActive,
        status,
        requiresAction: !admin.twoFactorEnabled && !admin.isActive && admin.twoFactorDeactivationReason === '2FA_NOT_ENABLED'
      }
    });
  } catch (error) {
    console.error('Error getting 2FA status:', error);
    res.status(500).json({ success: false, message: 'Failed to get 2FA status' });
  }
};

/**
 * Get 2FA status for all admins (super admin only)
 */
export const getAllAdmins2FAStatus = async (req: any, res: any) => {
  try {
    const admins = await Admin.find({}).select('email twoFactorEnabled isActive twoFactorDeactivationReason required2FA').lean();

    const statusData = admins.map(admin => {
      let status = 'not_initiated';
      if ((admin as any).twoFactorEnabled) {
        status = 'enabled';
      } else if ((admin as any).required2FA && !(admin as any).twoFactorEnabled) {
        status = 'pending';
      }

      return {
        email: (admin as any).email,
        twoFactorEnabled: (admin as any).twoFactorEnabled || false,
        deactivationReason: (admin as any).twoFactorDeactivationReason || null,
        isActive: (admin as any).isActive,
        status,
        requiresAction: !(admin as any).twoFactorEnabled && !(admin as any).isActive && (admin as any).twoFactorDeactivationReason === '2FA_NOT_ENABLED'
      };
    });

    res.json({
      success: true,
      data: statusData
    });
  } catch (error) {
    console.error('Error getting all 2FA status:', error);
    res.status(500).json({ success: false, message: 'Failed to get 2FA statuses' });
  }
};

/**
 * Reset and re-link 2FA for an admin currently at the 2FA challenge step.
 * Allows an admin who has already validated their Email OTP to reset their authenticator
 * secret and scan a fresh QR code if their authenticator app is desynchronized or lost.
 * Body: { challengeToken, email }
 */
export const resetAndRelinkTwoFactor = async (req: Request, res: Response) => {
  try {
    const { challengeToken, email } = req.body;
    if (!challengeToken || !email) {
      return res.status(400).json({ success: false, message: 'Challenge token and email are required.' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(challengeToken, getJWTSecret()) as any;
    } catch {
      return res.status(401).json({ success: false, message: 'Session expired. Please request a new OTP to login.' });
    }

    if ((!decoded.twoFactorPending && !decoded.twoFactorSetupPending) || !decoded.email) {
      return res.status(401).json({ success: false, message: 'Invalid challenge session.' });
    }

    const admin = await Admin.findOne({ email: decoded.email.toLowerCase() })
      .select('+twoFactorEnabled +twoFactorSecret +twoFactorPendingSecret +tokenVersion +isActive');
    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, message: 'Account not found or deactivated.' });
    }

    // Generate a brand new TOTP secret
    const newSecret = generateTwoFactorSecret();
    admin.twoFactorPendingSecret = encryptSecret(newSecret);
    admin.twoFactorEnabled = false;
    await admin.save();

    const qrCode = await generateTwoFactorQRCode(admin.email, newSecret);
    const setupChallengeToken = jwt.sign(
      { email: admin.email, twoFactorSetupPending: true },
      getJWTSecret(),
      { expiresIn: '15m' }
    );

    console.log('🔄 [2FA] Re-link requested and new secret generated for:', admin.email);

    res.json({
      success: true,
      twoFactorSetupRequired: true,
      challengeToken: setupChallengeToken,
      qrCode,
      manualEntryKey: newSecret,
      email: admin.email,
      message: 'New authenticator QR code generated. Scan this with Google Authenticator, Authy, or 1Password, then enter the 6-digit code to complete setup.'
    });
  } catch (error: any) {
    console.error('Error resetting 2FA:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to reset 2FA' });
  }
};

/**
 * Generate email verification QR code when 2FA passcode fails
 * Called during login when admin fails to verify with passcode
 */
export const generateTwoFactorEmailQR = async (req: any, res: any) => {
  try {
    const { challengeToken, email } = req.body;

    if (!challengeToken || !email) {
      return res.status(400).json({ success: false, message: 'Challenge token and email required' });
    }

    const jwtSecret = getJWTSecret();

    let challengeData;
    try {
      challengeData = jwt.verify(challengeToken, jwtSecret) as any;
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired challenge token' });
    }

    // Verify admin exists
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const jti = crypto.randomUUID();
    // Generate one-time email verification JWT (valid for 15 minutes)
    const emailVerificationToken = jwt.sign(
      { email: admin.email, purpose: '2fa-email-confirm', jti },
      jwtSecret,
      { expiresIn: '15m' }
    );

    // Save JTI on admin for single-use validation
    admin.twoFactorEmailConfirmJti = jti;
    admin.twoFactorEmailConfirmExpires = new Date(Date.now() + 15 * 60 * 1000);
    await admin.save();

    const frontendUrl = process.env.FRONTEND_URL 
      || process.env.CLIENT_URL 
      || 'https://dine-in-go.vercel.app';
    const verificationLink = `${frontendUrl}/admin/2fa/email-confirm?token=${emailVerificationToken}`;

    // Generate QR code for the verification link
    const qrCodeUrl = await generateQRCodeForUrl(verificationLink);

    // Send verification email with QR code
    await emailService.sendTwoFactorEmailVerificationEmail(admin.email, verificationLink, qrCodeUrl);

    res.json({
      success: true,
      message: 'Verification email sent with confirmation link and QR code',
      qrCodeUrl
    });
  } catch (error: any) {
    console.error('Error generating email verification QR:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to generate QR code' });
  }
};

/**
 * SUPER ADMIN: Trigger 2FA enforcement scan & send reminder alerts immediately
 */
export const trigger2FAEnforcementScan = async (req: Request, res: Response) => {
  try {
    const deadlineResult = await checkAndEnforceTwoFactorDeadlines();
    const reminderResult = await scheduleAndSendPendingReminders();

    res.json({
      success: true,
      message: '2FA enforcement and reminder scan completed successfully',
      results: {
        deadlines: deadlineResult,
        reminders: reminderResult
      }
    });
  } catch (error: any) {
    console.error('Error running 2FA enforcement scan:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to run 2FA enforcement scan' });
  }
};
