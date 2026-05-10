import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { SecurityLog } from '../models/SecurityLog';

/**
 * Helper to log security events for rate limiters
 */
const logSecurityEvent = async (req: Request, portal: 'user' | 'business' | 'admin' | 'system', details: string) => {
  try {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : (req.socket.remoteAddress || 'unknown');
    
    await SecurityLog.create({
      portal,
      eventType: 'rate_limit_exceeded',
      severity: portal === 'admin' ? 'medium' : 'low',
      details,
      ip,
      userAgent: req.headers['user-agent'],
      path: req.path,
      userId: (req as any).user?.uid || (req as any).user?._id
    });
  } catch (err) {
    console.error('Failed to log security event:', err);
  }
};

/**
 * Helper function to get client IP address (IPv6 safe)
 */
const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
};

/**
 * General API Rate Limiter - IP based
 * 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 100 to avoid 429
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  handler: (req: Request, res: Response) => {
    logSecurityEvent(req, 'user', 'General API rate limit reached');
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  }
});

/**
 * Strict Rate Limiter for Authentication Endpoints
 * 5 requests per 15 minutes per IP
 * Prevents brute force attacks on login/signup
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logSecurityEvent(req, 'user', 'Authentication rate limit reached (failed logins?)');
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again in 15 minutes.',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  }
});

/**
 * Password Reset Rate Limiter
 * 3 requests per hour per IP
 * Prevents password reset abuse
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many password reset attempts. Please try again in 1 hour.',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  }
});

/**
 * OTP Rate Limiter
 * 5 requests per hour per IP
 * Prevents OTP enumeration attacks
 */
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many OTP requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logSecurityEvent(req, 'user', 'OTP request rate limit reached');
    res.status(429).json({
      success: false,
      message: 'Too many OTP requests. Please try again in 1 hour.',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  }
});

/**
 * Review Submission Rate Limiter
 * 10 reviews per hour per user
 * Prevents review spam
 */
export const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise use IP
    return (req as any).user?.uid || getClientIp(req);
  },
  message: 'Too many reviews submitted, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many reviews. Please try again in 1 hour.',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  }
});

/**
 * Booking Rate Limiter
 * 20 bookings per hour per user
 * Prevents booking spam
 */
export const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise use IP
    return (req as any).user?.uid || getClientIp(req);
  },
  message: 'Too many bookings, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many bookings. Please try again in 1 hour.',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  }
});

/**
 * Admin OTP Rate Limiter
 * 3 requests per hour per IP
 * Prevents brute force attacks on admin OTP
 */
export const adminOtpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many admin OTP requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logSecurityEvent(req, 'admin', 'Admin OTP request rate limit reached');
    res.status(429).json({
      success: false,
      message: 'Too many admin OTP requests. Please try again in 1 hour.',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  }
});

/**
 * Strict Rate Limiter for AI/Chatbot Endpoints
 * 3 requests per minute per IP/User
 * Prevents AI resource exhaustion and billing abuse
 */
export const strictAiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'AI request limit reached. Please wait a moment before sending more messages.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise use IP
    return (req as any).user?.uid || (req as any).user?._id || getClientIp(req);
  },
  handler: (req: Request, res: Response) => {
    logSecurityEvent(req, 'system', 'AI strict rate limit reached - Budget Protection triggered');
    res.status(429).json({
      success: false,
      message: 'Too many AI requests. Please wait a minute.',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  }
});

/**
 * Admin Login Rate Limiter
 * 5 requests per 15 minutes per IP
 * Prevents brute force attacks on admin login
 */
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many admin login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logSecurityEvent(req, 'admin', 'Admin login attempt rate limit reached');
    res.status(429).json({
      success: false,
      message: 'Too many admin login attempts. Please try again in 15 minutes.',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  }
});

/**
 * Admin API Rate Limiter
 * 200 requests per 15 minutes per IP
 * Allows for frequent admin operations and auto-refresh features
 */
export const adminApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: 'Too many admin API requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many admin API requests. Please try again in 15 minutes.',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  }
});

/**
 * Business Registration Rate Limiter
 * 3 requests per hour per IP
 * Prevents spam business registrations
 */
export const businessRegistrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Increased from 3
  message: 'Too many business registration attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logSecurityEvent(req, 'business', 'Business registration rate limit reached');
    res.status(429).json({
      success: false,
      message: 'Too many business registration attempts. Please try again in 1 hour.',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  }
});

/**
 * Business API Rate Limiter
 * 100 requests per 15 minutes per IP
 * Prevents abuse of business operations
 */
export const businessApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased from 100
  message: 'Too many business API requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many business API requests. Please try again in 15 minutes.',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  }
});

/**
 * Business Update Rate Limiter
 * 20 requests per hour per user
 * Prevents excessive business updates
 */
export const businessUpdateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req: Request) => {
    // Use owner ID if available, otherwise use IP
    return (req as any).params?.ownerId || (req as any).body?.ownerId || getClientIp(req);
  },
  message: 'Too many business updates, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      message: 'Too many business updates. Please try again in 1 hour.',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  }
});

export default {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  otpLimiter,
  reviewLimiter,
  bookingLimiter,
  adminOtpLimiter,
  adminLoginLimiter,
  adminApiLimiter,
  businessRegistrationLimiter,
  businessApiLimiter,
  businessUpdateLimiter,
  strictAiLimiter
};
