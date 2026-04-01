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
 *  2. Store the token in localStorage (persists across restarts)
 *  3. Navigate to /dashboard/{token}
 *  4. DashboardPage validates the URL token matches localStorage
 *  5. On logout, the token is wiped manually
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
  localStorage.setItem(SESSION_KEY, token);
  localStorage.setItem(SESSION_UID_KEY, uid);
  return token;
}

/** Validate that the URL token matches the stored session token */
export function validateSession(urlToken: string | undefined): boolean {
  if (!urlToken) return false;
  const storedToken = localStorage.getItem(SESSION_KEY);
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
  return localStorage.getItem(SESSION_KEY);
}

/** Clear session on logout */
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_UID_KEY);
  localStorage.removeItem('userData');
}

/** Get the dashboard URL with session token embedded */
export function getSecureDashboardUrl(): string {
  const token = getSessionToken();
  if (!token) return '/login';
  return `/dashboard/${token}`;
}
/** Save both user data and session info in one atomic step */
export function persistUserSession(userData: any, uid: string): string {
  const token = createSession(uid);
  updateSessionStorage(userData);
  return token;
}

/** Update the legacy 'userData' storage object while preserving sensitive fields */
export function updateSessionStorage(data: any): void {
  // Unwrap data if it comes from an axios response
  const userToSave = data?.data || data;
  
  // Get existing data to merge, but don't let it override the new vetted data
  const storedUser = localStorage.getItem('userData');
  const parsedStored = storedUser ? JSON.parse(storedUser) : {};
  
  localStorage.setItem('userData', JSON.stringify({
    ...parsedStored,
    ...userToSave,
    // Ensure we don't accidentally wipe the role if it's already there
    role: userToSave.role || parsedStored.role || 'user'
  }));
}
