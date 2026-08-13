import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import PasswordReset from '../models/PasswordReset';
import { User } from '../models/User';
import { sendEmail, emailService } from '../services/emailService';
import authAdmin from '../utils/firebaseAdmin';
import securityConfig from '../config/security';

// Generate 6-digit OTP
const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate secure reset token
const generateResetToken = (): string => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Request OTP for Signup
 */
export const requestSignupOTP = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        // Check if user already exists
        const emailLower = email.toLowerCase();
        const existingUser = await User.findOne({ email: emailLower });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // BETA ACCESS GUARD: Check if on early access list (only in beta mode)
        if (securityConfig.betaOnly) {
            const { EarlyAccess } = await import('../models/EarlyAccess');
            const hasAccess = await EarlyAccess.findOne({ 
                email: emailLower,
                userType: 'user'
            });

            if (!hasAccess) {
                return res.status(403).json({ 
                    success: false, 
                    message: "Dino says: This email isn't on the waitlist yet! Please join the waitlist to get beta access." 
                });
            }
        }

        // Rate limiting: Check if too many requests
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentRequests = await PasswordReset.countDocuments({
            email: email.toLowerCase(),
            createdAt: { $gte: oneHourAgo },
        });

        if (recentRequests >= 5) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please try again later.'
            });
        }

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Delete any existing requests
        await PasswordReset.deleteMany({ email: email.toLowerCase() });

        await PasswordReset.create({
            email: email.toLowerCase(),
            otp,
            expiresAt,
            verified: false,
        });

        // Send OTP email (now blocking for better error feedback)
        console.log(`Sending signup OTP email to: ${email}`);
        const emailSent = await emailService.sendOTPEmail(emailLower, otp, 'signup');
        
        if (emailSent) {
            console.log(`✅ Signup OTP email sent successfully to: ${email}`);
            return res.status(200).json({ 
                success: true, 
                message: 'OTP sent successfully. Please check your inbox (and spam folder).' 
            });
        } else {
            console.error(`❌ Failed to send signup OTP email to: ${email}`);
            return res.status(500).json({ 
                success: false, 
                message: 'Dino had trouble sending the email! Please check your email address or try again later.' 
            });
        }
    } catch (error) {
        console.error('Request signup OTP error:', error);
        res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
};

/**
 * Verify Signup OTP
 */
export const verifySignupOTP = async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required' });
        }

        const resetRecord = await PasswordReset.findOne({
            email: email.toLowerCase(),
            otp,
            verified: false
        });

        if (!resetRecord) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        if (new Date() > resetRecord.expiresAt) {
            await PasswordReset.deleteOne({ _id: resetRecord._id });
            return res.status(400).json({ success: false, message: 'OTP has expired' });
        }

        resetRecord.verified = true;
        await resetRecord.save();

        res.status(200).json({ success: true, message: 'OTP verified successfully' });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ success: false, message: 'Failed to verify OTP' });
    }
};

/**
 * Request OTP for Forgot Password
 */
export const requestForgotPasswordOTP = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            // For security, don't reveal if user doesn't exist?
            // "If an account exists, an OTP has been sent"
            return res.status(200).json({ success: true, message: 'If an account exists, an OTP has been sent' });
        }

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await PasswordReset.deleteMany({ email: email.toLowerCase() });
        await PasswordReset.create({
            email: email.toLowerCase(),
            otp,
            expiresAt,
            verified: false,
        });

        // Send OTP email (non-blocking)
        emailService.sendOTPEmail(email, otp, 'password-reset').catch(err =>
            console.error('Failed to send password-reset OTP email:', err)
        );

        res.status(200).json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Request forgot password OTP error:', error);
        res.status(500).json({ success: false, message: 'Failed to send OTP' });
    }
};

/**
 * Verify Forgot Password OTP
 */
export const verifyForgotPasswordOTP = async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Email and OTP are required' });
        }

        const resetRecord = await PasswordReset.findOne({
            email: email.toLowerCase(),
            otp,
            verified: false
        });

        if (!resetRecord) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        if (new Date() > resetRecord.expiresAt) {
            await PasswordReset.deleteOne({ _id: resetRecord._id });
            return res.status(400).json({ success: false, message: 'OTP has expired' });
        }

        const resetToken = generateResetToken();
        resetRecord.verified = true;
        resetRecord.resetToken = resetToken;
        await resetRecord.save();

        res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
            resetToken
        });
    } catch (error) {
        console.error('Verify forgot password OTP error:', error);
        res.status(500).json({ success: false, message: 'Failed to verify OTP' });
    }
};

/**
 * Reset Password
 */
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { email, resetToken, newPassword } = req.body;

        if (!email || !resetToken || !newPassword) {
            return res.status(400).json({ success: false, message: 'Email, reset token, and new password are required' });
        }

        const resetRecord = await PasswordReset.findOne({
            email: email.toLowerCase(),
            resetToken,
            verified: true
        });

        if (!resetRecord) {
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        }

        if (new Date() > resetRecord.expiresAt) {
            await PasswordReset.deleteOne({ _id: resetRecord._id });
            return res.status(400).json({ success: false, message: 'Reset token has expired' });
        }

        // Update password in MongoDB User model
        const user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
            // 1. Sync with Firebase Auth using Admin SDK
            if (authAdmin) {
                try {
                    await authAdmin.auth().updateUser(user.uid, {
                        password: newPassword
                    });
                    console.log(`[FirebaseSync] Password updated successfully for UID: ${user.uid}`);
                } catch (firebaseError: any) {
                    console.error(`[FirebaseSync] Failed to update Firebase password for ${user.uid}:`, firebaseError.message);
                    // If Firebase update fails, we should NOT proceed with DB update to keep them in sync
                    // but since this is a reset, we might want to allow it if the user was local-only (unlikely)
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Failed to sync password with authentication server. Please try again.' 
                    });
                }
            }

            // 2. Update hashed password in MongoDB
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
            user.updatedAt = new Date();
            await user.save();
        }

        await PasswordReset.deleteOne({ _id: resetRecord._id });

        res.status(200).json({ success: true, message: 'Password reset successful' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
};
