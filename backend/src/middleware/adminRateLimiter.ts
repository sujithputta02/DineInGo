import rateLimit from 'express-rate-limit';
import { SecurityLog } from '../models/SecurityLog';

// Global error handler for rate limit exceeded
const limitReachedHandler = async (req: any, res: any) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.warn(`🚨 Admin Rate Limit Exceeded - IP: ${ip} - Path: ${req.path}`);
  
  try {
    // Log security event
    await SecurityLog.create({
      portal: 'admin',
      eventType: 'rate_limit_exceeded',
      severity: 'medium',
      details: `IP blocked for exceeding rate limit on path: ${req.path}`,
      ip: String(ip),
      userAgent: req.headers['user-agent'],
      path: req.path
    });
  } catch (err) {
    console.error('Failed to log security event:', err);
  }

  res.status(429).json({
    success: false,
    message: 'Too many requests. For security reasons, your IP has been temporarily blocked. Please try again later.'
  });
};

/**
 * Tier 1: OTP Request Limiter
 * Maximum 5 requests to send an OTP per 15 minutes per IP.
 * Prevents spamming the Admin email inbox, or brute-forcing the Master Secret Key.
 */
export const adminOtpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests maximum
  message: 'Too many OTP requests from this IP, please try again after 15 minutes',
  handler: limitReachedHandler,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Tier 2: OTP Verification Limiter
 * Maximum 5 attempts to guess the 6-digit OTP per 15 minutes per IP.
 * Mathematically prevents brute-forcing a 6-digit (1,000,000 combo) code.
 */
export const adminOtpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 failed/success attempts maximum
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  handler: limitReachedHandler,
  standardHeaders: true,
  legacyHeaders: false,
});
