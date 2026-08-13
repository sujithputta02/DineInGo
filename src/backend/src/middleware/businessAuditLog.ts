/**
 * BUSINESS AUDIT LOGGING MIDDLEWARE
 * Logs all business owner actions for security and compliance
 */

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

// Business Audit Log Schema
const businessAuditLogSchema = new mongoose.Schema({
  ownerId: { type: String, required: true, index: true },
  businessId: { type: String, index: true },
  action: { type: String, required: true, index: true },
  method: { type: String, required: true },
  path: { type: String, required: true },
  ipAddress: { type: String, required: true, index: true },
  userAgent: { type: String },
  requestBody: { type: mongoose.Schema.Types.Mixed },
  responseStatus: { type: Number },
  success: { type: Boolean, default: true },
  errorMessage: { type: String },
  timestamp: { type: Date, default: Date.now, index: true },
  duration: { type: Number }, // milliseconds
});

// Create indexes for efficient querying
businessAuditLogSchema.index({ timestamp: -1 });
businessAuditLogSchema.index({ ownerId: 1, timestamp: -1 });
businessAuditLogSchema.index({ businessId: 1, timestamp: -1 });
businessAuditLogSchema.index({ action: 1, timestamp: -1 });

export const BusinessAuditLog = mongoose.model('BusinessAuditLog', businessAuditLogSchema);

/**
 * Get client IP address (handles proxies)
 */
const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
};

/**
 * Determine action from request
 */
const getActionFromRequest = (req: Request): string => {
  const path = req.path;
  const method = req.method;

  // Map routes to actions
  if (path.includes('/register')) return 'REGISTER_BUSINESS';
  if (path.includes('/validate')) return 'VALIDATE_BUSINESS';
  if (path.includes('/deploy')) return 'DEPLOY_BUSINESS';
  if (path.includes('/toggle-status')) return 'TOGGLE_STATUS';
  if (path.includes('/staff') && method === 'POST') return 'ADD_STAFF';
  if (path.includes('/staff') && method === 'PUT') return 'UPDATE_STAFF';
  if (path.includes('/staff') && method === 'DELETE') return 'REMOVE_STAFF';
  if (path.includes('/promotions') && method === 'POST') return 'CREATE_PROMOTION';
  if (path.includes('/promotions') && method === 'PUT') return 'UPDATE_PROMOTION';
  if (path.includes('/promotions') && method === 'DELETE') return 'DELETE_PROMOTION';
  if (path.includes('/campaigns') && method === 'POST') return 'CREATE_CAMPAIGN';
  if (path.includes('/campaigns/send')) return 'SEND_CAMPAIGN';
  if (path.includes('/reply')) return 'REPLY_TO_REVIEW';
  if (method === 'POST' && !path.includes('/validate')) return 'CREATE_BUSINESS';
  if (method === 'PUT') return 'UPDATE_BUSINESS';
  if (method === 'DELETE') return 'DELETE_BUSINESS';
  if (method === 'GET' && path.includes('/analytics')) return 'VIEW_ANALYTICS';
  
  return `${method}_${path}`;
};

/**
 * Sanitize request body for logging (remove sensitive data)
 */
const sanitizeRequestBody = (body: any): any => {
  if (!body) return {};
  
  const sanitized = { ...body };
  
  // Remove sensitive fields
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.secret;
  delete sanitized.apiKey;
  
  return sanitized;
};

/**
 * Business Audit Log Middleware
 * Logs all business owner actions with IP, timestamp, and details
 */
export const logBusinessAction = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Store original send function
  const originalSend = res.send;
  
  // Override send to capture response
  res.send = function (data: any): Response {
    const duration = Date.now() - startTime;
    
    // Log the action asynchronously (don't block response)
    setImmediate(async () => {
      try {
        // Extract owner ID from various sources
        const ownerId = (req as any).params?.ownerId || 
                       (req as any).body?.ownerId || 
                       (req as any).query?.ownerId ||
                       'unknown';
        
        const businessId = (req as any).params?.id || 
                          (req as any).params?.businessId || 
                          (req as any).body?.businessId ||
                          undefined;
        
        await BusinessAuditLog.create({
          ownerId,
          businessId,
          action: getActionFromRequest(req),
          method: req.method,
          path: req.path,
          ipAddress: getClientIp(req),
          userAgent: req.headers['user-agent'] || 'unknown',
          requestBody: sanitizeRequestBody(req.body),
          responseStatus: res.statusCode,
          success: res.statusCode < 400,
          errorMessage: res.statusCode >= 400 ? data : undefined,
          timestamp: new Date(),
          duration,
        });
      } catch (error) {
        console.error('Error logging business action:', error);
      }
    });
    
    // Call original send
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * Get business audit logs (for business owners)
 */
export const getBusinessAuditLogs = async (
  filters: {
    ownerId?: string;
    businessId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}
) => {
  const query: any = {};
  
  if (filters.ownerId) query.ownerId = filters.ownerId;
  if (filters.businessId) query.businessId = filters.businessId;
  if (filters.action) query.action = filters.action;
  if (filters.startDate || filters.endDate) {
    query.timestamp = {};
    if (filters.startDate) query.timestamp.$gte = filters.startDate;
    if (filters.endDate) query.timestamp.$lte = filters.endDate;
  }
  
  return await BusinessAuditLog.find(query)
    .sort({ timestamp: -1 })
    .limit(filters.limit || 100)
    .lean();
};

/**
 * Get suspicious activity for a business owner
 */
export const getSuspiciousActivity = async (ownerId: string, hours: number = 24) => {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  // Check for rapid actions (potential automation/bot)
  const rapidActions = await BusinessAuditLog.aggregate([
    {
      $match: {
        ownerId,
        timestamp: { $gte: since }
      }
    },
    {
      $group: {
        _id: {
          action: '$action',
          minute: {
            $dateToString: {
              format: '%Y-%m-%d %H:%M',
              date: '$timestamp'
            }
          }
        },
        count: { $sum: 1 }
      }
    },
    {
      $match: {
        count: { $gte: 10 } // 10+ actions in same minute
      }
    }
  ]);
  
  // Check for failed actions
  const failedActions = await BusinessAuditLog.countDocuments({
    ownerId,
    timestamp: { $gte: since },
    success: false
  });
  
  return {
    rapidActions: rapidActions.length > 0,
    failedActionsCount: failedActions,
    suspicious: rapidActions.length > 0 || failedActions > 20
  };
};
