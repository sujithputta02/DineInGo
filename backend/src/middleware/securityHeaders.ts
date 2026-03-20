import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

/**
 * SECURITY: Security Headers Middleware
 * Implements OWASP recommended security headers
 * - Content Security Policy (CSP)
 * - X-Frame-Options (Clickjacking protection)
 * - X-Content-Type-Options (MIME sniffing protection)
 * - Strict-Transport-Security (HTTPS enforcement)
 * - X-XSS-Protection (XSS protection)
 */

/**
 * Configure Helmet for security headers
 */
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      connectSrc: ["'self'", 'https:', 'ws:', 'wss:'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      childSrc: ["'none'"],
    },
  },
  
  // Prevent clickjacking attacks
  frameguard: {
    action: 'deny',
  },
  
  // Prevent MIME type sniffing
  noSniff: true,
  
  // Enable XSS protection
  xssFilter: true,
  
  // Enforce HTTPS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  
  // Disable referrer policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
} as any);

/**
 * Custom security headers middleware
 */
export const customSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent browsers from MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Disable client-side caching for sensitive data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Remove server information
  res.removeHeader('Server');
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Security-Policy', "default-src 'self'");
  
  next();
};

/**
 * CORS configuration
 * Restrict cross-origin requests
 */
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const rawOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5001',
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
      process.env.CLIENT_URL
    ];

    // Normalize: remove trailing slashes from all allowed origins
    const allowedOrigins = rawOrigins
      .filter(Boolean)
      .map(url => url?.replace(/\/$/, ''));

    // Normalize: remove trailing slash from incoming origin
    const normalizedOrigin = origin?.replace(/\/$/, '');

    console.log(`[CORS] Request from origin: ${origin} (Normalized: ${normalizedOrigin})`);
    console.log(`[CORS] Allowed origins:`, allowedOrigins);

    if (!origin || allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400, // 24 hours
};

export default {
  securityHeaders,
  customSecurityHeaders,
  corsConfig
};
