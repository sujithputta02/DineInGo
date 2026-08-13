import express from 'express';
import * as waitlistController from '../controllers/waitlistController';
import { 
    signupRateLimiter, 
    validateHoneypot, 
    checkSignupSecurity,
    logSignupAttempt 
} from '../middleware/signupSecurityMiddleware';

const router = express.Router();

// Waitlist routes with security layers
router.post('/join', waitlistController.joinWaitlist);

// Early access route with FULL SECURITY STACK
router.post(
    '/early-access',
    signupRateLimiter,          // Rate limiting (5 attempts per 15 min)
    logSignupAttempt,            // Log all attempts
    validateHoneypot,            // Check honeypot fields
    checkSignupSecurity,         // Device fingerprinting & IP tracking
    waitlistController.joinEarlyAccess
);

router.get('/business/:businessId', waitlistController.getBusinessWaitlist);
router.get('/customer/:customerId/status', waitlistController.getCustomerWaitlistStatus);
router.get('/check-access', waitlistController.checkBetaAccess);
router.patch('/:entryId/notify', waitlistController.notifyCustomer);
router.patch('/:entryId/seated', waitlistController.markAsSeated);
router.delete('/:entryId', waitlistController.cancelWaitlistEntry);

export default router;
