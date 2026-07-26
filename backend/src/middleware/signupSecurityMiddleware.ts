/**
 * Signup Security Middleware
 * Rate limiting, device fingerprinting, and honeypot validation
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

interface SignupAttempt {
  ip: string;
  timestamp: number;
  email?: string;
  fingerprint?: string;
}

class SignupSecurityManager {
  private attemptCache: Map<string, SignupAttempt[]> = new Map();
  private blacklistedIPs: Set<string> = new Set();
  private blacklistedFingerprints: Set<string> = new Set();
  
  private readonly MAX_ATTEMPTS_PER_IP = 3;
  private readonly MAX_ATTEMPTS_PER_FINGERPRINT = 5;
  private readonly WINDOW_MS = 60 * 60 * 1000; // 1 hour
  private readonly BLACKLIST_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get client IP address (handles proxies and cloudflare)
   */
  private getClientIP(req: Request): string {
    return (
      req.headers['cf-connecting-ip'] as string ||
      req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
      req.headers['x-real-ip'] as string ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Get device fingerprint from headers
   */
  private getDeviceFingerprint(req: Request): string {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    
    // Simple fingerprint (can be enhanced with client-side fingerprinting)
    return Buffer.from(`${userAgent}:${acceptLanguage}:${acceptEncoding}`)
      .toString('base64')
      .substring(0, 32);
  }

  /**
   * Check if IP is blacklisted
   */
  public isIPBlacklisted(ip: string): boolean {
    return this.blacklistedIPs.has(ip);
  }

  /**
   * Check if device fingerprint is blacklisted
   */
  public isFingerprintBlacklisted(fingerprint: string): boolean {
    return this.blacklistedFingerprints.has(fingerprint);
  }

  /**
   * Record signup attempt
   */
  public recordAttempt(req: Request, email?: string): void {
    const ip = this.getClientIP(req);
    const fingerprint = this.getDeviceFingerprint(req);
    const timestamp = Date.now();

    // Record by IP
    const ipAttempts = this.attemptCache.get(ip) || [];
    ipAttempts.push({ ip, timestamp, email, fingerprint });
    this.attemptCache.set(ip, ipAttempts);

    // Record by fingerprint
    const fingerprintAttempts = this.attemptCache.get(fingerprint) || [];
    fingerprintAttempts.push({ ip, timestamp, email, fingerprint });
    this.attemptCache.set(fingerprint, fingerprintAttempts);

    // Clean old attempts
    this.cleanOldAttempts(ip);
    this.cleanOldAttempts(fingerprint);
  }

  /**
   * Check if rate limit exceeded
   */
  public checkRateLimit(req: Request): { allowed: boolean; reason?: string } {
    const ip = this.getClientIP(req);
    const fingerprint = this.getDeviceFingerprint(req);
    const now = Date.now();

    // Check blacklist
    if (this.isIPBlacklisted(ip)) {
      return { allowed: false, reason: 'IP temporarily blocked due to suspicious activity' };
    }

    if (this.isFingerprintBlacklisted(fingerprint)) {
      return { allowed: false, reason: 'Device temporarily blocked due to suspicious activity' };
    }

    // Check IP rate limit
    const ipAttempts = this.attemptCache.get(ip) || [];
    const recentIPAttempts = ipAttempts.filter(a => now - a.timestamp < this.WINDOW_MS);
    
    if (recentIPAttempts.length >= this.MAX_ATTEMPTS_PER_IP) {
      this.blacklistIP(ip);
      return { allowed: false, reason: `Too many signup attempts. Please try again later.` };
    }

    // Check fingerprint rate limit
    const fingerprintAttempts = this.attemptCache.get(fingerprint) || [];
    const recentFingerprintAttempts = fingerprintAttempts.filter(a => now - a.timestamp < this.WINDOW_MS);
    
    if (recentFingerprintAttempts.length >= this.MAX_ATTEMPTS_PER_FINGERPRINT) {
      this.blacklistFingerprint(fingerprint);
      return { allowed: false, reason: 'Too many signup attempts from this device. Please try again later.' };
    }

    return { allowed: true };
  }

  /**
   * Blacklist IP temporarily
   */
  private blacklistIP(ip: string): void {
    this.blacklistedIPs.add(ip);
    setTimeout(() => {
      this.blacklistedIPs.delete(ip);
      console.log(`[SignupSecurity] IP unblocked: ${ip}`);
    }, this.BLACKLIST_DURATION);
    
    console.log(`[SignupSecurity] ⚠️  IP blacklisted: ${ip}`);
  }

  /**
   * Blacklist device fingerprint temporarily
   */
  private blacklistFingerprint(fingerprint: string): void {
    this.blacklistedFingerprints.add(fingerprint);
    setTimeout(() => {
      this.blacklistedFingerprints.delete(fingerprint);
    }, this.BLACKLIST_DURATION);
    
    console.log(`[SignupSecurity] ⚠️  Device fingerprint blacklisted: ${fingerprint.substring(0, 12)}...`);
  }

  /**
   * Clean old attempts from cache
   */
  private cleanOldAttempts(key: string): void {
    const attempts = this.attemptCache.get(key) || [];
    const now = Date.now();
    const recentAttempts = attempts.filter(a => now - a.timestamp < this.WINDOW_MS);
    
    if (recentAttempts.length > 0) {
      this.attemptCache.set(key, recentAttempts);
    } else {
      this.attemptCache.delete(key);
    }
  }

  /**
   * Get statistics
   */
  public getStats() {
    return {
      totalIPs: this.attemptCache.size,
      blacklistedIPs: this.blacklistedIPs.size,
      blacklistedFingerprints: this.blacklistedFingerprints.size
    };
  }
}

// Singleton instance
export const signupSecurityManager = new SignupSecurityManager();

/**
 * Rate limiting middleware for signup endpoints
 */
export const signupRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 requests per IP
  message: 'Too many signup attempts. Please try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const ip = (
      req.headers['cf-connecting-ip'] as string ||
      req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
      req.socket.remoteAddress
    );
    
    console.log(`[SignupSecurity] ⚠️  Rate limit exceeded for IP: ${ip}`);
    
    res.status(429).json({
      success: false,
      message: 'Too many signup attempts. Please try again in 15 minutes.',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Honeypot validation middleware
 * Checks for hidden form fields that should remain empty
 */
export const validateHoneypot = (req: Request, res: Response, next: NextFunction): void => {
  // Check common honeypot field names
  const honeypotFields = ['phone', 'website', 'address', 'company', 'fax'];
  
  for (const field of honeypotFields) {
    if (req.body[field] && req.body[field].trim() !== '') {
      console.log(`[SignupSecurity] 🍯 Honeypot triggered by field: ${field}`);
      
      // Silently reject (don't let bot know)
      res.status(200).json({
        success: true,
        message: 'Successfully registered!' // Fake success message
      });
      return;
    }
  }
  
  next();
};

/**
 * Device fingerprint and rate limit middleware
 */
export const checkSignupSecurity = (req: Request, res: Response, next: NextFunction): void => {
  const rateCheck = signupSecurityManager.checkRateLimit(req);
  
  if (!rateCheck.allowed) {
    res.status(429).json({
      success: false,
      message: rateCheck.reason
    });
    return;
  }
  
  // Record this attempt
  signupSecurityManager.recordAttempt(req, req.body.email);
  
  next();
};

/**
 * Middleware to log signup attempts for security monitoring
 */
export const logSignupAttempt = (req: Request, res: Response, next: NextFunction): void => {
  const ip = (
    req.headers['cf-connecting-ip'] as string ||
    req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
    req.socket.remoteAddress
  );
  
  const userAgent = req.headers['user-agent'] || 'unknown';
  const email = req.body.email || 'no-email';
  
  console.log(`[SignupSecurity] Attempt from IP: ${ip}, Email: ${email}, UA: ${userAgent.substring(0, 50)}`);
  
  next();
};
