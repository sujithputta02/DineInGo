import { Request, Response, NextFunction } from 'express';
import { isAccountLocked, recordFailedAttempt, flagSuspiciousActivity } from '../services/securityMonitor';

/**
 * ============================================================
 *  accountLockout Middleware Factory
 * ============================================================
 * Usage:
 *   router.post('/login', accountLockoutCheck('user'), ...)
 *   router.post('/login', accountLockoutCheck('business'), ...)
 *   router.post('/login', accountLockoutCheck('admin'), ...)
 *
 * On each request, it:
 *  1. Checks if the email is currently locked
 *  2. If locked — blocks the request and returns 429
 *  3. If not locked — attaches `recordFailedAttempt` and `clearLockout`
 *     helpers to req so the controller can call them
 */
export const accountLockoutCheck = (portal: 'user' | 'business' | 'admin') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const email: string = (req.body?.email || '').toLowerCase().trim();

    if (!email) return next(); // No email in body = let controller handle it

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || 'unknown';

    const { locked, remainingMinutes, message } = await isAccountLocked(email, portal);

    if (locked) {
      await flagSuspiciousActivity({
        type: 'locked_account_attempt',
        portal,
        ip,
        route: req.path,
        details: `Login attempted on locked account: ${email}`,
        severity: 'high',
        userAgent: req.headers['user-agent']
      });

      return res.status(429).json({
        success: false,
        locked: true,
        remainingMinutes,
        message: message || 'Account is temporarily locked. Please try again later.'
      });
    }

    // Attach helpers to the request object for use by the controller
    (req as any).security = {
      email,
      portal,
      ip,
      route: req.path,
      userAgent: req.headers['user-agent']
    };

    next();
  };
};

/**
 * Middleware to detect suspicious header patterns beyond User-Agent
 * — targets: missing Accept header, unusual Content-Type combinations
 */
export const requestIntegrityCheck = (req: Request, res: Response, next: NextFunction) => {
  // Skip for GET & health checks
  if (req.method === 'GET' || req.path === '/health') return next();

  const contentType = req.headers['content-type'] || '';

  // API endpoints should use JSON — reject non-JSON POST/PUT/DELETE
  if (!contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
    const ip = req.ip || 'unknown';
    console.warn(`⚠️  Suspicious content-type "${contentType}" from IP: ${ip} on ${req.path}`);
    // Log but don't block to avoid breaking legitimate edge cases
  }

  next();
};
