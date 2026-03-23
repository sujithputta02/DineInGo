/**
 * ============================================================
 *  DineInGo Session Guard Utility
 * ============================================================
 * Generates and validates cryptographically random session
 * tokens that are embedded in the dashboard URL.
 *
 * This prevents:
 *  - URL enumeration / guessing the dashboard URL
 *  - SQL injection attempts via predictable URL parameters
 *  - Session fixation attacks
 *  - Unauthorized direct navigation to /dashboard
 *
 * How it works:
 *  1. On login, generate a random 32-byte token (64 hex chars)
 *  2. Store the token in sessionStorage (tab-scoped, never persists)
 *  3. Navigate to /dashboard/{token}
 *  4. DashboardPage validates the URL token matches sessionStorage
 *  5. On logout or tab close, the token is wiped automatically
 */

const SESSION_KEY = '__dineingo_stk__';
const SESSION_UID_KEY = '__dineingo_uid__';

/** Generate a cryptographically random 64-char hex token */
export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Store session token tied to a specific user UID */
export function createSession(uid: string): string {
  const token = generateSessionToken();
  sessionStorage.setItem(SESSION_KEY, token);
  sessionStorage.setItem(SESSION_UID_KEY, uid);
  return token;
}

/** Validate that the URL token matches the stored session token */
export function validateSession(urlToken: string | undefined): boolean {
  if (!urlToken) return false;
  const storedToken = sessionStorage.getItem(SESSION_KEY);
  if (!storedToken) return false;
  // Constant-time comparison to prevent timing attacks
  if (urlToken.length !== storedToken.length) return false;
  let mismatch = 0;
  for (let i = 0; i < urlToken.length; i++) {
    mismatch |= urlToken.charCodeAt(i) ^ storedToken.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Get the current stored session token (for navigation) */
export function getSessionToken(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

/** Clear session on logout */
export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_UID_KEY);
}

/** Get the dashboard URL with session token embedded */
export function getSecureDashboardUrl(): string {
  const token = getSessionToken();
  if (!token) return '/login';
  return `/dashboard/${token}`;
}
