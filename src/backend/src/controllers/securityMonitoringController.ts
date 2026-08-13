/**
 * SECURITY MONITORING CONTROLLER
 * Provides real-time security metrics and monitoring for admin portal
 */

import { Request, Response } from 'express';
import { AdminAuditLog } from '../middleware/adminAuditLog';
import { BusinessAuditLog } from '../middleware/businessAuditLog';
import { User } from '../models/User';
import { Business } from '../models/Business';

/**
 * Get security dashboard overview
 */
export const getSecurityDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Failed login attempts (last 24 hours)
    const failedLogins = await AdminAuditLog.countDocuments({
      action: { $in: ['VERIFY_OTP', 'LOGIN'] },
      success: false,
      timestamp: { $gte: last24Hours }
    });

    // Suspicious IPs (multiple failed attempts)
    const suspiciousIPs = await AdminAuditLog.aggregate([
      {
        $match: {
          success: false,
          timestamp: { $gte: last24Hours }
        }
      },
      {
        $group: {
          _id: '$ipAddress',
          failedAttempts: { $sum: 1 },
          actions: { $push: '$action' }
        }
      },
      {
        $match: {
          failedAttempts: { $gte: 3 }
        }
      },
      {
        $sort: { failedAttempts: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Rate limit violations (estimated from failed requests)
    const rateLimitViolations = await AdminAuditLog.countDocuments({
      responseStatus: 429,
      timestamp: { $gte: last24Hours }
    });

    // Active admin sessions
    const activeAdmins = await AdminAuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: new Date(now.getTime() - 30 * 60 * 1000) } // Last 30 minutes
        }
      },
      {
        $group: {
          _id: '$adminEmail',
          lastActivity: { $max: '$timestamp' },
          actionsCount: { $sum: 1 }
        }
      }
    ]);

    // Security events by type (last 7 days)
    const securityEventsByType = await AdminAuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: last7Days }
        }
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          successCount: {
            $sum: { $cond: ['$success', 1, 0] }
          },
          failureCount: {
            $sum: { $cond: ['$success', 0, 1] }
          }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Business security events
    const businessSecurityEvents = await BusinessAuditLog.countDocuments({
      success: false,
      timestamp: { $gte: last24Hours }
    });

    // User account security
    const lockedAccounts = await User.countDocuments({
      'accountLockout.isLocked': true
    });

    res.json({
      success: true,
      data: {
        overview: {
          failedLogins,
          rateLimitViolations,
          suspiciousIPCount: suspiciousIPs.length,
          activeAdminSessions: activeAdmins.length,
          businessSecurityEvents,
          lockedUserAccounts: lockedAccounts
        },
        suspiciousIPs,
        activeAdmins,
        securityEventsByType,
        lastUpdated: now
      }
    });
  } catch (error) {
    console.error('Error fetching security dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching security dashboard'
    });
  }
};

/**
 * Get detailed audit logs with filtering
 */
export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      portal = 'all', // admin, business, user, all
      action,
      adminEmail,
      ownerId,
      startDate,
      endDate,
      success,
      ipAddress,
      page = 1,
      limit = 50
    } = req.query;

    const query: any = {};

    // Date range filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate as string);
      if (endDate) query.timestamp.$lte = new Date(endDate as string);
    }

    // Success/failure filter
    if (success !== undefined) {
      query.success = success === 'true';
    }

    // IP address filter
    if (ipAddress) {
      query.ipAddress = ipAddress;
    }

    let logs: any[] = [];
    let total = 0;

    const skip = (Number(page) - 1) * Number(limit);

    if (portal === 'admin' || portal === 'all') {
      const adminQuery = { ...query };
      if (action) adminQuery.action = action;
      if (adminEmail) adminQuery.adminEmail = adminEmail;

      const adminLogs = await AdminAuditLog.find(adminQuery)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean();

      logs = [...logs, ...adminLogs.map(log => ({ ...log, portal: 'admin' }))];
      total += await AdminAuditLog.countDocuments(adminQuery);
    }

    if (portal === 'business' || portal === 'all') {
      const businessQuery = { ...query };
      if (action) businessQuery.action = action;
      if (ownerId) businessQuery.ownerId = ownerId;

      const businessLogs = await BusinessAuditLog.find(businessQuery)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean();

      logs = [...logs, ...businessLogs.map(log => ({ ...log, portal: 'business' }))];
      total += await BusinessAuditLog.countDocuments(businessQuery);
    }

    // Sort combined logs by timestamp
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      success: true,
      data: {
        logs: logs.slice(0, Number(limit)),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching audit logs'
    });
  }
};

/**
 * Get suspicious activity report
 */
export const getSuspiciousActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { hours = 24 } = req.query;
    const since = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);

    // Admin portal suspicious activity
    const adminSuspicious = await AdminAuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: since }
        }
      },
      {
        $group: {
          _id: {
            ipAddress: '$ipAddress',
            adminEmail: '$adminEmail'
          },
          totalActions: { $sum: 1 },
          failedActions: {
            $sum: { $cond: ['$success', 0, 1] }
          },
          actions: { $push: '$action' },
          timestamps: { $push: '$timestamp' }
        }
      },
      {
        $match: {
          $or: [
            { failedActions: { $gte: 5 } }, // 5+ failed actions
            { totalActions: { $gte: 100 } } // 100+ actions in time period
          ]
        }
      },
      {
        $sort: { failedActions: -1, totalActions: -1 }
      }
    ]);

    // Business portal suspicious activity
    const businessSuspicious = await BusinessAuditLog.aggregate([
      {
        $match: {
          timestamp: { $gte: since }
        }
      },
      {
        $group: {
          _id: {
            ipAddress: '$ipAddress',
            ownerId: '$ownerId'
          },
          totalActions: { $sum: 1 },
          failedActions: {
            $sum: { $cond: ['$success', 0, 1] }
          },
          actions: { $push: '$action' }
        }
      },
      {
        $match: {
          $or: [
            { failedActions: { $gte: 5 } },
            { totalActions: { $gte: 200 } }
          ]
        }
      },
      {
        $sort: { failedActions: -1, totalActions: -1 }
      }
    ]);

    // Locked user accounts
    const lockedAccounts = await User.find({
      'accountLockout.isLocked': true
    }).select('uid email displayName accountLockout').lean();

    res.json({
      success: true,
      data: {
        adminPortal: {
          suspiciousCount: adminSuspicious.length,
          details: adminSuspicious
        },
        businessPortal: {
          suspiciousCount: businessSuspicious.length,
          details: businessSuspicious
        },
        lockedAccounts: {
          count: lockedAccounts.length,
          accounts: lockedAccounts
        },
        timeRange: `Last ${hours} hours`,
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error fetching suspicious activity:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching suspicious activity'
    });
  }
};

/**
 * Get rate limit statistics
 */
export const getRateLimitStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Count rate limit violations by endpoint
    const rateLimitViolations = await AdminAuditLog.aggregate([
      {
        $match: {
          responseStatus: 429,
          timestamp: { $gte: last24Hours }
        }
      },
      {
        $group: {
          _id: {
            path: '$path',
            ipAddress: '$ipAddress'
          },
          count: { $sum: 1 },
          lastViolation: { $max: '$timestamp' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 20
      }
    ]);

    // Business rate limit violations
    const businessRateLimits = await BusinessAuditLog.countDocuments({
      responseStatus: 429,
      timestamp: { $gte: last24Hours }
    });

    res.json({
      success: true,
      data: {
        totalViolations: rateLimitViolations.reduce((sum, v) => sum + v.count, 0) + businessRateLimits,
        adminPortalViolations: rateLimitViolations,
        businessPortalViolations: businessRateLimits,
        timeRange: 'Last 24 hours'
      }
    });
  } catch (error) {
    console.error('Error fetching rate limit stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching rate limit statistics'
    });
  }
};

/**
 * Get authentication security metrics
 */
export const getAuthSecurityMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Admin authentication metrics
    const adminAuthMetrics = await AdminAuditLog.aggregate([
      {
        $match: {
          action: { $in: ['REQUEST_OTP', 'VERIFY_OTP', 'LOGIN'] },
          timestamp: { $gte: last7Days }
        }
      },
      {
        $group: {
          _id: {
            action: '$action',
            success: '$success'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Failed OTP attempts by IP
    const failedOtpByIP = await AdminAuditLog.aggregate([
      {
        $match: {
          action: 'VERIFY_OTP',
          success: false,
          timestamp: { $gte: last24Hours }
        }
      },
      {
        $group: {
          _id: '$ipAddress',
          attempts: { $sum: 1 },
          emails: { $addToSet: '$adminEmail' }
        }
      },
      {
        $match: {
          attempts: { $gte: 3 }
        }
      },
      {
        $sort: { attempts: -1 }
      }
    ]);

    // Account lockout statistics
    const lockedAccounts = await User.countDocuments({
      'accountLockout.isLocked': true
    });

    const recentLockouts = await User.find({
      'accountLockout.lockedAt': { $gte: last24Hours }
    }).select('uid email displayName accountLockout').lean();

    res.json({
      success: true,
      data: {
        adminAuth: {
          metrics: adminAuthMetrics,
          failedOtpByIP
        },
        userAccounts: {
          lockedCount: lockedAccounts,
          recentLockouts
        },
        summary: {
          totalFailedLogins: failedOtpByIP.reduce((sum, ip) => sum + ip.attempts, 0),
          suspiciousIPCount: failedOtpByIP.length,
          lockedAccountsCount: lockedAccounts
        }
      }
    });
  } catch (error) {
    console.error('Error fetching auth security metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching authentication security metrics'
    });
  }
};

/**
 * Get IP address activity report
 */
export const getIPActivityReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ipAddress } = req.params;
    const { hours = 24 } = req.query;
    const since = new Date(Date.now() - Number(hours) * 60 * 60 * 1000);

    // Admin portal activity
    const adminActivity = await AdminAuditLog.find({
      ipAddress,
      timestamp: { $gte: since }
    })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    // Business portal activity
    const businessActivity = await BusinessAuditLog.find({
      ipAddress,
      timestamp: { $gte: since }
    })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    // Calculate risk score
    const totalActions = adminActivity.length + businessActivity.length;
    const failedActions = adminActivity.filter(a => !a.success).length + 
                         businessActivity.filter(a => !a.success).length;
    const failureRate = totalActions > 0 ? (failedActions / totalActions) * 100 : 0;

    let riskLevel = 'low';
    if (failureRate > 50 || failedActions > 10) riskLevel = 'high';
    else if (failureRate > 20 || failedActions > 5) riskLevel = 'medium';

    res.json({
      success: true,
      data: {
        ipAddress,
        riskLevel,
        metrics: {
          totalActions,
          failedActions,
          failureRate: failureRate.toFixed(2) + '%'
        },
        adminActivity: adminActivity.slice(0, 20),
        businessActivity: businessActivity.slice(0, 20),
        timeRange: `Last ${hours} hours`
      }
    });
  } catch (error) {
    console.error('Error fetching IP activity report:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching IP activity report'
    });
  }
};

/**
 * Get security timeline (recent events)
 */
export const getSecurityTimeline = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 50 } = req.query;
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get recent security-relevant events from all portals
    const adminEvents = await AdminAuditLog.find({
      timestamp: { $gte: last24Hours },
      $or: [
        { success: false },
        { action: { $in: ['ADD_ADMIN', 'REMOVE_ADMIN', 'TOGGLE_USER_STATUS', 'TOGGLE_BUSINESS_STATUS'] } }
      ]
    })
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .lean();

    const businessEvents = await BusinessAuditLog.find({
      timestamp: { $gte: last24Hours },
      success: false
    })
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .lean();

    // Combine and sort
    const timeline = [
      ...adminEvents.map(e => ({ ...e, portal: 'admin', severity: e.success ? 'info' : 'warning' })),
      ...businessEvents.map(e => ({ ...e, portal: 'business', severity: 'warning' }))
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, Number(limit));

    res.json({
      success: true,
      data: {
        timeline,
        count: timeline.length
      }
    });
  } catch (error) {
    console.error('Error fetching security timeline:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching security timeline'
    });
  }
};

/**
 * Block/unblock IP address
 */
export const toggleIPBlock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ipAddress, blocked, reason } = req.body;

    if (!ipAddress) {
      res.status(400).json({
        success: false,
        message: 'IP address is required'
      });
      return;
    }

    // Store blocked IPs in a collection
    const BlockedIP = require('../models/BlockedIP').default;
    
    if (blocked) {
      await BlockedIP.create({
        ipAddress,
        reason: reason || 'Suspicious activity detected',
        blockedBy: (req as any).admin?.email || 'system',
        blockedAt: new Date()
      });
    } else {
      await BlockedIP.deleteOne({ ipAddress });
    }

    res.json({
      success: true,
      message: `IP ${blocked ? 'blocked' : 'unblocked'} successfully`,
      ipAddress
    });
  } catch (error) {
    console.error('Error toggling IP block:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating IP block status'
    });
  }
};

/**
 * Get system security health
 */
export const getSecurityHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check various security metrics
    const failedLogins = await AdminAuditLog.countDocuments({
      action: { $in: ['VERIFY_OTP', 'LOGIN'] },
      success: false,
      timestamp: { $gte: last24Hours }
    });

    const rateLimitHits = await AdminAuditLog.countDocuments({
      responseStatus: 429,
      timestamp: { $gte: last24Hours }
    });

    const lockedAccounts = await User.countDocuments({
      'accountLockout.isLocked': true
    });

    // Calculate health score (0-100)
    let healthScore = 100;
    if (failedLogins > 50) healthScore -= 20;
    else if (failedLogins > 20) healthScore -= 10;
    
    if (rateLimitHits > 100) healthScore -= 20;
    else if (rateLimitHits > 50) healthScore -= 10;
    
    if (lockedAccounts > 10) healthScore -= 15;
    else if (lockedAccounts > 5) healthScore -= 5;

    let status = 'healthy';
    if (healthScore < 60) status = 'critical';
    else if (healthScore < 80) status = 'warning';

    res.json({
      success: true,
      data: {
        status,
        healthScore,
        metrics: {
          failedLogins,
          rateLimitHits,
          lockedAccounts
        },
        recommendations: [
          failedLogins > 20 && 'High number of failed login attempts detected',
          rateLimitHits > 50 && 'Elevated rate limit violations',
          lockedAccounts > 5 && 'Multiple accounts locked due to failed attempts'
        ].filter(Boolean),
        lastChecked: now
      }
    });
  } catch (error) {
    console.error('Error fetching security health:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching security health'
    });
  }
};

/**
 * Export security report (CSV format)
 */
export const exportSecurityReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, portal = 'all' } = req.query;

    const query: any = {};
    if (startDate) query.timestamp = { $gte: new Date(startDate as string) };
    if (endDate) query.timestamp = { ...query.timestamp, $lte: new Date(endDate as string) };

    let logs: any[] = [];

    if (portal === 'admin' || portal === 'all') {
      const adminLogs = await AdminAuditLog.find(query).sort({ timestamp: -1 }).lean();
      logs = [...logs, ...adminLogs.map(l => ({ ...l, portal: 'admin' }))];
    }

    if (portal === 'business' || portal === 'all') {
      const businessLogs = await BusinessAuditLog.find(query).sort({ timestamp: -1 }).lean();
      logs = [...logs, ...businessLogs.map(l => ({ ...l, portal: 'business' }))];
    }

    // Generate CSV
    const csv = [
      'Timestamp,Portal,Action,User,IP Address,Success,Response Status,Duration',
      ...logs.map(log => 
        `${log.timestamp},${log.portal},${log.action},${log.adminEmail || log.ownerId || 'N/A'},${log.ipAddress},${log.success},${log.responseStatus || 'N/A'},${log.duration || 'N/A'}`
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=security-report-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting security report:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting security report'
    });
  }
};
