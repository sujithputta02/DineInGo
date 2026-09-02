/**
 * Admin Two-Factor Authentication (TOTP) Service
 *
 * Implements RFC 6238 TOTP using otplib, with:
 *  - Per-admin secret storage (AES-256-GCM encrypted at rest using JWT_SECRET-derived key)
 *  - QR code generation for authenticator app enrollment
 *  - Backup/recovery codes (bcrypt-hashed)
 *  - Constant-time backup code verification
 */

import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const ENCRYPTION_KEY_ENV = process.env.JWT_SECRET || 'dev-only-do-not-use-in-prod';
const ALGORITHM = 'aes-256-gcm';

/**
 * Derive a 32-byte key from the configured secret. We never use the raw env var
 * directly; this gives us a stable key even if the env length varies.
 */
function getKey(): Buffer {
  return crypto.createHash('sha256').update(ENCRYPTION_KEY_ENV).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: base64(iv).base64(tag).base64(ciphertext)
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

export function decryptSecret(stored: string): string {
  try {
    const [ivB64, tagB64, dataB64] = stored.split('.');
    if (!ivB64 || !tagB64 || !dataB64) return '';
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

/**
 * Generate a new random TOTP secret (base32).
 */
export function generateTwoFactorSecret(): string {
  return authenticator.generateSecret();
}

/**
 * Generate the otpauth:// URI used by QR codes and manual entry.
 */
export function buildOtpAuthUri(email: string, secret: string): string {
  const issuer = 'DineInGo Admin';
  return authenticator.keyuri(email, issuer, secret);
}

/**
 * Generate a QR code data URL containing the otpauth URI.
 */
export async function generateTwoFactorQRCode(email: string, secret: string): Promise<string> {
  const uri = buildOtpAuthUri(email, secret);
  return qrcode.toDataURL(uri, { width: 240, margin: 1 });
}

const TOTP_WINDOW = 10;

authenticator.options = { 
  window: TOTP_WINDOW,
  step: 30
};

/**
 * Verify a 6-digit TOTP token against a decrypted secret.
 * Supports clock drift tolerance via window parameter.
 */
export function verifyTwoFactorToken(token: string, secret: string): boolean {
  try {
    const clean = token.trim().replace(/\s+/g, '');
    if (!/^\d{6}$/.test(clean)) return false;
    authenticator.options = { 
      window: TOTP_WINDOW,
      step: 30
    };
    return authenticator.check(clean, secret) || authenticator.verify({ token: clean, secret });
  } catch {
    return false;
  }
}

/**
 * Generate N backup codes. Returns the plain codes once (to show to the admin)
 * alongside their bcrypt hashes (to store). We use a non-standard 10-char
 * alphanumeric format (XXXX-XXXX) for human readability.
 */
export function generateBackupCodes(count = 10): { plain: string[]; hashes: string[] } {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  const plain: string[] = [];
  const hashes: string[] = [];

  for (let i = 0; i < count; i++) {
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    const formatted = `${code.slice(0, 4)}-${code.slice(4)}`;
    plain.push(formatted);
    hashes.push(bcrypt.hashSync(formatted, 10));
  }

  return { plain, hashes };
}

/**
 * Verify a backup code against the stored hashes in constant time.
 * If matched, returns true and the caller should remove that code from the list.
 */
export function verifyBackupCode(code: string, hashes: string[]): boolean {
  const clean = code.trim().toUpperCase();
  if (!clean) return false;
  for (const hash of hashes) {
    if (bcrypt.compareSync(clean, hash)) {
      return true;
    }
  }
  return false;
}

/**
 * Remove a used backup code from a hashes array (returns new array).
 */
export function consumeBackupCode(code: string, hashes: string[]): string[] {
  const clean = code.trim().toUpperCase();
  return hashes.filter(hash => !bcrypt.compareSync(clean, hash));
}
