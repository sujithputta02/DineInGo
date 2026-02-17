import express from 'express';
import {
  submitIssueReport,
  getAllIssueReports,
  getUserIssueReports,
  getBusinessIssueReports,
  updateIssueReportStatus,
  getIssueReportStats,
} from '../controllers/issueReportController';

const router = express.Router();

// Submit issue report (Public - anyone can report)
router.post('/submit', submitIssueReport);

// Get all issue reports (Admin)
router.get('/admin/all', getAllIssueReports);

// Get issue report statistics (Admin)
router.get('/admin/stats', getIssueReportStats);

// Update issue report status (Admin)
router.patch('/admin/:issueId/status', updateIssueReportStatus);

// Get user's issue reports
router.get('/user/:userId', getUserIssueReports);

// Get business issue reports
router.get('/business/:businessId', getBusinessIssueReports);

export default router;
