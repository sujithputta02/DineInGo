/**
 * DineInGo Frontend Console Security
 * ============================================================
 * In PRODUCTION build, this module completely silences the
 * browser DevTools console so no user data, API responses,
 * or internal debug info is visible to end users.
 *
 * Import this at the very top of main.tsx
 */

export function suppressProductionLogs() {
  if (import.meta.env.PROD) {
    // Override all console methods
    const noop = () => {};
    console.log = noop;
    console.debug = noop;
    console.info = noop;
    console.warn = noop;
    // Keep console.error for critical client-side issues only
    // but strip stack traces in prod
    const originalError = console.error.bind(console);
    console.error = (...args: any[]) => {
      // Only show the message, not full objects or stack traces
      const safeArgs = args.map(a =>
        typeof a === 'string' ? a : a instanceof Error ? a.message : '[Error]'
      );
      originalError(...safeArgs);
    };
  }
}
