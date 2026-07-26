/**
 * Portal Isolation Middleware
 * Ensures complete isolation between User, Business, and Admin portals
 * Prevents any cross-portal data leakage or access
 */

import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';

enum Portal {
  USER = 'user',
  BUSINESS = 'business',
  ADMIN = 'admin'
}

interface TokenPayload {
  uid: string;
  email: string;
  role: 'user' | 'owner' | 'admin' | 'super_admin';
  portal?: Portal;
  sessionId?: string;
}

/**
 * Portal Detection and Validation
 */
function detectPortalFromRequest(req: Request): Portal | null {
  const path = req.path.toLowerCase();
  const referer = req.headers.referer?.toLowerCase() || '';
  
  // Admin portal detection
  if (path.startsWith('/api/v1/admin') || referer.includes('/admin')) {
    return Portal.ADMIN;
  }
  
  // Business portal detection
  if (path.startsWith('/api/v1/business') || referer.includes('/business')) {
    return Portal.BUSINESS;
  }
  
  // Default to user portal
  return Portal.USER;
}

/**
 * Validate that token role matches the portal
 */
function validatePortalAccess(portal: Portal, role: string): boolean {
  const accessMatrix = {
    [Portal.USER]: ['user'],
    [Portal.BUSINESS]: ['owner', 'admin', 'super_admin'],
    [Portal.ADMIN]: ['admin', 'super_admin']
  };
  
  return accessMatrix[portal]?.includes(role) || false;
}

/**
 * Portal Isolation Middleware
 */
export const enforcePortalIsolation = (expectedPortal: Portal) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Get token from headers
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Verify token
      const decoded = verify(token, process.env.JWT_SECRET || 'your-secret-key') as TokenPayload;
      
      // Validate portal access
      if (!validatePortalAccess(expectedPortal, decoded.role)) {
        console.error(`[PortalSecurity] 🚨 Unauthorized portal access attempt:`, {
          expectedPortal,
          userRole: decoded.role,
          userId: decoded.uid,
          ip: getClientIP(req),
          path: req.path
        });
        
        res.status(403).json({
          success: false,
          message: 'Access denied: Insufficient permissions'
        });
        return;
      }

      // Detect portal from request
      const detectedPortal = detectPortalFromRequest(req);
      
      if (detectedPortal && detectedPortal !== expectedPortal) {
        console.error(`[PortalSecurity] 🚨 Portal mismatch detected:`, {
          expected: expectedPortal,
          detected: detectedPortal,
          userId: decoded.uid,
          path: req.path
        });
        
        res.status(403).json({
          success: false,
          message: 'Portal access violation'
        });
        return;
      }

      // Add portal and user info to request
      req.user = decoded;
      req.portal = expectedPortal;
      
      next();
    } catch (error) {
      console.error('[PortalSecurity] Token verification failed:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  };
};

/**
 * Admin Portal Super-Protection
 * Additional security layer for admin routes
 */
export const adminSuperProtection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user as TokenPayload;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Enforce admin role
    if (!['admin', 'super_admin'].includes(user.role)) {
      console.error(`[AdminSecurity] 🚨 Non-admin user attempted admin access:`, {
        userId: user.uid,
        role: user.role,
        ip: getClientIP(req),
        path: req.path,
        method: req.method
      });
      
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }

    // Check for admin session token (additional layer)
    const adminSessionToken = req.headers['x-admin-session'] as string;
    
    if (!adminSessionToken || !isValidAdminSession(adminSessionToken, user.uid)) {
      console.error(`[AdminSecurity] 🚨 Invalid admin session token:`, {
        userId: user.uid,
        ip: getClientIP(req)
      });
      
      res.status(401).json({
        success: false,
        message: 'Invalid admin session'
      });
      return;
    }

    // Log all admin actions for audit trail
    logAdminAction(user, req);
    
    next();
  } catch (error) {
    console.error('[AdminSecurity] Error in admin protection:', error);
    res.status(500).json({
      success: false,
      message: 'Security verification failed'
    });
  }
};

/**
 * Business Portal Protection
 * Ensures business owners can only access their own data
 */
export const businessDataIsolation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user as TokenPayload;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Extract business ID from request
    const businessId = req.params.businessId || req.body.businessId || req.query.businessId;
    
    if (businessId) {
      // Verify ownership (implement your own ownership check)
      const isOwner = await verifyBusinessOwnership(user.uid, businessId as string);
      
      if (!isOwner && user.role !== 'admin' && user.role !== 'super_admin') {
        console.error(`[BusinessSecurity] 🚨 Unauthorized business data access:`, {
          userId: user.uid,
          businessId,
          ip: getClientIP(req),
          path: req.path
        });
        
        res.status(403).json({
          success: false,
          message: 'Access denied: Not authorized for this business'
        });
        return;
      }
    }
    
    next();
  } catch (error) {
    console.error('[BusinessSecurity] Error in business protection:', error);
    res.status(500).json({
      success: false,
      message: 'Security verification failed'
    });
  }
};

/**
 * User Portal Protection
 * Ensures users can only access their own data
 */
export const userDataIsolation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user as TokenPayload;
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Extract user ID from request
    const requestedUserId = req.params.userId || req.params.customerId || req.body.userId || req.query.userId;
    
    if (requestedUserId && requestedUserId !== user.uid) {
      console.error(`[UserSecurity] 🚨 Unauthorized user data access:`, {
        authenticatedUserId: user.uid,
        requestedUserId,
        ip: getClientIP(req),
        path: req.path
      });
      
      res.status(403).json({
        success: false,
        message: 'Access denied: Cannot access other users data'
      });
      return;
    }
    
    next();
  } catch (error) {
    console.error('[UserSecurity] Error in user protection:', error);
    res.status(500).json({
      success: false,
      message: 'Security verification failed'
    });
  }
};

/**
 * Cross-Portal Request Blocker
 * Prevents any cross-origin requests between portals
 */
export const blockCrossPortalRequests = (req: Request, res: Response, next: NextFunction): void => {
  // ✅ WHITELIST: Public routes that don't require portal isolation
  const publicRoutes = [
    '/api/v1/admin/maintenance-status',
    '/api/v1/admin/feature-flags',
    '/api/v1/admin/request-otp',
    '/api/v1/admin/verify-otp'
  ];
  
  // Skip portal checking for public routes
  if (publicRoutes.some(route => req.path.toLowerCase() === route)) {
    next();
    return;
  }
  
  const origin = req.headers.origin || req.headers.referer || '';
  const currentPortal = detectPortalFromRequest(req);
  
  // Define allowed origins per portal
  const allowedOrigins: Record<Portal, string[]> = {
    [Portal.USER]: [
      process.env.USER_PORTAL_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'https://dine-in-go.vercel.app',
      'https://dineingo.com',
      'https://www.dineingo.com'
    ],
    [Portal.BUSINESS]: [
      process.env.BUSINESS_PORTAL_URL || 'http://localhost:5173/business',
      'http://localhost:5173',
      'https://dine-in-go.vercel.app',
      'https://dineingo.com',
      'https://www.dineingo.com'
    ],
    [Portal.ADMIN]: [
      process.env.ADMIN_PORTAL_URL || 'http://localhost:5173/admin',
      'http://localhost:5173',
      'https://dine-in-go.vercel.app',
      'https://dineingo.com',
      'https://www.dineingo.com'
    ]
  };
  
  if (currentPortal && origin) {
    const isAllowed = allowedOrigins[currentPortal].some(allowed => 
      origin.startsWith(allowed)
    );
    
    if (!isAllowed) {
      console.error(`[PortalSecurity] 🚨 Cross-portal request blocked:`, {
        origin,
        portal: currentPortal,
        path: req.path
      });
      
      res.status(403).json({
        success: false,
        message: 'Cross-portal requests are not allowed'
      });
      return;
    }
  }
  
  next();
};

/**
 * Query Parameter Isolation
 * Prevents injection of portal-specific parameters
 */
export const sanitizePortalParameters = (req: Request, res: Response, next: NextFunction): void => {
  const dangerousParams = ['isAdmin', 'role', 'portal', 'permissions', 'isSuperAdmin', 'isOwner'];
  
  // Remove dangerous parameters from query and body
  for (const param of dangerousParams) {
    if (req.query[param] !== undefined) {
      console.warn(`[PortalSecurity] ⚠️  Removed dangerous query param: ${param} from IP: ${getClientIP(req)}`);
      delete req.query[param];
    }
    
    if (req.body && req.body[param] !== undefined) {
      console.warn(`[PortalSecurity] ⚠️  Removed dangerous body param: ${param} from IP: ${getClientIP(req)}`);
      delete req.body[param];
    }
  }
  
  next();
};

/**
 * Helper Functions
 */

function getClientIP(req: Request): string {
  return (
    req.headers['cf-connecting-ip'] as string ||
    req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
    req.headers['x-real-ip'] as string ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

// Admin session management (implement with Redis in production)
const adminSessions = new Map<string, { userId: string; createdAt: number }>();
const ADMIN_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function isValidAdminSession(token: string, userId: string): boolean {
  const session = adminSessions.get(token);
  
  if (!session) return false;
  if (session.userId !== userId) return false;
  if (Date.now() - session.createdAt > ADMIN_SESSION_TIMEOUT) {
    adminSessions.delete(token);
    return false;
  }
  
  return true;
}

// Admin action logging (implement with your logging system)
function logAdminAction(user: TokenPayload, req: Request): void {
  console.log('[AdminAudit]', {
    timestamp: new Date().toISOString(),
    adminId: user.uid,
    email: user.email,
    action: `${req.method} ${req.path}`,
    ip: getClientIP(req),
    userAgent: req.headers['user-agent']
  });
}

// Business ownership verification (implement with your database)
async function verifyBusinessOwnership(userId: string, businessId: string): Promise<boolean> {
  // TODO: Implement actual database check
  // const business = await Business.findById(businessId);
  // return business?.ownerId === userId;
  return true; // Placeholder
}

/**
 * Export portal enums for route configuration
 */
export { Portal };

/**
 * Complete portal isolation stack for each portal
 */
export const userPortalSecurity = [
  enforcePortalIsolation(Portal.USER),
  userDataIsolation,
  sanitizePortalParameters,
  blockCrossPortalRequests
];

export const businessPortalSecurity = [
  enforcePortalIsolation(Portal.BUSINESS),
  businessDataIsolation,
  sanitizePortalParameters,
  blockCrossPortalRequests
];

export const adminPortalSecurity = [
  enforcePortalIsolation(Portal.ADMIN),
  adminSuperProtection,
  sanitizePortalParameters,
  blockCrossPortalRequests
];
