import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * SECURITY: Rate Limiting Middleware
 * Implements IP-based and user-based rate limiting to prevent abuse
 * Follows OWASP recommendations for API rate limiting
 * Note: Using memory store for simplicity. For production, use Redis store.
 */

/**
 * Helper function to get client IP address (IPv6 safe)
 * Extracts IP from x-forwarded-for header or socket address
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
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  handler: (req: Request, res: Response) => {
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
    res.status(429).json({
      success: false,
      message: 'Too many admin OTP requests. Please try again in 1 hour.',
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
    res.status(429).json({
      success: false,
      message: 'Too many admin login attempts. Please try again in 15 minutes.',
      retryAfter: (req as any).rateLimit?.resetTime
    });
  }
});

/**
 * Admin API Rate Limiter
 * 50 requests per 15 minutes per IP
 * Prevents DoS attacks on admin endpoints
 */
export const adminApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
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
  max: 3,
  message: 'Too many business registration attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
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
  max: 100,
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
  businessUpdateLimiter
};
