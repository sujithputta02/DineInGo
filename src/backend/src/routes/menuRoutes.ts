import express from 'express';
import * as menuController from '../controllers/menuController';

const router = express.Router();

// Category routes
router.post('/categories', menuController.createCategory);
router.get('/categories/:businessId', menuController.getCategories);
router.put('/categories/:categoryId', menuController.updateCategory);
router.delete('/categories/:categoryId', menuController.deleteCategory);

// Menu item routes
router.post('/items', menuController.createMenuItem);
router.get('/items/:businessId', menuController.getMenuItems);
router.get('/menu/:businessId', menuController.getFullMenu); // Get full menu with categories
router.put('/items/:itemId', menuController.updateMenuItem);
router.patch('/items/:itemId/availability', menuController.toggleItemAvailability);
router.delete('/items/:itemId', menuController.deleteMenuItem);

// Bulk operations
router.post('/items/bulk/display-order', menuController.bulkUpdateDisplayOrder);

export default router;
