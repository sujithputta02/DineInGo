/**
 * 2FA Enforcement Service
 * 
 * Manages automatic 2FA reminders and enforcement:
 * - Immediate reminder when admin account is created/activated without 2FA
 * - Follow-up reminders on Day 1, Day 3, and Day 7
 * - Automatic account deactivation if 2FA not enabled by deadline
 * - Stops reminders when 2FA is enabled
 * - Fully idempotent to prevent duplicate emails and actions
 */

import { Admin } from '../models/Admin';
import { SecurityLog } from '../models/SecurityLog';
import { emailService } from './emailService';
import dayjs from 'dayjs';

export interface TwoFactorReminderSchedule {
  reminderNumber: number; // 1 (immediate), 2 (day 1), 3 (day 3), 4 (day 7)
  daysFromNow: number;
  label: string;
}

const REMINDER_SCHEDULE: TwoFactorReminderSchedule[] = [
  { reminderNumber: 1, daysFromNow: 0, label: 'Immediate' },
  { reminderNumber: 2, daysFromNow: 1, label: 'Day 1' },
  { reminderNumber: 3, daysFromNow: 3, label: 'Day 3' },
  { reminderNumber: 4, daysFromNow: 7, label: 'Day 7 (Final)' }
];

const TWO_FA_ENFORCEMENT_DAYS = 7;

/**
 * Initiate 2FA reminder process for a newly created or reactivated admin
 * Sets a 7-day deadline and sends the immediate reminder
 */
export async function initiateTwoFactorReminders(adminEmail: string): Promise<void> {
  try {
    const admin = await Admin.findOne({ email: adminEmail.toLowerCase() })
      .select('+twoFactorEnabled +twoFactorDeadline +twoFactorRemindersSent +twoFactorReminderScheduled');

    if (!admin) {
      console.error(`🔴 Admin not found for 2FA reminder initiation: ${adminEmail}`);
      return;
    }

    // Skip if 2FA is already enabled
    if (admin.twoFactorEnabled) {
      console.log(`ℹ️ 2FA already enabled for ${adminEmail}, skipping reminder initiation`);
      return;
    }

    // Set deadline to 7 days from now if not already set
    if (!admin.twoFactorDeadline) {
      admin.twoFactorDeadline = dayjs().add(TWO_FA_ENFORCEMENT_DAYS, 'day').toDate();
      admin.twoFactorRemindersSent = 0;
      admin.twoFactorDeactivationReason = undefined; // Clear any previous deactivation reason
      await admin.save();
      console.log(`✓ 2FA deadline set for ${adminEmail}: ${admin.twoFactorDeadline}`);
    }

    // Send immediate reminder
    await sendTwoFactorReminder(adminEmail, 1);
  } catch (error: any) {
    console.error(`🔴 Error initiating 2FA reminders for ${adminEmail}:`, error?.message || error);
    await logSecurityEvent('2fa_reminder_initiation_failed', adminEmail, 'high', `Failed to initiate: ${error?.message}`);
  }
}

/**
 * Send a 2FA reminder email at a specific stage
 * Prevents duplicate sends using idempotency check
 */
export async function sendTwoFactorReminder(adminEmail: string, reminderNumber: number): Promise<void> {
  try {
    const admin = await Admin.findOne({ email: adminEmail.toLowerCase() })
      .select('+twoFactorEnabled +twoFactorDeadline +twoFactorRemindersSent +lastReminderSentAt');

    if (!admin) {
      console.error(`🔴 Admin not found for 2FA reminder send: ${adminEmail}`);
      return;
    }

    // Skip if 2FA is already enabled
    if (admin.twoFactorEnabled) {
      console.log(`ℹ️ 2FA already enabled for ${adminEmail}, skipping reminder`);
      return;
    }

    // Idempotency check: don't send duplicate reminders on the same day
    if (admin.lastReminderSentAt) {
      const lastSentDate = new Date(admin.lastReminderSentAt);
      const today = new Date();
      lastSentDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);

      if (lastSentDate.getTime() === today.getTime() && admin.twoFactorRemindersSent! >= reminderNumber) {
        console.log(`ℹ️ Reminder already sent today for ${adminEmail}, skipping`);
        return;
      }
    }

    const reminder = REMINDER_SCHEDULE.find(r => r.reminderNumber === reminderNumber);
    if (!reminder) {
      console.error(`🔴 Invalid reminder number: ${reminderNumber}`);
      return;
    }

    const daysRemaining = calculateDaysRemaining(admin.twoFactorDeadline!);
    
    // Send the premium branded email
    await emailService.sendTwoFactorReminderEmail(
      admin.email,
      reminderNumber,
      reminder.label,
      daysRemaining,
      admin.timezone || 'Asia/Kolkata'
    );

    // Update reminder tracking
    admin.twoFactorRemindersSent = Math.max(admin.twoFactorRemindersSent || 0, reminderNumber);
    admin.lastReminderSentAt = new Date();
    await admin.save();

    console.log(`✓ 2FA reminder #${reminderNumber} (${reminder.label}) sent to ${adminEmail}. Days remaining: ${daysRemaining}`);
    await logSecurityEvent('2fa_reminder_sent', adminEmail, 'low', `Reminder #${reminderNumber} (${reminder.label}) sent. Days remaining: ${daysRemaining}`);
  } catch (error: any) {
    console.error(`🔴 Error sending 2FA reminder to ${adminEmail}:`, error?.message || error);
    await logSecurityEvent('2fa_reminder_send_failed', adminEmail, 'medium', `Failed to send reminder #${reminderNumber}: ${error?.message}`);
  }
}

/**
 * Activate all admins without 2FA and start their 7-day enforcement deadline from today
 * Sends immediate reminder alert emails to each admin
 */
export async function activateAndResetAllNon2FAAdminsFromToday(): Promise<{ updated: number; emails: string[] }> {
  const updatedEmails: string[] = [];
  try {
    const newDeadline = dayjs().add(TWO_FA_ENFORCEMENT_DAYS, 'day').toDate();
    console.log(`🔐 Activating and starting 7-day 2FA enforcement from today (${newDeadline.toISOString()})...`);

    const admins = await Admin.find({
      twoFactorEnabled: { $ne: true },
      role: { $ne: 'super_admin' }
    }).select('+twoFactorDeadline +twoFactorRemindersSent +twoFactorDeactivationReason +lastReminderSentAt +isActive');

    for (const admin of admins) {
      admin.isActive = true;
      admin.twoFactorDeadline = newDeadline;
      admin.twoFactorRemindersSent = 1; // Mark reminder #1 sent
      admin.twoFactorDeactivationReason = undefined;
      admin.lastReminderSentAt = new Date();
      await admin.save();

      // Send the immediate 2FA setup reminder alert email starting today
      try {
        await emailService.sendTwoFactorReminderEmail(
          admin.email,
          1,
          'Immediate Alert',
          7,
          admin.timezone || 'Asia/Kolkata'
        );
        console.log(`📧 Sent Day-0 2FA alert email to ${admin.email}`);
      } catch (emailErr) {
        console.error(`Failed to send 2FA alert email to ${admin.email}:`, emailErr);
      }

      await logSecurityEvent('2fa_activated_and_started_from_today', admin.email, 'low', `Admin activated and 7-day 2FA deadline set to ${newDeadline.toISOString()}`);
      updatedEmails.push(admin.email);
    }

    console.log(`✓ Successfully activated and initiated 7-day 2FA deadline from today for ${updatedEmails.length} admin(s)`);
    return { updated: updatedEmails.length, emails: updatedEmails };
  } catch (error: any) {
    console.error('🔴 Error activating and resetting non-2FA admins from today:', error);
    return { updated: updatedEmails.length, emails: updatedEmails };
  }
}

/**
 * Scheduled job: Check for overdue 2FA deadlines and auto-deactivate
 * Runs daily to enforce 2FA compliance
 */
export async function checkAndEnforceTwoFactorDeadlines(): Promise<{ checked: number; deactivated: number }> {
  let deactivatedCount = 0;
  try {
    console.log(`🔔 Running 2FA deadline enforcement check...`);

    // Find all active non-super_admin accounts without 2FA enabled
    const adminsWithout2FA = await Admin.find({
      twoFactorEnabled: { $ne: true },
      role: { $ne: 'super_admin' },
      isActive: true
    }).select('+twoFactorDeadline +twoFactorDeactivationReason +createdAt');

    console.log(`ℹ️ Found ${adminsWithout2FA.length} active admin(s) without 2FA enabled`);

    const now = new Date();

    for (const admin of adminsWithout2FA) {
      try {
        // If deadline is not yet set, initialize it for 7 days from now
        if (!admin.twoFactorDeadline) {
          admin.twoFactorDeadline = dayjs().add(TWO_FA_ENFORCEMENT_DAYS, 'day').toDate();
          admin.twoFactorRemindersSent = 0;
          await admin.save();
          console.log(`✓ Initialized 7-day 2FA deadline from today for ${admin.email}: ${admin.twoFactorDeadline.toISOString()}`);
        }

        // Check if deadline has passed (after full 7 days from deadline start)
        if (admin.twoFactorDeadline < now) {
          // Deactivate the admin account temporarily
          admin.isActive = false;
          admin.twoFactorDeactivationReason = '2FA_NOT_ENABLED';
          await admin.save();

          deactivatedCount++;
          console.log(`🔒 Auto-deactivated admin ${admin.email} due to 2FA non-compliance (Deadline: ${admin.twoFactorDeadline})`);
          
          await logSecurityEvent(
            '2fa_auto_deactivation',
            admin.email,
            'high',
            `Admin account automatically deactivated due to 2FA enforcement deadline passed (${admin.twoFactorDeadline.toISOString()})`
          );

          // Send deactivation notification email (non-blocking)
          emailService.sendTwoFactorDeactivationNoticeEmail(admin.email, admin.timezone || 'Asia/Kolkata').catch(err =>
            console.error(`Failed to send deactivation email to ${admin.email}:`, err)
          );
        }
      } catch (err: any) {
        console.error(`🔴 Error processing admin ${admin.email} for 2FA deadline:`, err?.message || err);
        await logSecurityEvent('2fa_deactivation_failed', admin.email, 'high', `Failed to check/deactivate: ${err?.message}`);
      }
    }

    return { checked: adminsWithout2FA.length, deactivated: deactivatedCount };
  } catch (error: any) {
    console.error(`🔴 Error in 2FA deadline enforcement check:`, error?.message || error);
    await logSecurityEvent('2fa_enforcement_check_failed', 'system', 'high', `Deadline check failed: ${error?.message}`);
    return { checked: 0, deactivated: deactivatedCount };
  }
}

/**
 * Scheduled job: Check which admins are due for reminders and send them
 * Runs multiple times per day to send day-0, day-1, day-3, day-7 reminders
 */
export async function scheduleAndSendPendingReminders(): Promise<{ checked: number; remindersSent: number }> {
  let sentCount = 0;
  try {
    console.log(`🔔 Checking for pending 2FA reminders to send...`);

    const adminsWithoutTwoFA = await Admin.find({
      twoFactorEnabled: { $ne: true },
      role: { $ne: 'super_admin' },
      isActive: true
    }).select('+twoFactorDeadline +twoFactorRemindersSent +lastReminderSentAt +createdAt');

    const now = new Date();

    for (const admin of adminsWithoutTwoFA) {
      try {
        // Ensure deadline is set (7 days from now if missing)
        if (!admin.twoFactorDeadline) {
          admin.twoFactorDeadline = dayjs().add(TWO_FA_ENFORCEMENT_DAYS, 'day').toDate();
          await admin.save();
        }

        const daysRemaining = calculateDaysRemaining(admin.twoFactorDeadline);
        
        // Determine which reminder should be sent based on days remaining
        let reminderToSend: number | null = null;

        if (daysRemaining >= 6 && (admin.twoFactorRemindersSent || 0) < 1) {
          reminderToSend = 1; // Immediate / Welcome reminder
        } else if (daysRemaining <= 5 && daysRemaining > 3 && (admin.twoFactorRemindersSent || 0) < 2) {
          reminderToSend = 2; // Day 1
        } else if (daysRemaining <= 3 && daysRemaining > 1 && (admin.twoFactorRemindersSent || 0) < 3) {
          reminderToSend = 3; // Day 3
        } else if (daysRemaining <= 1 && (admin.twoFactorRemindersSent || 0) < 4) {
          reminderToSend = 4; // Day 7 (Final reminder before deactivation)
        }

        if (reminderToSend !== null) {
          await sendTwoFactorReminder(admin.email, reminderToSend);
          sentCount++;
        }
      } catch (err: any) {
        console.error(`🔴 Error processing reminders for ${admin.email}:`, err?.message || err);
      }
    }

    return { checked: adminsWithoutTwoFA.length, remindersSent: sentCount };
  } catch (error: any) {
    console.error(`🔴 Error in pending reminder scheduling:`, error?.message || error);
    return { checked: 0, remindersSent: sentCount };
  }
}

/**
 * Stop all pending 2FA reminders for an admin (called when they enable 2FA)
 */
export async function stopTwoFactorReminders(adminEmail: string): Promise<void> {
  try {
    const admin = await Admin.findOne({ email: adminEmail.toLowerCase() })
      .select('+twoFactorRemindersSent +twoFactorDeadline');

    if (!admin) {
      console.error(`🔴 Admin not found for stopping reminders: ${adminEmail}`);
      return;
    }

    // Clear all reminder tracking
    admin.twoFactorRemindersSent = 0;
    admin.twoFactorDeadline = undefined;
    admin.twoFactorDeactivationReason = undefined;
    await admin.save();

    console.log(`✓ 2FA reminders stopped for ${adminEmail} - 2FA successfully enabled`);
    await logSecurityEvent('2fa_reminders_stopped', adminEmail, 'low', '2FA enabled, reminders stopped');
  } catch (error: any) {
    console.error(`🔴 Error stopping reminders for ${adminEmail}:`, error?.message || error);
  }
}

/**
 * Calculate days remaining until 2FA deadline
 */
function calculateDaysRemaining(deadline: Date): number {
  const now = new Date();
  const timeDiff = deadline.getTime() - now.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return Math.max(daysRemaining, 0);
}

/**
 * Log security events for audit trail
 */
async function logSecurityEvent(eventType: string, adminEmail: string | 'system', severity: 'low' | 'medium' | 'high' | 'critical', details: string): Promise<void> {
  try {
    await SecurityLog.create({
      portal: 'admin',
      eventType,
      severity,
      details,
      ip: 'internal_system',
      userAgent: '2FA_Enforcement_Service',
      path: '/api/v1/admin/2fa/enforcement'
    });
  } catch (err) {
    console.error(`⚠️ Failed to log security event ${eventType}:`, err);
  }
}

export default {
  initiateTwoFactorReminders,
  sendTwoFactorReminder,
  checkAndEnforceTwoFactorDeadlines,
  scheduleAndSendPendingReminders,
  stopTwoFactorReminders
};
