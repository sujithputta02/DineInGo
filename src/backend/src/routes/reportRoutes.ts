import express from 'express';
import {
  generateAdminReport,
  generateBusinessReport,
  generateUserReport,
  getReports,
} from '../controllers/reportController';

const router = express.Router();

// Admin reports
router.post('/admin/generate', generateAdminReport);

// Business reports
router.post('/business/generate', generateBusinessReport);

// User reports
router.post('/user/generate', generateUserReport);

// Get reports
router.get('/list', getReports);

export default router;
