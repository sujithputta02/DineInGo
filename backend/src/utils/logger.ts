/**
 * ============================================================
 *  DineInGo Production Logger
 * ============================================================
 * - In PRODUCTION: All console.log, debug, and sensitive info
 *   is completely suppressed. Only errors are kept.
 * - In DEVELOPMENT: Normal logging allowed.
 *
 * Usage:
 *   import logger from '../utils/logger';
 *   logger.info('Server started');   // safe in prod
 *   logger.debug('User UID:', uid);  // suppressed in prod
 *   logger.error('DB error:', err);  // always shown
 */

const isProd = process.env.NODE_ENV === 'production';

const logger = {
  /** Shows in development only */
  debug: (...args: any[]) => {
    if (!isProd) console.log('[DEBUG]', ...args);
  },

  /** Shows in both environments — keep it non-sensitive */
  info: (...args: any[]) => {
    if (!isProd) console.log('[INFO]', ...args);
  },

  /** Always shown — for warnings that matter in production */
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },

  /** Always shown — for errors */
  error: (...args: any[]) => {
    // In production, sanitize the error to avoid leaking stack traces
    if (isProd) {
      const safeArgs = args.map(a =>
        a instanceof Error ? { message: a.message, name: a.name } : typeof a === 'string' ? a : '[object]'
      );
      console.error('[ERROR]', ...safeArgs);
    } else {
      console.error('[ERROR]', ...args);
    }
  },

  /** Security events — always shown as warnings */
  security: (...args: any[]) => {
    console.warn('[SECURITY]', ...args);
  }
};

export default logger;
