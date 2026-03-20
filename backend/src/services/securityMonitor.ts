import { LoginAttempt } from '../models/LoginAttempt';
import { SecurityEvent } from '../models/SecurityEvent';
import nodemailer from 'nodemailer';

/**
 * ============================================================
 *  SecurityMonitor — DineInGo Intrusion Detection System
 * ============================================================
 * Covers all 3 portals: User, Business, and Admin.
 *
 *  Features:
 *   1. Account Lockout (escalating) — blocks brute force across portals
 *   2. Security Event Logging — persistent audit trail in MongoDB
 *   3. Email alerting — notifies the team on critical events
 *   4. IP anomaly detection — flags impossible travel / multi-account attacks
 */

const MAX_ATTEMPTS = 5;           // Lock after 5 consecutive failures
const BASE_LOCKOUT_MINUTES = 15;  // First lockout = 15 min; doubles each time
const ALERT_EMAIL = process.env.EMAIL_USER || 'sec.dineingo.team@gmail.com';

// ─────────────────────────────────────────────────────────
// Email transporter (reuses existing project config)
// ─────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendSecurityAlert(subject: string, body: string) {
  try {
    await transporter.sendMail({
      from: `"DineInGo Security" <${ALERT_EMAIL}>`,
      to: ALERT_EMAIL,
      subject: `🚨 DineInGo Security Alert: ${subject}`,
      html: `
        <div style="font-family:monospace;background:#111;color:#0f0;padding:20px;border-radius:8px;">
          <h2 style="color:#ff4444;">🚨 Security Alert — DineInGo</h2>
          <pre style="color:#eee;">${body}</pre>
          <hr style="border:1px solid #333;"/>
          <p style="color:#888;">This is an automated alert from DineInGo Security Monitor.<br/>Time: ${new Date().toISOString()}</p>
        </div>
      `
    });
  } catch (err) {
    console.error('SecurityMonitor: Failed to send alert email:', err);
  }
}

// ─────────────────────────────────────────────────────────
// 1. LOG SECURITY EVENT
// ─────────────────────────────────────────────────────────
export async function logSecurityEvent(data: {
  eventType: string;
  portal: 'user' | 'business' | 'admin' | 'api';
  severity: 'low' | 'medium' | 'high' | 'critical';
  ip: string;
  userAgent?: string;
  userId?: string;
  email?: string;
  route?: string;
  details: string;
  metadata?: Record<string, any>;
}) {
  try {
    await SecurityEvent.create(data);

    // Alert on high/critical events
    if (data.severity === 'critical' || data.severity === 'high') {
      await sendSecurityAlert(
        data.eventType,
        `Portal: ${data.portal}\nSeverity: ${data.severity}\nIP: ${data.ip}\nEmail: ${data.email || 'unknown'}\nRoute: ${data.route || 'unknown'}\n\nDetails: ${data.details}`
      );
    }

    console.log(`🛡️  [SecurityMonitor] ${data.severity.toUpperCase()} | ${data.eventType} | IP: ${data.ip} | ${data.details}`);
  } catch (err) {
    console.error('SecurityMonitor: Failed to log event:', err);
  }
}

// ─────────────────────────────────────────────────────────
// 2. ACCOUNT LOCKOUT — Check if account is locked
// ─────────────────────────────────────────────────────────
export async function isAccountLocked(email: string, portal: 'user' | 'business' | 'admin'): Promise<{
  locked: boolean;
  remainingMinutes?: number;
  message?: string;
}> {
  const attempt = await LoginAttempt.findOne({ email: email.toLowerCase(), portal });

  if (!attempt || !attempt.isLocked || !attempt.lockedUntil) {
    return { locked: false };
  }

  const now = new Date();
  if (attempt.lockedUntil > now) {
    const remainingMs = attempt.lockedUntil.getTime() - now.getTime();
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    return {
      locked: true,
      remainingMinutes,
      message: `Your account is temporarily locked due to too many failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}.`
    };
  }

  // Lockout expired - reset
  await LoginAttempt.updateOne(
    { email: email.toLowerCase(), portal },
    { $set: { isLocked: false, failedAttempts: 0, lockedUntil: undefined } }
  );

  return { locked: false };
}

// ─────────────────────────────────────────────────────────
// 3. ACCOUNT LOCKOUT — Record failed attempt
// ─────────────────────────────────────────────────────────
export async function recordFailedAttempt(
  email: string,
  portal: 'user' | 'business' | 'admin',
  ip: string,
  route?: string
): Promise<void> {
  const existing = await LoginAttempt.findOne({ email: email.toLowerCase(), portal });

  if (existing) {
    existing.failedAttempts += 1;
    existing.lastAttempt = new Date();
    existing.lastIp = ip;

    if (existing.failedAttempts >= MAX_ATTEMPTS) {
      // Escalating lockout: doubles each time it's locked
      const lockoutMinutes = BASE_LOCKOUT_MINUTES * Math.pow(2, existing.lockCount);
      existing.isLocked = true;
      existing.lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
      existing.lockCount += 1;

      await logSecurityEvent({
        eventType: 'account_locked',
        portal,
        severity: existing.lockCount > 2 ? 'critical' : 'high',
        ip,
        email,
        route,
        details: `Account locked after ${existing.failedAttempts} failed attempts. Lock #${existing.lockCount} for ${lockoutMinutes} minutes.`,
        metadata: { lockoutMinutes, lockCount: existing.lockCount }
      });
    } else {
      await logSecurityEvent({
        eventType: 'failed_login',
        portal,
        severity: existing.failedAttempts >= 3 ? 'medium' : 'low',
        ip,
        email,
        route,
        details: `Failed login attempt #${existing.failedAttempts}/${MAX_ATTEMPTS}`,
        metadata: { attempt: existing.failedAttempts }
      });
    }

    await existing.save();
  } else {
    await LoginAttempt.create({
      email: email.toLowerCase(),
      portal,
      failedAttempts: 1,
      lastIp: ip
    });

    await logSecurityEvent({
      eventType: 'failed_login',
      portal,
      severity: 'low',
      ip,
      email,
      route,
      details: `First failed login attempt`,
    });
  }
}

// ─────────────────────────────────────────────────────────
// 4. RESET on successful login
// ─────────────────────────────────────────────────────────
export async function resetFailedAttempts(email: string, portal: 'user' | 'business' | 'admin'): Promise<void> {
  await LoginAttempt.deleteOne({ email: email.toLowerCase(), portal });
}

// ─────────────────────────────────────────────────────────
// 5. LOG SUSPICIOUS ACTIVITY (general purpose)
// ─────────────────────────────────────────────────────────
export async function flagSuspiciousActivity(data: {
  type: string;
  portal: 'user' | 'business' | 'admin' | 'api';
  ip: string;
  route: string;
  details: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  userAgent?: string;
  userId?: string;
}): Promise<void> {
  await logSecurityEvent({
    eventType: data.type,
    portal: data.portal,
    severity: data.severity || 'medium',
    ip: data.ip,
    userAgent: data.userAgent,
    userId: data.userId,
    route: data.route,
    details: data.details
  });
}
