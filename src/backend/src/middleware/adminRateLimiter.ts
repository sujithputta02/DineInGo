import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { SecurityLog } from '../models/SecurityLog';

// Helper to get client IP (IPv6 & proxy safe)
const getClientIp = (req: any): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

// Helper to extract admin email safely from body, query, user/admin context, or JWT tokens (challenge/confirm/bearer)
const extractAdminEmail = (req: any): string => {
  let email = (
    req.body?.email ||
    req.query?.email ||
    req.user?.email ||
    req.admin?.email ||
    ''
  ).toLowerCase().trim();

  if (!email) {
    const rawToken =
      req.body?.challengeToken ||
      req.body?.confirmToken ||
      req.body?.token ||
      req.query?.token ||
      (typeof req.headers?.authorization === 'string' && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (rawToken) {
      try {
        const decoded: any = jwt.decode(rawToken);
        if (decoded?.email) {
          email = String(decoded.email).toLowerCase().trim();
        }
      } catch {}
    }
  }
  return email;
};

// Global error handler for rate limit exceeded
const limitReachedHandler = async (req: any, res: any) => {
  const ip = getClientIp(req);
  console.warn(`🚨 Admin Rate Limit Exceeded - IP: ${ip} - Path: ${req.path}`);
  
  try {
    // Log security event
    await SecurityLog.create({
      portal: 'admin',
      eventType: 'rate_limit_exceeded',
      severity: 'medium',
      details: `Rate limit reached on path: ${req.path}`,
      ip: String(ip),
      userAgent: req.headers['user-agent'],
      path: req.path
    });
  } catch (err) {
    console.error('Failed to log security event:', err);
  }

  res.status(429).json({
    success: false,
    message: 'Too many requests. Please wait a moment and try again.'
  });
};

/**
 * Tier 1: OTP Request Limiter
 * Extended to 150 requests per 15 minutes to support multiple concurrent admins.
 * Keyed by email + IP so multiple admins on the same network or different accounts do not block each other.
 */
export const adminOtpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // Increased from 5 to 150 for multi-admin concurrency
  keyGenerator: (req: any) => {
    const email = extractAdminEmail(req);
    const ip = getClientIp(req);
    return email ? `${email}_${ip}` : ip;
  },
  message: 'Too many OTP requests. Please try again after a few minutes.',
  handler: limitReachedHandler,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Tier 2: OTP Verification Limiter
 * Extended to 300 attempts per 15 minutes to support multiple concurrent admins
 * verifying OTP codes simultaneously without lockouts.
 */
export const adminOtpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Increased from 5 to 300 for multi-admin concurrency
  keyGenerator: (req: any) => {
    const email = extractAdminEmail(req);
    const ip = getClientIp(req);
    return email ? `${email}_${ip}` : ip;
  },
  message: 'Too many verification attempts. Please try again after a few minutes.',
  handler: limitReachedHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Tier 3: Authenticator QR Code Generation & Retrieval Limiter
 * Extended to 300 requests per 15 minutes to support multiple concurrent admins
 * viewing, generating, or re-linking Authenticator QR codes without getting rate-limited.
 */
export const adminQrCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Generous capacity for multi-admin QR setups
  keyGenerator: (req: any) => {
    const email = extractAdminEmail(req);
    const ip = getClientIp(req);
    return email ? `qr_${email}_${ip}` : `qr_${ip}`;
  },
  message: 'Too many QR code requests. Please wait a moment and try again.',
  handler: limitReachedHandler,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Tier 4: Passkey & 2FA Authenticator Code Validation Limiter
 * Extended to 500 attempts per 15 minutes to support multiple concurrent admins
 * validating 6-digit TOTP passkeys, backup recovery codes, or email confirmation links simultaneously.
 */
export const adminPasskeyValidationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 attempts for high server load / concurrency
  keyGenerator: (req: any) => {
    const email = extractAdminEmail(req);
    const ip = getClientIp(req);
    return email ? `passkey_${email}_${ip}` : `passkey_${ip}`;
  },
  message: 'Too many passkey validation attempts. Please wait a moment and try again.',
  handler: limitReachedHandler,
  standardHeaders: true,
  legacyHeaders: false,
});
