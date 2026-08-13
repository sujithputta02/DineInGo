import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

/**
 * SECURITY: Security Headers Middleware
 */

export const securityHeaders = helmet({
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
  frameguard: { action: 'sameorigin' },
  noSniff: true,
  xssFilter: true,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

export const customSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), interest-cohort=()');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.removeHeader('Server');
  res.removeHeader('X-Powered-By');
  next();
};

export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // allow all origins temporarily to debug
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Admin-Token'],
  maxAge: 86400,
};

export default {
  securityHeaders,
  customSecurityHeaders,
  corsConfig
};
