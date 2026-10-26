import express from 'express';
import * as menuController from '../controllers/menuController';
import { verifyUserToken } from '../middleware/userAuth';

const router = express.Router();

// Public read routes (accessible by customers and guests)
router.get('/categories/:businessId', menuController.getCategories);
router.get('/items/:businessId', menuController.getMenuItems);
router.get('/menu/:businessId', menuController.getFullMenu);

// Category management (authenticated business owners)
router.post('/categories', verifyUserToken, menuController.createCategory);
router.put('/categories/:categoryId', verifyUserToken, menuController.updateCategory);
router.delete('/categories/:categoryId', verifyUserToken, menuController.deleteCategory);

// Menu item management (authenticated business owners)
router.post('/items', verifyUserToken, menuController.createMenuItem);
router.put('/items/:itemId', verifyUserToken, menuController.updateMenuItem);
router.patch('/items/:itemId/availability', verifyUserToken, menuController.toggleItemAvailability);
router.delete('/items/:itemId', verifyUserToken, menuController.deleteMenuItem);

// Bulk operations (authenticated business owners)
router.post('/items/bulk/display-order', verifyUserToken, menuController.bulkUpdateDisplayOrder);

export default router;
