import { Request, Response } from 'express';
import { IssueReport } from '../models/IssueReport';

// Submit an issue report
export const submitIssueReport = async (req: Request, res: Response) => {
  try {
    const {
      reporterType,
      reporterId,
      reporterEmail,
      reporterName,
      issueType,
      priority,
      title,
      description,
      stepsToReproduce,
      expectedBehavior,
      actualBehavior,
      browserInfo,
      deviceInfo,
      screenshots,
    } = req.body;

    const issueReport = await IssueReport.create({
      reporterType,
      reporterId,
      reporterEmail,
      reporterName,
      issueType,
      priority: priority || 'medium',
      title,
      description,
      stepsToReproduce,
      expectedBehavior,
      actualBehavior,
      browserInfo,
      deviceInfo,
      screenshots: screenshots || [],
      status: 'open',
    });

    // Emit socket event for real-time notification to admins
    const io = (req.app as any).get('io');
    if (io) {
      io.emit('newIssueReport', {
        issueId: issueReport._id,
        title: issueReport.title,
        issueType: issueReport.issueType,
        priority: issueReport.priority,
        reporterType: issueReport.reporterType,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Issue report submitted successfully',
      issueReport: {
        id: issueReport._id,
        title: issueReport.title,
        status: issueReport.status,
      },
    });
  } catch (error) {
    console.error('Error submitting issue report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit issue report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get all issue reports (Admin)
export const getAllIssueReports = async (req: Request, res: Response) => {
  try {
    const { status, issueType, priority, limit = 50 } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (issueType) query.issueType = issueType;
    if (priority) query.priority = priority;

    const issueReports = await IssueReport.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    const stats = await IssueReport.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      issueReports,
      stats,
      total: issueReports.length,
    });
  } catch (error) {
    console.error('Error fetching issue reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch issue reports',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get user's issue reports
export const getUserIssueReports = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const issueReports = await IssueReport.find({ reporterId: userId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      issueReports,
    });
  } catch (error) {
    console.error('Error fetching user issue reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch issue reports',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get business issue reports
export const getBusinessIssueReports = async (req: Request, res: Response) => {
  try {
    const { businessId } = req.params;

    const issueReports = await IssueReport.find({ reporterId: businessId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      issueReports,
    });
  } catch (error) {
    console.error('Error fetching business issue reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch issue reports',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Update issue report status (Admin)
export const updateIssueReportStatus = async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const { status, assignedTo, resolution } = req.body;

    const updateData: any = { status };
    if (assignedTo) updateData.assignedTo = assignedTo;
    if (resolution) updateData.resolution = resolution;
    if (status === 'resolved' || status === 'closed') {
      updateData.resolvedAt = new Date();
    }

    const issueReport = await IssueReport.findByIdAndUpdate(
      issueId,
      updateData,
      { new: true }
    );

    if (!issueReport) {
      return res.status(404).json({
        success: false,
        message: 'Issue report not found',
      });
    }

    // Emit socket event to notify the reporter
    const io = (req.app as any).get('io');
    if (io && issueReport.reporterId) {
      io.to(`${issueReport.reporterType}_${issueReport.reporterId}`).emit('issueReportUpdated', {
        issueId: issueReport._id,
        status: issueReport.status,
        resolution: issueReport.resolution,
      });
    }

    res.json({
      success: true,
      message: 'Issue report updated successfully',
      issueReport,
    });
  } catch (error) {
    console.error('Error updating issue report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update issue report',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get issue report statistics (Admin)
export const getIssueReportStats = async (req: Request, res: Response) => {
  try {
    const [statusStats, typeStats, priorityStats, recentIssues] = await Promise.all([
      IssueReport.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      IssueReport.aggregate([
        {
          $group: {
            _id: '$issueType',
            count: { $sum: 1 },
          },
        },
      ]),
      IssueReport.aggregate([
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 },
          },
        },
      ]),
      IssueReport.find({ status: 'open' })
        .sort({ priority: -1, createdAt: -1 })
        .limit(10),
    ]);

    const totalIssues = await IssueReport.countDocuments();
    const openIssues = await IssueReport.countDocuments({ status: 'open' });
    const criticalIssues = await IssueReport.countDocuments({ 
      status: 'open', 
      priority: 'critical' 
    });

    res.json({
      success: true,
      stats: {
        total: totalIssues,
        open: openIssues,
        critical: criticalIssues,
        byStatus: statusStats,
        byType: typeStats,
        byPriority: priorityStats,
      },
      recentIssues,
    });
  } catch (error) {
    console.error('Error fetching issue report stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch issue report statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
