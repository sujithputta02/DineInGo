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
  if (true) { // Suppress all portal logs as requested
    // Override all console methods
    const noop = () => {};
    console.log = noop;
    console.debug = noop;
    console.info = noop;
    console.warn = noop;
    console.clear = noop;
    console.table = noop;
    console.dir = noop;
    console.time = noop;
    console.timeEnd = noop;
    
    // Clear initial logs
    window.console.clear();
    
    // Keep console.error for critical client-side issues only
    const originalError = console.error.bind(console);
    console.error = (...args: any[]) => {
      // Stripped error reporting
      const message = args.map(a => 
        typeof a === 'string' ? a : a instanceof Error ? a.message : 'Application Error'
      ).join(' ');
      originalError(`[DineInGo] ${message}`);
    };
  }
}
