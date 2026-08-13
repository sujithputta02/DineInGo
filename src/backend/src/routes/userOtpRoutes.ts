import express from 'express';
import {
    requestSignupOTP,
    verifySignupOTP,
    requestForgotPasswordOTP,
    verifyForgotPasswordOTP,
    resetPassword
} from '../controllers/userOtpController';

const router = express.Router();

// Signup OTP Routes
router.post('/signup/request', requestSignupOTP);
router.post('/signup/verify', verifySignupOTP);

// Forgot Password OTP Routes
router.post('/forgot-password/request', requestForgotPasswordOTP);
router.post('/forgot-password/verify', verifyForgotPasswordOTP);
router.post('/forgot-password/reset', resetPassword);

export default router;
