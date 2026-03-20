import mongoose, { Document, Schema } from 'mongoose';

/**
 * LoginAttempt — DineInGo Account Lockout System
 *
 * Tracks consecutive failed login attempts per email address.
 * After MAX_ATTEMPTS, the account is locked for LOCKOUT_DURATION.
 */

export interface ILoginAttempt extends Document {
  email: string;
  portal: 'user' | 'business' | 'admin';
  failedAttempts: number;
  lastAttempt: Date;
  lockedUntil?: Date;
  isLocked: boolean;
  lockCount: number;          // How many times has this account been locked (escalating lockout)
  lastIp?: string;
}

const loginAttemptSchema = new Schema<ILoginAttempt>({
  email: { type: String, required: true, lowercase: true, index: true },
  portal: { type: String, enum: ['user', 'business', 'admin'], required: true },
  failedAttempts: { type: Number, default: 0 },
  lastAttempt: { type: Date, default: Date.now },
  lockedUntil: Date,
  isLocked: { type: Boolean, default: false },
  lockCount: { type: Number, default: 0 },
  lastIp: String
});

// Compound index per email+portal
loginAttemptSchema.index({ email: 1, portal: 1 }, { unique: true });

// Auto-delete records older than 24 hours (if not locked)
loginAttemptSchema.index({ lastAttempt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export const LoginAttempt = mongoose.model<ILoginAttempt>('LoginAttempt', loginAttemptSchema);
