/**
 * ADMIN AUDIT LOGGING MIDDLEWARE
 * Logs all admin actions for security and compliance
 */

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

// Admin Audit Log Schema
const adminAuditLogSchema = new mongoose.Schema({
  adminEmail: { type: String, required: true, index: true },
  adminRole: { type: String, required: true, enum: ['admin', 'super_admin'] },
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
adminAuditLogSchema.index({ timestamp: -1 });
adminAuditLogSchema.index({ adminEmail: 1, timestamp: -1 });
adminAuditLogSchema.index({ action: 1, timestamp: -1 });

export const AdminAuditLog = mongoose.model('AdminAuditLog', adminAuditLogSchema);

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
  if (path.includes('/request-otp')) return 'REQUEST_OTP';
  if (path.includes('/verify-otp')) return 'LOGIN';
  if (path.includes('/users') && method === 'GET') return 'VIEW_USERS';
  if (path.includes('/users/toggle-status')) return 'TOGGLE_USER_STATUS';
  if (path.includes('/businesses') && method === 'GET') return 'VIEW_BUSINESSES';
  if (path.includes('/businesses/toggle-status')) return 'TOGGLE_BUSINESS_STATUS';
  if (path.includes('/notifications') && method === 'POST') return 'SEND_NOTIFICATION';
  if (path.includes('/add')) return 'ADD_ADMIN';
  if (path.includes('/remove')) return 'REMOVE_ADMIN';
  if (path.includes('/toggle-status')) return 'TOGGLE_ADMIN_STATUS';
  if (path.includes('/stats')) return 'VIEW_STATS';
  if (path.includes('/system-health')) return 'VIEW_SYSTEM_HEALTH';
  
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
  delete sanitized.otp;
  delete sanitized.token;
  delete sanitized.secret;
  
  return sanitized;
};

/**
 * Admin Audit Log Middleware
 * Logs all admin actions with IP, timestamp, and details
 */
export const logAdminAction = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Store original send function
  const originalSend = res.send;
  
  // Override send to capture response
  res.send = function (data: any): Response {
    const duration = Date.now() - startTime;
    
    // Log the action asynchronously (don't block response)
    setImmediate(async () => {
      try {
        const admin = (req as any).admin;
        
        await AdminAuditLog.create({
          adminEmail: admin?.email || 'unknown',
          adminRole: admin?.role || 'unknown',
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
        console.error('Error logging admin action:', error);
      }
    });
    
    // Call original send
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * Log failed login attempts (before authentication)
 */
export const logFailedLogin = async (email: string, ipAddress: string, reason: string) => {
  try {
    await AdminAuditLog.create({
      adminEmail: email,
      adminRole: 'unknown',
      action: 'FAILED_LOGIN',
      method: 'POST',
      path: '/admin/verify-otp',
      ipAddress,
      userAgent: 'unknown',
      requestBody: { email },
      responseStatus: 401,
      success: false,
      errorMessage: reason,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error logging failed login:', error);
  }
};

/**
 * Get admin audit logs (for super admin)
 */
export const getAdminAuditLogs = async (
  filters: {
    adminEmail?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}
) => {
  const query: any = {};
  
  if (filters.adminEmail) query.adminEmail = filters.adminEmail;
  if (filters.action) query.action = filters.action;
  if (filters.startDate || filters.endDate) {
    query.timestamp = {};
    if (filters.startDate) query.timestamp.$gte = filters.startDate;
    if (filters.endDate) query.timestamp.$lte = filters.endDate;
  }
  
  return await AdminAuditLog.find(query)
    .sort({ timestamp: -1 })
    .limit(filters.limit || 100)
    .lean();
};

/**
 * Get failed login attempts for an email
 */
export const getFailedLoginAttempts = async (email: string, since: Date) => {
  return await AdminAuditLog.countDocuments({
    adminEmail: email,
    action: 'FAILED_LOGIN',
    timestamp: { $gte: since },
  });
};

/**
 * Check if admin account should be locked
 */
export const shouldLockAccount = async (email: string): Promise<boolean> => {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const failedAttempts = await getFailedLoginAttempts(email, fifteenMinutesAgo);
  
  // Lock after 5 failed attempts in 15 minutes
  return failedAttempts >= 5;
};
