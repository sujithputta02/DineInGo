import mongoose, { Schema, Document } from 'mongoose';

export interface ISecurityLog extends Document {
  portal: 'user' | 'business' | 'admin' | 'system';
  eventType: 'blocked_ip' | 'failed_login' | 'auth_bypass_attempt' | 'suspicious_activity' | 'rate_limit_exceeded' | 'mass_email_broadcast' | 'permission_change' | 'impersonation_start' | 'IP_BLOCKED_MANUAL' | 'IP_UNBLOCKED' | 'deep_scan_completed' | 'secret_leak_detected' | 'failed_2fa_setup' | '2fa_enabled' | 'failed_2fa' | '2fa_disabled' | 'sessions_revoked' | 'new_ip_login';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  ip: string;
  userAgent?: string;
  path?: string;
  userId?: string;
  timestamp: Date;
}

const SecurityLogSchema: Schema = new Schema({
  portal: {
    type: String,
    enum: ['user', 'business', 'admin', 'system'],
    required: true
  },
  eventType: {
    type: String,
    enum: [
      'blocked_ip', 
      'failed_login', 
      'auth_bypass_attempt', 
      'suspicious_activity', 
      'rate_limit_exceeded',
      'mass_email_broadcast',
      'permission_change',
      'impersonation_start',
      'IP_BLOCKED_MANUAL',
      'IP_UNBLOCKED',
      'deep_scan_completed',
      'secret_leak_detected',
      'failed_2fa_setup',
      '2fa_enabled',
      'failed_2fa',
      '2fa_disabled',
      'sessions_revoked',
      'new_ip_login'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  details: {
    type: String,
    required: true
  },
  ip: {
    type: String,
    required: true
  },
  userAgent: {
    type: String
  },
  path: {
    type: String
  },
  userId: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// TTL index to automatically remove logs older than 30 days to save space
SecurityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const SecurityLog = mongoose.models.SecurityLog || mongoose.model<ISecurityLog>('SecurityLog', SecurityLogSchema);
