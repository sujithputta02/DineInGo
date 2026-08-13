import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import PasswordReset from '../models/PasswordReset';
import { User } from '../models/User';
import { Owner } from '../models/Owner';
import { Business } from '../models/Business';
import authAdmin from '../utils/firebaseAdmin';
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

        // Verify account exists in User, Owner, or Business model (pre-seeded business owner)
        const userExists = await User.exists({ email: email.toLowerCase() });
        const ownerExists = await Owner.exists({ email: email.toLowerCase() });
        const businessExists = await Business.exists({ ownerId: email.toLowerCase() });

        if (!userExists && !ownerExists && !businessExists) {
            return res.status(404).json({
                success: false,
                message: 'No account found with this email address.'
            });
        }

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

        let updated = false;

        // 1. Check and update User (Customer/User model)
        const user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
            // Hash the password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);
            user.password = hashedPassword;
            user.updatedAt = new Date();
            await user.save();

            // Sync with Firebase Auth using Admin SDK
            if (authAdmin) {
                try {
                    await authAdmin.auth().updateUser(user.uid, {
                        password: newPassword
                    });
                    console.log(`[PasswordReset] Firebase password updated successfully for user UID: ${user.uid}`);
                } catch (firebaseError: any) {
                    console.error(`[PasswordReset] Failed to update Firebase password for user ${user.uid}:`, firebaseError.message);
                }
            }
            updated = true;
        }

        // 2. Check and update Owner (Business Owner model)
        let owner = await Owner.findOne({ email: email.toLowerCase() });
        if (owner) {
            if (!owner.authProviders.includes('password')) {
                owner.authProviders.push('password');
            }
            owner.hasPassword = true;
            owner.updatedAt = new Date();
            await owner.save();

            // Sync with Firebase Auth using Admin SDK
            if (authAdmin) {
                try {
                    await authAdmin.auth().updateUser(owner.uid, {
                        password: newPassword
                    });
                    console.log(`[PasswordReset] Firebase password updated successfully for owner UID: ${owner.uid}`);
                } catch (firebaseError: any) {
                    console.error(`[PasswordReset] Failed to update Firebase password for owner ${owner.uid}:`, firebaseError.message);
                }
            }
            updated = true;
        } else {
            // If Owner document doesn't exist, check if a Business exists with ownerId = email (pre-seeded business owner)
            const business = await Business.findOne({ ownerId: email.toLowerCase() });
            if (business) {
                // They have a business seeded, but no Owner document yet.
                // Register them in Firebase and create their Owner document.
                if (authAdmin) {
                    try {
                        let firebaseUser;
                        try {
                            firebaseUser = await authAdmin.auth().getUserByEmail(email.toLowerCase());
                        } catch (err: any) {
                            if (err.code === 'auth/user-not-found') {
                                // Create user in Firebase
                                firebaseUser = await authAdmin.auth().createUser({
                                    email: email.toLowerCase(),
                                    password: newPassword,
                                    emailVerified: true
                                });
                                console.log(`[PasswordReset] Created new Firebase user for pre-seeded business owner: ${email}`);
                            } else {
                                throw err;
                            }
                        }

                        if (firebaseUser && firebaseUser.uid) {
                            // Update Firebase password to ensure it matches
                            await authAdmin.auth().updateUser(firebaseUser.uid, {
                                password: newPassword
                            });

                            // Create Owner document in MongoDB
                            owner = await Owner.create({
                                uid: firebaseUser.uid,
                                email: email.toLowerCase(),
                                displayName: business.name || 'Business Owner',
                                authProviders: ['password'],
                                hasPassword: true
                            });
                            console.log(`[PasswordReset] Created Owner document for UID: ${firebaseUser.uid}`);

                            // Update the Business ownerId to the new Firebase UID
                            business.ownerId = firebaseUser.uid;
                            await business.save();
                            console.log(`[PasswordReset] Updated Business ownerId to UID: ${firebaseUser.uid}`);

                            updated = true;
                        }
                    } catch (firebaseError: any) {
                        console.error(`[PasswordReset] Failed to register pre-seeded business owner:`, firebaseError.message);
                    }
                }
            }
        }

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Account not found. Password could not be reset.'
            });
        }

        // Delete the reset request
        await PasswordReset.deleteOne({ _id: resetRequest._id });

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
