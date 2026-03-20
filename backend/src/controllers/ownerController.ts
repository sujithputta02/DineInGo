import { Request, Response } from 'express';
import { Owner } from '../models/Owner';
import { emailService } from '../services/emailService';
import securityConfig from '../config/security';

// Determine auth provider from request
const getAuthProvider = (req: Request): string => {
    // If photoURL contains 'googleusercontent', it's Google
    const { photoURL } = req.body;
    if (photoURL && photoURL.includes('googleusercontent')) {
        return 'google.com';
    }
    // Default to password for manual signups
    return 'password';
};

// Register or link owner account
export const registerOrLinkOwner = async (req: Request, res: Response) => {
    try {
        const { uid, email, displayName, photoURL } = req.body;

        if (!uid || !email || !displayName) {
            return res.status(400).json({
                success: false,
                message: 'UID, email, and display name are required',
            });
        }

        const provider = getAuthProvider(req);

        // Check if owner already exists by email
        let owner = await Owner.findOne({ email: email.toLowerCase() });

        if (owner) {
            // Owner exists - check if we need to link provider
            if (!owner.authProviders.includes(provider)) {
                owner.authProviders.push(provider);

                // Update hasPassword flag if password provider
                if (provider === 'password') {
                    owner.hasPassword = true;
                }

                // Update Firebase UID if different (in case of linking)
                if (owner.uid !== uid) {
                    owner.uid = uid;
                }

                // Update photo if provided and not set
                if (photoURL && !owner.photoURL) {
                    owner.photoURL = photoURL;
                }

                await owner.save();

                return res.status(200).json({
                    success: true,
                    message: 'Account linked successfully',
                    owner: {
                        uid: owner.uid,
                        email: owner.email,
                        displayName: owner.displayName,
                        photoURL: owner.photoURL,
                        authProviders: owner.authProviders,
                        hasPassword: owner.hasPassword,
                    },
                    linked: true,
                    linkedProvider: provider,
                });
            } else {
                // Provider already linked, just return owner data
                return res.status(200).json({
                    success: true,
                    message: 'Login successful',
                    owner: {
                        uid: owner.uid,
                        email: owner.email,
                        displayName: owner.displayName,
                        photoURL: owner.photoURL,
                        authProviders: owner.authProviders,
                        hasPassword: owner.hasPassword,
                    },
                    linked: false,
                });
            }
        } else {
            // BETA ACCESS GUARD: Check if on early access list (only in beta mode)
            if (securityConfig.betaOnly) {
                const { EarlyAccess } = await import('../models/EarlyAccess');
                const hasAccess = await EarlyAccess.findOne({ 
                    email: email.toLowerCase(),
                    userType: 'business'
                });

                if (!hasAccess) {
                    return res.status(403).json({ 
                        success: false, 
                        message: "Dino says: This email isn't on the business waitlist yet! Please join the waitlist to get beta access." 
                    });
                }
            }

            // New owner - create account
            owner = await Owner.create({
                uid,
                email: email.toLowerCase(),
                displayName,
                photoURL,
                authProviders: [provider],
                hasPassword: provider === 'password',
            });

            // Send business welcome email (non-blocking)
            emailService.sendBusinessWelcomeEmail(email, displayName).catch((emailError: any) => 
               console.error('Failed to send business welcome email:', emailError)
            );

            return res.status(201).json({
                success: true,
                message: 'Account created successfully',
                owner: {
                    uid: owner.uid,
                    email: owner.email,
                    displayName: owner.displayName,
                    photoURL: owner.photoURL,
                    authProviders: owner.authProviders,
                    hasPassword: owner.hasPassword,
                },
                linked: false,
                isNewAccount: true,
            });
        }
    } catch (error: any) {
        console.error('Register/Link Owner Error:', error);

        // Handle duplicate key errors
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email or UID already exists',
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to register or link account',
            error: error.message,
        });
    }
};

// Get owner profile
export const getOwnerProfile = async (req: Request, res: Response) => {
    try {
        const { uid } = req.params;

        if (!uid) {
            return res.status(400).json({
                success: false,
                message: 'UID is required',
            });
        }

        const owner = await Owner.findOne({ uid });

        if (!owner) {
            return res.status(404).json({
                success: false,
                message: 'Owner not found',
            });
        }

        res.status(200).json({
            success: true,
            owner: {
                uid: owner.uid,
                email: owner.email,
                displayName: owner.displayName,
                photoURL: owner.photoURL,
                authProviders: owner.authProviders,
                hasPassword: owner.hasPassword,
                createdAt: owner.createdAt,
            },
        });
    } catch (error: any) {
        console.error('Get Owner Profile Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch owner profile',
        });
    }
};

// Link Google account to existing owner
export const linkGoogleAccount = async (req: Request, res: Response) => {
    try {
        const { uid, email } = req.body;

        if (!uid || !email) {
            return res.status(400).json({
                success: false,
                message: 'UID and email are required',
            });
        }

        const owner = await Owner.findOne({ uid });

        if (!owner) {
            return res.status(404).json({
                success: false,
                message: 'Owner not found',
            });
        }

        // Verify email matches
        if (owner.email.toLowerCase() !== email.toLowerCase()) {
            return res.status(400).json({
                success: false,
                message: 'Email does not match account email',
            });
        }

        // Add Google provider if not already linked
        if (!owner.authProviders.includes('google.com')) {
            owner.authProviders.push('google.com');
            await owner.save();

            return res.status(200).json({
                success: true,
                message: 'Google account linked successfully',
                owner: {
                    uid: owner.uid,
                    email: owner.email,
                    authProviders: owner.authProviders,
                },
            });
        } else {
            return res.status(200).json({
                success: true,
                message: 'Google account already linked',
                owner: {
                    uid: owner.uid,
                    email: owner.email,
                    authProviders: owner.authProviders,
                },
            });
        }
    } catch (error: any) {
        console.error('Link Google Account Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to link Google account',
        });
    }
};

// Set password for Google-only accounts
export const setPassword = async (req: Request, res: Response) => {
    try {
        const { uid } = req.body;

        if (!uid) {
            return res.status(400).json({
                success: false,
                message: 'UID is required',
            });
        }

        const owner = await Owner.findOne({ uid });

        if (!owner) {
            return res.status(404).json({
                success: false,
                message: 'Owner not found',
            });
        }

        // Add password provider if not already set
        if (!owner.authProviders.includes('password')) {
            owner.authProviders.push('password');
            owner.hasPassword = true;
            await owner.save();

            return res.status(200).json({
                success: true,
                message: 'Password set successfully',
                owner: {
                    uid: owner.uid,
                    email: owner.email,
                    authProviders: owner.authProviders,
                    hasPassword: owner.hasPassword,
                },
            });
        } else {
            return res.status(200).json({
                success: true,
                message: 'Password already set',
                owner: {
                    uid: owner.uid,
                    email: owner.email,
                    authProviders: owner.authProviders,
                    hasPassword: owner.hasPassword,
                },
            });
        }
    } catch (error: any) {
        console.error('Set Password Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to set password',
        });
    }
};
