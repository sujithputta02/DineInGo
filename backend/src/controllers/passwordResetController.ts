import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import PasswordReset from '../models/PasswordReset';
import { Business } from '../models/Business';
import { sendEmail } from '../services/emailService';

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

        // Send OTP email
        const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Arial', sans-serif; background-color: #f6f9ff; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #00F29D 0%, #facc15 100%); padding: 40px 20px; text-align: center; }
            .logo { font-size: 2.5rem; font-weight: bold; color: #000; margin-bottom: 10px; }
            .logo .yellow { color: #000; }
            .business-tag { font-size: 1rem; font-weight: 700; letter-spacing: 0.3em; color: #000; margin-top: 8px; }
            .content { padding: 40px 30px; }
            .otp-box { background: #f6f9ff; border: 2px solid #00F29D; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; }
            .otp-code { font-size: 3rem; font-weight: 900; color: #00F29D; letter-spacing: 0.3em; margin: 10px 0; }
            .footer { background: #1a1a2e; color: rgba(255,255,255,0.7); padding: 30px; text-align: center; font-size: 0.9rem; }
            .button { display: inline-block; background: #00F29D; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">DineIn<span class="yellow">Go</span></div>
              <div class="business-tag">BUSINESS</div>
            </div>
            <div class="content">
              <h2 style="color: #1a1a2e; margin-bottom: 20px;">Password Reset Request</h2>
              <p style="color: #666; font-size: 1.1rem; line-height: 1.6;">
                We received a request to reset your password. Use the OTP below to verify your identity:
              </p>
              <div class="otp-box">
                <p style="color: #666; margin: 0; font-size: 0.9rem;">Your OTP Code</p>
                <div class="otp-code">${otp}</div>
                <p style="color: #999; margin: 10px 0 0 0; font-size: 0.85rem;">Valid for 10 minutes</p>
              </div>
              <p style="color: #666; font-size: 0.95rem; line-height: 1.6;">
                If you didn't request this password reset, please ignore this email or contact support if you have concerns.
              </p>
            </div>
            <div class="footer">
              <p>© 2026 DineInGo Business. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

        await sendEmail({
            to: email,
            subject: 'Password Reset OTP - DineInGo Business',
            html: emailHtml,
        });

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
