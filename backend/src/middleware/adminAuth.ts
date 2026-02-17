import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AdminTokenPayload {
  email: string;
  role: 'admin' | 'super_admin';
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
export const verifyAdminToken = (req: Request, res: Response, next: NextFunction) => {
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

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as AdminTokenPayload;

    // Check if token has admin role
    if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
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
export const generateAdminToken = (email: string, role: 'admin' | 'super_admin'): string => {
  const payload: AdminTokenPayload = {
    email,
    role
  };

  // Token expires in 24 hours
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};
