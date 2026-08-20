import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { secretManager } from '../utils/secretManager';
import { Admin } from '../models/Admin';

// Get JWT secret from SecretManager (no fallback - fail if not set)
const getJWTSecret = (): string => {
  try {
    return secretManager.getSecret('JWT_SECRET');
  } catch (error) {
    console.error('CRITICAL: JWT_SECRET not configured. Admin authentication will fail.');
    throw new Error('JWT_SECRET not configured');
  }
};

export interface AdminTokenPayload {
  email: string;
  role: 'admin' | 'super_admin';
  tokenVersion?: number;
  iat?: number;
  exp?: number;
}

// Extend Express Request to include admin data
declare global {
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

// Middleware to verify admin JWT token
export const verifyAdminToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please login again.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with secure JWT secret
    const JWT_SECRET = getJWTSecret();
    const decoded = jwt.verify(token, JWT_SECRET) as AdminTokenPayload;

    // Check if token has admin role
    if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Session revocation: verify tokenVersion matches the admin's current value.
    // Any admin whose tokenVersion was bumped will fail here.
    const adminDoc = await Admin.findOne({ email: decoded.email }).select('+tokenVersion +isActive');
    if (!adminDoc) {
      return res.status(401).json({
        success: false,
        message: 'Account not found. Please contact a super admin.'
      });
    }
    if (!adminDoc.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your admin account has been deactivated.'
      });
    }
    if (typeof decoded.tokenVersion === 'number' && decoded.tokenVersion !== adminDoc.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: 'Your session has been revoked. Please login again.'
      });
    }

    // Attach admin data to request
    req.admin = decoded;
    next();

  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.',
        expired: true
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please login again.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Token verification failed.'
    });
  }
};

// Middleware to verify super admin only
export const verifySuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (req.admin.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super admin privileges required.'
    });
  }

  next();
};

// Generate JWT token for admin
export const generateAdminToken = (email: string, role: 'admin' | 'super_admin', tokenVersion: number = 0): string => {
  const payload: AdminTokenPayload = {
    email,
    role,
    tokenVersion
  };

  // Token expires in 4 hours (reduced from 24h for security)
  const JWT_SECRET = getJWTSecret();
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '4h' });
};
