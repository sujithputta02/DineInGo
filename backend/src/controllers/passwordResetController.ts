import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import PasswordReset from '../models/PasswordReset';
import { Business } from '../models/Business';
import { sendEmail, emailService } from '../services/emailService';

// Generate 6-digit OTP
const generateOTP = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate secure reset token
const generateResetToken = (): string => {
    return crypto.randomBytes(32).toString('hex');
};

// Request password reset - Send OTP
export const requestPasswordReset = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required' });
        }

        // TODO: Check if business owner exists in proper Owner/User model
        // For now, we'll send OTP to any email address
        // const user = await Business.findOne({ ownerId: email.toLowerCase() });
        // if (!user) {
        //     return res.status(200).json({ 
        //         success: true, 
        //         message: 'If an account exists with this email, an OTP has been sent' 
        //     });
        // }

        // Rate limiting: Check if too many requests in last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentRequests = await PasswordReset.countDocuments({
            email: email.toLowerCase(),
            createdAt: { $gte: oneHourAgo },
        });

        if (recentRequests >= 3) {
            return res.status(429).json({
                success: false,
                message: 'Too many password reset requests. Please try again later.'
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Delete any existing password reset requests for this email
        await PasswordReset.deleteMany({ email: email.toLowerCase() });

        // Create new password reset request
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

        res.status(200).json({
            success: true,
            message: 'OTP has been sent to your email'
        });

    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process password reset request'
        });
    }
};

// Verify OTP
export const verifyOTP = async (req: Request, res: Response) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Email and OTP are required'
            });
        }

        // Find password reset request
        const resetRequest = await PasswordReset.findOne({
            email: email.toLowerCase(),
            otp,
            verified: false,
        });

        if (!resetRequest) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP'
            });
        }

        // Check if expired
        if (new Date() > resetRequest.expiresAt) {
            await PasswordReset.deleteOne({ _id: resetRequest._id });
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new one.'
            });
        }

        // Generate reset token
        const resetToken = generateResetToken();
        resetRequest.resetToken = resetToken;
        resetRequest.verified = true;
        await resetRequest.save();

        res.status(200).json({
            success: true,
            message: 'OTP verified successfully',
            resetToken
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify OTP'
        });
    }
};

// Reset password
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { email, resetToken, newPassword } = req.body;

        if (!email || !resetToken || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Email, reset token, and new password are required'
            });
        }

        // Validate password strength
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long'
            });
        }

        // Find verified reset request
        const resetRequest = await PasswordReset.findOne({
            email: email.toLowerCase(),
            resetToken,
            verified: true,
        });

        if (!resetRequest) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        // Check if expired
        if (new Date() > resetRequest.expiresAt) {
            await PasswordReset.deleteOne({ _id: resetRequest._id });
            return res.status(400).json({
                success: false,
                message: 'Reset token has expired. Please start over.'
            });
        }

        // TODO: Update password in proper Owner/User authentication model
        // For now, just delete the reset request and return success
        // In production, this should update the user's password in the database

        // Placeholder: Hash the password (for demonstration)
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        console.log('Password would be updated for:', email);
        console.log('Hashed password:', hashedPassword);

        // Delete the reset request
        await PasswordReset.deleteOne({ _id: resetRequest._id });

        // Return success (in production, only after actually updating the password)
        return res.status(200).json({
            success: true,
            message: 'Password reset successful. You can now login with your new password.'
        });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password'
        });
    }
};
