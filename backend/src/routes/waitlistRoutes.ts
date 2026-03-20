import express from 'express';
import * as waitlistController from '../controllers/waitlistController';

const router = express.Router();

// Waitlist routes
router.post('/join', waitlistController.joinWaitlist);
router.post('/early-access', waitlistController.joinEarlyAccess);
router.get('/business/:businessId', waitlistController.getBusinessWaitlist);
router.get('/customer/:customerId/status', waitlistController.getCustomerWaitlistStatus);
router.get('/check-access', waitlistController.checkBetaAccess);
router.patch('/:entryId/notify', waitlistController.notifyCustomer);
router.patch('/:entryId/seated', waitlistController.markAsSeated);
router.delete('/:entryId', waitlistController.cancelWaitlistEntry);

export default router;
