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
 * Scheduled job: Check for overdue 2FA deadlines and auto-deactivate
 * Runs daily to enforce 2FA compliance
 */
export async function checkAndEnforceTwoFactorDeadlines(): Promise<void> {
  try {
    console.log(`🔔 Running 2FA deadline enforcement check...`);

    // Find admins without 2FA enabled who are past their deadline
    const overdueAdmins = await Admin.find({
      twoFactorEnabled: { $ne: true },
      twoFactorDeadline: { $lt: new Date() },
      isActive: true,
      twoFactorDeactivationReason: { $ne: '2FA_NOT_ENABLED' } // Prevent duplicate deactivations
    }).select('+twoFactorDeadline +twoFactorDeactivationReason');

    if (overdueAdmins.length === 0) {
      console.log(`ℹ️ No overdue 2FA deadlines found`);
      return;
    }

    console.log(`⚠️ Found ${overdueAdmins.length} admin(s) past 2FA deadline`);

    for (const admin of overdueAdmins) {
      try {
        // Deactivate the admin account
        admin.isActive = false;
        admin.twoFactorDeactivationReason = '2FA_NOT_ENABLED';
        await admin.save();

        console.log(`🔒 Auto-deactivated admin ${admin.email} due to 2FA non-compliance`);
        
        await logSecurityEvent(
          '2fa_auto_deactivation',
          admin.email,
          'high',
          `Admin account automatically deactivated due to 2FA enforcement deadline (${admin.twoFactorDeadline})`
        );

        // Send deactivation notification email
        await emailService.sendTwoFactorDeactivationNoticeEmail(admin.email, admin.timezone || 'Asia/Kolkata');

      } catch (err: any) {
        console.error(`🔴 Error deactivating admin ${admin.email}:`, err?.message || err);
        await logSecurityEvent('2fa_deactivation_failed', admin.email, 'high', `Failed to auto-deactivate: ${err?.message}`);
      }
    }

  } catch (error: any) {
    console.error(`🔴 Error in 2FA deadline enforcement check:`, error?.message || error);
    await logSecurityEvent('2fa_enforcement_check_failed', 'system', 'high', `Deadline check failed: ${error?.message}`);
  }
}

/**
 * Scheduled job: Check which admins are due for reminders and send them
 * Runs multiple times per day to send day-1, day-3, day-7 reminders
 */
export async function scheduleAndSendPendingReminders(): Promise<void> {
  try {
    console.log(`🔔 Checking for pending 2FA reminders...`);

    const adminsWithoutTwoFA = await Admin.find({
      twoFactorEnabled: { $ne: true },
      twoFactorDeadline: { $exists: true },
      isActive: true
    }).select('+twoFactorDeadline +twoFactorRemindersSent +lastReminderSentAt');

    for (const admin of adminsWithoutTwoFA) {
      try {
        const daysRemaining = calculateDaysRemaining(admin.twoFactorDeadline!);
        
        // Determine which reminder should be sent based on days remaining
        let reminderToSend: number | null = null;

        if (daysRemaining >= 7 && (admin.twoFactorRemindersSent || 0) < 1) {
          reminderToSend = 1; // Immediate
        } else if (daysRemaining <= 6 && daysRemaining > 3 && (admin.twoFactorRemindersSent || 0) < 2) {
          reminderToSend = 2; // Day 1
        } else if (daysRemaining <= 3 && daysRemaining > 0 && (admin.twoFactorRemindersSent || 0) < 3) {
          reminderToSend = 3; // Day 3
        } else if (daysRemaining <= 0 && (admin.twoFactorRemindersSent || 0) < 4) {
          reminderToSend = 4; // Day 7 (Final) - even if past deadline
        }

        if (reminderToSend !== null) {
          await sendTwoFactorReminder(admin.email, reminderToSend);
        }
      } catch (err: any) {
        console.error(`🔴 Error processing reminders for ${admin.email}:`, err?.message || err);
      }
    }
  } catch (error: any) {
    console.error(`🔴 Error in pending reminder scheduling:`, error?.message || error);
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
