import mongoose, { Document, Schema } from 'mongoose';

/**
 * SecurityEvent — DineInGo Intrusion Detection Log
 *
 * Stores every suspicious event across all three portals.
 * Used by the SecurityMonitor service to trigger alerts.
 */

export interface ISecurityEvent extends Document {
  eventType: string;         // e.g. 'brute_force', 'prompt_injection', 'account_locked'
  portal: 'user' | 'business' | 'admin' | 'api'; // Which portal triggered the event
  severity: 'low' | 'medium' | 'high' | 'critical';
  ip: string;
  userAgent?: string;
  userId?: string;           // Firebase UID, if known
  email?: string;
  route?: string;            // Which endpoint was targeted
  details: string;           // Human-readable description
  metadata?: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

const securityEventSchema = new Schema<ISecurityEvent>({
  eventType: { type: String, required: true, index: true },
  portal: { type: String, enum: ['user', 'business', 'admin', 'api'], required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  ip: { type: String, required: true, index: true },
  userAgent: String,
  userId: { type: String, index: true },
  email: { type: String, index: true },
  route: String,
  details: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now, index: true },
  resolved: { type: Boolean, default: false },
  resolvedAt: Date
});

// Auto-delete resolved events older than 90 days
securityEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const SecurityEvent = mongoose.model<ISecurityEvent>('SecurityEvent', securityEventSchema);
