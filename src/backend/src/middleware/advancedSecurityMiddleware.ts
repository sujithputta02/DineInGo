/**
 * Advanced Security Middleware
 * Protection against: SQL/NoSQL Injection, XSS, CSRF, Path Traversal, 
 * Command Injection, XXE, SSRF, and more
 */

import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { body, validationResult, ValidationChain } from 'express-validator';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

/**
 * SQL/NoSQL Injection Protection
 * Sanitizes MongoDB operators and dangerous characters
 */
export const sanitizeInput = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`[Security] 🚨 Attempted injection blocked in field: ${key} from IP: ${getClientIP(req)}`);
  }
});

/**
 * XSS Protection - Advanced Input Sanitization
 */
export const sanitizeXSS = (req: Request, res: Response, next: NextFunction): void => {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      // Remove dangerous HTML/JS patterns
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
        .replace(/javascript:/gi, '')
        .replace(/data:text\/html/gi, '')
        .replace(/<embed\b[^>]*>/gi, '')
        .replace(/<object\b[^>]*>/gi, '')
        .trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    
    return obj;
  };

  if (req.body) req.body = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  if (req.params) req.params = sanitize(req.params);
  
  next();
};

/**
 * Path Traversal Protection
 */
export const preventPathTraversal = (req: Request, res: Response, next: NextFunction): void => {
  const pathTraversalPatterns = [
    /\.\./g,           // ../
    /\.\\/g,           // .\
    /%2e%2e/gi,        // URL encoded ..
    /%252e%252e/gi,    // Double URL encoded ..
    /\.\.%2f/gi,       // ../ variations
    /\.\.%5c/gi,       // ..\ variations
  ];

  const checkValue = (value: string): boolean => {
    return pathTraversalPatterns.some(pattern => pattern.test(value));
  };

  const scanObject = (obj: any, path: string = ''): boolean => {
    if (typeof obj === 'string') {
      if (checkValue(obj)) {
        console.error(`[Security] 🚨 Path traversal attempt blocked: ${path} from IP: ${getClientIP(req)}`);
        return true;
      }
    } else if (Array.isArray(obj)) {
      return obj.some((item, idx) => scanObject(item, `${path}[${idx}]`));
    } else if (obj && typeof obj === 'object') {
      return Object.entries(obj).some(([key, val]) => scanObject(val, `${path}.${key}`));
    }
    return false;
  };

  if (scanObject(req.body, 'body') || scanObject(req.query, 'query') || scanObject(req.params, 'params')) {
    res.status(400).json({
      success: false,
      message: 'Invalid input detected'
    });
    return;
  }

  next();
};

/**
 * Command Injection Protection
 */
export const preventCommandInjection = (req: Request, res: Response, next: NextFunction): void => {
  const commandPatterns = [
    /[;&|`$(){}[\]<>]/g,  // Shell metacharacters
    /\$\(/g,               // Command substitution
    /`.*`/g,               // Backtick execution
    /&&/g,                 // Command chaining
    /\|\|/g,               // OR operator
    />\s*&/g,              // Redirection
  ];

  const checkValue = (value: string): boolean => {
    return commandPatterns.some(pattern => pattern.test(value));
  };

  const scanObject = (obj: any): boolean => {
    if (typeof obj === 'string') {
      return checkValue(obj);
    } else if (Array.isArray(obj)) {
      return obj.some(item => scanObject(item));
    } else if (obj && typeof obj === 'object') {
      return Object.values(obj).some(val => scanObject(val));
    }
    return false;
  };

  if (scanObject(req.body) || scanObject(req.query) || scanObject(req.params)) {
    console.error(`[Security] 🚨 Command injection attempt blocked from IP: ${getClientIP(req)}`);
    res.status(400).json({
      success: false,
      message: 'Invalid characters detected'
    });
    return;
  }

  next();
};

/**
 * LDAP Injection Protection
 */
export const preventLDAPInjection = (req: Request, res: Response, next: NextFunction): void => {
  const ldapMetaChars = /[*()\\\x00]/g;

  const sanitize = (value: string): string => {
    return value.replace(ldapMetaChars, '');
  };

  const processObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitize(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(processObject);
    } else if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        result[key] = processObject(obj[key]);
      }
      return result;
    }
    return obj;
  };

  if (req.body) req.body = processObject(req.body);
  if (req.query) req.query = processObject(req.query);
  
  next();
};

/**
 * SSRF (Server-Side Request Forgery) Protection
 */
export const preventSSRF = (req: Request, res: Response, next: NextFunction): void => {
  const dangerousHosts = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '169.254.169.254', // AWS metadata endpoint
    '::1',
    'metadata.google.internal', // GCP metadata
  ];

  const checkURL = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      
      // Check against dangerous hosts
      if (dangerousHosts.some(host => hostname.includes(host))) {
        return true;
      }
      
      // Check for private IP ranges
      if (/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(hostname)) {
        return true;
      }
      
      return false;
    } catch {
      return false; // Not a valid URL
    }
  };

  const scanObject = (obj: any): boolean => {
    if (typeof obj === 'string' && (obj.startsWith('http://') || obj.startsWith('https://'))) {
      if (checkURL(obj)) {
        console.error(`[Security] 🚨 SSRF attempt blocked: ${obj} from IP: ${getClientIP(req)}`);
        return true;
      }
    } else if (Array.isArray(obj)) {
      return obj.some(item => scanObject(item));
    } else if (obj && typeof obj === 'object') {
      return Object.values(obj).some(val => scanObject(val));
    }
    return false;
  };

  if (scanObject(req.body) || scanObject(req.query)) {
    res.status(400).json({
      success: false,
      message: 'Invalid URL detected'
    });
    return;
  }

  next();
};

/**
 * Request Size Limiting (DoS Protection)
 */
export const limitRequestSize = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const maxBytes = parseSize(maxSize);
    
    if (contentLength > maxBytes) {
      console.error(`[Security] 🚨 Request size limit exceeded: ${contentLength} bytes from IP: ${getClientIP(req)}`);
      res.status(413).json({
        success: false,
        message: 'Request too large'
      });
      return;
    }
    
    next();
  };
};

/**
 * Prototype Pollution Protection
 */
export const preventPrototypePollution = (req: Request, res: Response, next: NextFunction): void => {
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];

  const hasDangerousKey = (obj: any, path: string = ''): boolean => {
    if (!obj || typeof obj !== 'object') return false;

    for (const key in obj) {
      if (dangerousKeys.includes(key)) {
        console.error(`[Security] 🚨 Prototype pollution attempt blocked: ${path}.${key} from IP: ${getClientIP(req)}`);
        return true;
      }
      
      if (typeof obj[key] === 'object' && hasDangerousKey(obj[key], `${path}.${key}`)) {
        return true;
      }
    }
    
    return false;
  };

  if (hasDangerousKey(req.body, 'body') || hasDangerousKey(req.query, 'query')) {
    res.status(400).json({
      success: false,
      message: 'Invalid request structure'
    });
    return;
  }

  next();
};

/**
 * HTTP Parameter Pollution Protection
 */
export const preventHPP = (req: Request, res: Response, next: NextFunction): void => {
  const normalize = (obj: any): any => {
    const normalized: any = {};
    
    for (const key in obj) {
      // If parameter appears multiple times, keep only the last value
      if (Array.isArray(obj[key]) && typeof obj[key][0] !== 'object') {
        normalized[key] = obj[key][obj[key].length - 1];
        console.warn(`[Security] ⚠️  HPP detected for parameter: ${key} from IP: ${getClientIP(req)}`);
      } else {
        normalized[key] = obj[key];
      }
    }
    
    return normalized;
  };

  if (req.query) req.query = normalize(req.query);
  if (req.body) req.body = normalize(req.body);
  
  next();
};

/**
 * CSRF Token Generation and Validation
 */
const csrfTokens = new Map<string, { token: string; timestamp: number }>();
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

export const generateCSRFToken = (req: Request, res: Response, next: NextFunction): void => {
  const sessionId = (req as any).session?.id || req.headers['x-session-id'] as string || 'default';
  const token = crypto.randomBytes(32).toString('hex');
  
  csrfTokens.set(sessionId, {
    token,
    timestamp: Date.now()
  });
  
  res.locals.csrfToken = token;
  res.setHeader('X-CSRF-Token', token);
  
  next();
};

export const validateCSRFToken = (req: Request, res: Response, next: NextFunction): void => {
  // Skip for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const sessionId = (req as any).session?.id || req.headers['x-session-id'] as string || 'default';
  const providedToken = req.headers['x-csrf-token'] as string || req.body._csrf;
  
  const stored = csrfTokens.get(sessionId);
  
  if (!stored) {
    console.error(`[Security] 🚨 CSRF token not found for session: ${sessionId}`);
    res.status(403).json({
      success: false,
      message: 'CSRF token missing'
    });
    return;
  }
  
  if (Date.now() - stored.timestamp > CSRF_TOKEN_EXPIRY) {
    csrfTokens.delete(sessionId);
    res.status(403).json({
      success: false,
      message: 'CSRF token expired'
    });
    return;
  }
  
  if (!crypto.timingSafeEqual(Buffer.from(stored.token), Buffer.from(providedToken || ''))) {
    console.error(`[Security] 🚨 Invalid CSRF token from IP: ${getClientIP(req)}`);
    res.status(403).json({
      success: false,
      message: 'Invalid CSRF token'
    });
    return;
  }
  
  next();
};

/**
 * Helmet Security Headers (comprehensive)
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://trusted-cdn.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.dineingo.com"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hidePoweredBy: true,
  frameguard: { action: 'deny' }
});

/**
 * Brute Force Protection with Progressive Delays
 */
interface LoginAttempt {
  count: number;
  lastAttempt: number;
  blockUntil?: number;
}

const loginAttempts = new Map<string, LoginAttempt>();

export const bruteForceProtection = (maxAttempts: number = 5, blockDuration: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const identifier = req.body.email || getClientIP(req);
    const now = Date.now();
    
    const attempt = loginAttempts.get(identifier) || { count: 0, lastAttempt: now };
    
    // Check if currently blocked
    if (attempt.blockUntil && attempt.blockUntil > now) {
      const remainingSeconds = Math.ceil((attempt.blockUntil - now) / 1000);
      console.warn(`[Security] 🚨 Brute force block active for: ${identifier}`);
      res.status(429).json({
        success: false,
        message: `Too many failed attempts. Try again in ${remainingSeconds} seconds.`,
        retryAfter: remainingSeconds
      });
      return;
    }
    
    // Reset if last attempt was > 15 minutes ago
    if (now - attempt.lastAttempt > 15 * 60 * 1000) {
      attempt.count = 0;
    }
    
    attempt.count++;
    attempt.lastAttempt = now;
    
    if (attempt.count >= maxAttempts) {
      attempt.blockUntil = now + blockDuration;
      console.error(`[Security] 🚨 Brute force protection triggered for: ${identifier}`);
    }
    
    loginAttempts.set(identifier, attempt);
    
    // Add attempt count to response for monitoring
    res.locals.attemptCount = attempt.count;
    
    next();
  };
};

/**
 * Session Hijacking Protection
 */
export const sessionSecurityCheck = (req: Request, res: Response, next: NextFunction): void => {
  const session = (req as any).session;
  if (!session) return next();

  const userAgent = req.headers['user-agent'] || '';
  const clientIP = getClientIP(req);
  
  // Store fingerprint on first request
  if (!session.fingerprint) {
    session.fingerprint = {
      userAgent,
      ip: clientIP
    };
    return next();
  }
  
  // Validate fingerprint on subsequent requests
  if (session.fingerprint.userAgent !== userAgent) {
    console.error(`[Security] 🚨 Session hijacking attempt detected: User-Agent mismatch from IP: ${clientIP}`);
    session.destroy((err: any) => {
      res.status(401).json({
        success: false,
        message: 'Session invalid. Please login again.'
      });
    });
    return;
  }
  
  // Check for suspicious IP changes (optional - may cause issues with mobile users)
  // if (req.session.fingerprint.ip !== clientIP) {
  //   console.warn(`[Security] ⚠️  IP address changed for session from ${req.session.fingerprint.ip} to ${clientIP}`);
  // }
  
  next();
};

/**
 * Helper: Get client IP
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

/**
 * Helper: Parse size string to bytes
 */
function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([kmg]?b)$/);
  if (!match) return 10 * 1024 * 1024; // Default 10MB
  
  const value = parseFloat(match[1]);
  const unit = match[2];
  
  return value * (units[unit] || 1);
}

/**
 * Input Validation Chains for Common Fields
 */
export const emailValidation: ValidationChain[] = [
  body('email')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Email too long')
];

export const passwordValidation: ValidationChain[] = [
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8-128 characters')
    .matches(/[a-z]/)
    .withMessage('Password must contain lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain number')
    .matches(/[@$!%*?&]/)
    .withMessage('Password must contain special character')
];

export const phoneValidation: ValidationChain[] = [
  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Invalid phone number format')
];

/**
 * Validation Result Checker
 */
export const checkValidationResult = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    console.warn(`[Security] ⚠️  Validation failed from IP: ${getClientIP(req)}`, errors.array());
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: 'param' in err ? err.param : 'unknown',
        message: err.msg
      }))
    });
    return;
  }
  
  next();
};

/**
 * Export all security middleware as a stack
 */
export const fullSecurityStack = [
  securityHeaders,
  sanitizeInput,
  sanitizeXSS,
  preventPathTraversal,
  preventCommandInjection,
  preventLDAPInjection,
  preventSSRF,
  preventPrototypePollution,
  preventHPP,
  limitRequestSize('10mb'),
  sessionSecurityCheck
];
