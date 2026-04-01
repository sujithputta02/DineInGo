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
  // Content Security Policy: Strict configuration for production
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'https://www.gstatic.com', 'https://apis.google.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      fontSrc: ["'self'", 'fonts.gstatic.com'],
      connectSrc: ["'self'", 'https:', 'ws:', 'wss:', 'https://*.firebaseio.com', 'https://*.googleapis.com'],
      frameSrc: ["'self'", 'https://*.firebaseapp.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  
  // Prevent clickjacking attacks: Only allow our own site to frame content
  frameguard: {
    action: 'sameorigin',
  },
  
  // Prevent MIME type sniffing
  noSniff: true,
  
  // Enable XSS protection
  xssFilter: true,
  
  // Enforce HTTPS across all subdomains for 1 year
  hsts: {
    maxAge: 31536000, 
    includeSubDomains: true,
    preload: true,
  },
  
  // Referrer Policy: Send origin only on cross-origin requests
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  
  // Allow cross-origin resource loading for images (Cloudinary/Vercel compatibility)
  crossOriginResourcePolicy: { 
    policy: 'cross-origin' 
  },
});

/**
 * Custom security headers middleware
 * Adds additional protections not covered by default Helmet
 */
export const customSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent browsers from MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Security Policy for Browser Features (Camera, Mic, etc.)
  // We only allow Geolocation as it's needed for restaurant discovery
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), interest-cohort=()');
  
  // Ensure strict transport for older browsers
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Disable client-side caching for sensitive API data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Remove server/tech stack information to prevent fingerprinting
  res.removeHeader('Server');
  res.removeHeader('X-Powered-By');
  
  next();
};

/**
 * CORS configuration
 * Strictly whitelist allowed origins
 */
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const rawOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5001',
      'http://localhost:6173',
      'https://dine-in-go.vercel.app',
      'https://dineingo-beta.vercel.app',
      'https://dineingo-backend.onrender.com',
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL,
      process.env.BUSINESS_URL
    ];

    const allowedOrigins = rawOrigins
      .filter(Boolean)
      .map(url => url?.replace(/\/$/, '').toLowerCase());

    const normalizedOrigin = origin?.replace(/\/$/, '').toLowerCase();

    if (!origin || allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Security violation: Blocked request from ${origin}`);
      callback(new Error('Restricted by CORS Policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Admin-Token'],
  maxAge: 86400, // 24 hours
};

export default {
  securityHeaders,
  customSecurityHeaders,
  corsConfig
};
