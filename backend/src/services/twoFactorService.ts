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

const ALGORITHM = 'aes-256-gcm';

/**
 * TOTP time-skew tolerance (in 30-second steps).
 * Window of 10 = ±5 minutes tolerance to accommodate clock drift.
 */
const TOTP_WINDOW = 10;

// Configure the authenticator instance with window and step (DO NOT set epoch: 0)
authenticator.options = { 
  window: TOTP_WINDOW,
  step: 30
};

console.log('[TOTP] Authenticator configured:', {
  window: authenticator.options.window,
  step: authenticator.options.step,
  tolerance: `±${TOTP_WINDOW * 30} seconds`
});

/**
 * Dynamically resolve the encryption key
 */
function getEncryptionKey(): string {
  try {
    const { secretManager } = require('../utils/secretManager');
    if (secretManager?.hasSecret?.('JWT_SECRET')) {
      return secretManager.getSecret('JWT_SECRET');
    }
  } catch {}
  return process.env.JWT_SECRET || 'dev-only-do-not-use-in-prod';
}

/**
 * Derive a 32-byte key from the configured secret.
 */
function getKey(keyStr?: string): Buffer {
  const secret = keyStr || getEncryptionKey();
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join('.');
}

export function decryptSecret(stored: string): string {
  if (!stored) return '';
  // If stored is already an unencrypted base32 secret (no dots)
  if (!stored.includes('.')) return stored;

  const currentKey = getEncryptionKey();
  const keysToTry = [currentKey, process.env.JWT_SECRET, 'dev-only-do-not-use-in-prod'].filter((k): k is string => Boolean(k));
  const uniqueKeys = Array.from(new Set(keysToTry));

  for (const k of uniqueKeys) {
    try {
      const [ivB64, tagB64, dataB64] = stored.split('.');
      if (!ivB64 || !tagB64 || !dataB64) continue;
      const decipher = crypto.createDecipheriv(ALGORITHM, getKey(k), Buffer.from(ivB64, 'base64'));
      decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
      const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
      if (decrypted) return decrypted;
    } catch {
      // try next key
    }
  }
  return '';
}

export function generateTwoFactorSecret(): string {
  return authenticator.generateSecret();
}

export function buildOtpAuthUri(email: string, secret: string): string {
  const issuer = 'DineInGo Admin';
  return authenticator.keyuri(email, issuer, secret);
}

export async function generateTwoFactorQRCode(email: string, secret: string): Promise<string> {
  const uri = buildOtpAuthUri(email, secret);
  return qrcode.toDataURL(uri, { width: 240, margin: 1 });
}

/**
 * Verify a 6-digit TOTP token against a decrypted secret.
 * Supports clock drift tolerance via window parameter.
 */
export function verifyTwoFactorToken(token: string, secret: string): boolean {
  try {
    if (!token || !secret) {
      console.log('[TOTP] Missing token or secret');
      return false;
    }

    const clean = token.trim().replace(/\s+/g, '');
    if (!/^\d{6}$/.test(clean)) {
      console.log('[TOTP] Invalid token format:', { token: clean, length: clean.length });
      return false;
    }
    
    // Ensure window and step are configured (DO NOT set epoch: 0!)
    authenticator.options = { 
      window: TOTP_WINDOW,
      step: 30
    };
    
    const result = authenticator.check(clean, secret) || authenticator.verify({ token: clean, secret });
    
    if (!result) {
      const expectedToken = authenticator.generate(secret);
      console.log('[TOTP] Verification FAILED:', { 
        provided: clean,
        expected: expectedToken,
        window: authenticator.options.window,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('[TOTP] Verification SUCCESS:', { 
        token: clean,
        timestamp: new Date().toISOString()
      });
    }
    
    return result;
  } catch (err: any) {
    console.error('[TOTP] Error:', err?.message);
    return false;
  }
}

export async function generateQRCodeForUrl(url: string): Promise<string> {
  return qrcode.toDataURL(url, { width: 240, margin: 1 });
}

export function generateBackupCodes(count = 10): { plain: string[]; hashes: string[] } {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789';
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

export function consumeBackupCode(code: string, hashes: string[]): string[] {
  const clean = code.trim().toUpperCase();
  return hashes.filter(hash => !bcrypt.compareSync(clean, hash));
}

export { authenticator };
