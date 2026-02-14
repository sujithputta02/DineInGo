import express from 'express';
import * as preOrderController from '../controllers/preOrderController';

const router = express.Router();

// Pre-order routes
router.post('/', preOrderController.createPreOrder);
router.get('/business/:businessId', preOrderController.getBusinessPreOrders);
router.get('/customer/:customerId', preOrderController.getCustomerPreOrders);
router.get('/booking/:bookingId', preOrderController.getPreOrderByBooking);
router.patch('/:preOrderId/status', preOrderController.updatePreOrderStatus);
router.delete('/:preOrderId', preOrderController.cancelPreOrder);
router.get('/business/:businessId/analytics', preOrderController.getPreOrderAnalytics);

export default router;
