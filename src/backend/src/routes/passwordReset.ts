import express from 'express';
import {
    requestPasswordReset,
    verifyOTP,
    resetPassword
} from '../controllers/passwordResetController';

const router = express.Router();

// Request password reset - sends OTP to email
router.post('/request', requestPasswordReset);

// Verify OTP
router.post('/verify-otp', verifyOTP);

// Reset password with verified token
router.post('/reset', resetPassword);

export default router;
