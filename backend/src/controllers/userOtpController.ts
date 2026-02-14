import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import PasswordReset from '../models/PasswordReset';
import { User } from '../models/User';
import { sendEmail } from '../services/emailService';

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
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
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

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <h2 style="color: #10b981; text-align: center;">Verify Your Email</h2>
                <p>Hello,</p>
                <p>Thank you for choosing DineInGo! Use the following OTP to verify your email address and complete your registration:</p>
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #10b981;">${otp}</span>
                </div>
                <p style="color: #6b7280; font-size: 14px;">This OTP is valid for 10 minutes. If you didn't request this, please ignore this email.</p>
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                <p style="text-align: center; color: #9ca3af; font-size: 12px;">© 2026 DineInGo. All rights reserved.</p>
            </div>
        `;

        await sendEmail({
            to: email,
            subject: 'Email Verification OTP - DineInGo',
            html: emailHtml,
        });

        res.status(200).json({ success: true, message: 'OTP sent successfully' });
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

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
                <h2 style="color: #10b981; text-align: center;">Reset Your Password</h2>
                <p>Hello,</p>
                <p>We received a request to reset your DineInGo password. Use the following OTP to proceed:</p>
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #10b981;">${otp}</span>
                </div>
                <p style="color: #6b7280; font-size: 14px;">This OTP is valid for 10 minutes. If you didn't request this, please ignore this email.</p>
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
                <p style="text-align: center; color: #9ca3af; font-size: 12px;">© 2026 DineInGo. All rights reserved.</p>
            </div>
        `;

        await sendEmail({
            to: email,
            subject: 'Password Reset OTP - DineInGo',
            html: emailHtml,
        });

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
        // Note: For Firebase users, this won't change the Firebase password
        // unless Firebase Admin SDK is integrated.
        const user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
            // We should hash the password before saving
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
            await user.save();
        }

        await PasswordReset.deleteOne({ _id: resetRecord._id });

        res.status(200).json({ success: true, message: 'Password reset successful' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ success: false, message: 'Failed to reset password' });
    }
};
