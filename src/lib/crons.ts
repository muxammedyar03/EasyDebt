/**
 * CRONS - Centralized Cron Job Management
 *
 * All cron job logic is managed from this single file.
 * Each cron function follows the same pattern:
 * - Returns a Promise<number> (count of items processed)
 * - Handles its own errors gracefully
 * - Logs its activity
 *
 * Cron jobs are triggered via Linux system crontab calling API routes:
 * - /api/cron/payment-reminders - Every 5 minutes
 * - /api/cron/check-overdue - Every hour
 * - /api/cron/hosting-reminder - Every hour
 *
 * Example crontab entries (with authentication):
 *   *\/5 * * * * curl -s "https://yoursite.com/api/cron/payment-reminders?key=YOUR_CRON_SECRET" > /dev/null
 *   0 * * * * curl -s "https://yoursite.com/api/cron/check-overdue?key=YOUR_CRON_SECRET" > /dev/null
 *   0 * * * * curl -s "https://yoursite.com/api/cron/hosting-reminder?key=YOUR_CRON_SECRET" > /dev/null
 */

import { paymentReminderRepository } from "@/entities/payment-reminder/api";
import { createNotification } from "@/lib/notifications";
import { paymentReminderService } from "@/lib/services/payment-reminder.service";
import { uz } from "date-fns/locale";
import { format } from "date-fns";

// Re-export existing cron functions for backward compatibility
export { checkOverdueDebtors, reEvaluateOverdueDebtors } from "./overdue-checker";
export { checkHostingReminder } from "./hosting-reminder";

/**
 * Convert UTC date to Uzbekistan local time (UTC+5)
 * The date from database is in UTC, we need to add 5 hours to get local time
 */
function toLocalTime(date: Date): Date {
  // Create a new date object to avoid mutating the original
  const localDate = new Date(date);
  // Add 5 hours (Uzbekistan is UTC+5)
  localDate.setHours(localDate.getHours() + 5);
  return localDate;
}

/**
 * Payment Reminders Cron Job
 *
 * Checks for due payment reminders and creates notifications.
 * Called every minute or at desired interval.
 *
 * @returns Number of reminders processed
 */
export async function checkPaymentReminders(): Promise<number> {
  try {
    const dueReminders = await paymentReminderService.findDueReminders();

    if (dueReminders.length === 0) {
      return 0;
    }

    let processedCount = 0;

    for (const reminder of dueReminders) {
      try {
        // Get debtor info for notification
        const debtor = reminder.debtor;
        if (!debtor) {
          console.warn(`[cron/payment-reminders] No debtor found for reminder ${reminder.id}`);
          continue;
        }

        const debtorFullName = `${debtor.firstName} ${debtor.lastName}`;
        const localReminderTime = toLocalTime(reminder.reminderAt);
        const reminderTimeISO = format(localReminderTime, "d-MMMM yyyy, HH:mm", { locale: uz });

        // Create notification
        await createNotification({
          userId: reminder.createdBy,
          debtorId: reminder.debtorId,
          type: "PAYMENT_REMINDER",
          title: "To'lov eslatmasi",
          message: reminder.note
            ? `${debtorFullName} - ${reminder.note} (${reminderTimeISO})`
            : `${debtorFullName} uchun to'lov eslatmasi (${reminderTimeISO})`,
        });

        // Mark reminder as notified
        await paymentReminderService.markAsNotified(reminder.id);

        processedCount++;
      } catch (error) {
        console.error(`[cron/payment-reminders] Failed to process reminder ${reminder.id}:`, error);
      }
    }

    return processedCount;
  } catch (error) {
    console.error("[cron/payment-reminders] Error:", error);
    return 0;
  }
}

/**
 * Get upcoming reminders for today
 * Useful for dashboard widgets
 */
export async function getTodayReminders() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  return paymentReminderRepository.findMany(
    {
      status: "PENDING",
      reminder_at: { gte: startOfDay, lte: endOfDay },
    },
    { orderBy: { reminder_at: "asc" } },
  );
}

/**
 * Get statistics for reminders
 */
export async function getReminderStats() {
  const [pending, notified, completed, cancelled] = await Promise.all([
    paymentReminderRepository.count({ status: "PENDING" }),
    paymentReminderRepository.count({ status: "NOTIFIED" }),
    paymentReminderRepository.count({ status: "COMPLETED" }),
    paymentReminderRepository.count({ status: "CANCELLED" }),
  ]);

  return {
    pending,
    notified,
    completed,
    cancelled,
    total: pending + notified + completed + cancelled,
  };
}

/**
 * Cleanup old completed/cancelled reminders
 * Can be called periodically to clean up database
 *
 * @param daysOld - Delete reminders older than this many days (default: 90)
 * @returns Number of reminders deleted
 */
export async function cleanupOldReminders(daysOld = 90): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await paymentReminderRepository.deleteMany({
      status: { in: ["COMPLETED", "CANCELLED"] },
      updated_at: { lt: cutoffDate },
    });

    return result.count;
  } catch (error) {
    console.error("[cron/cleanup] Error:", error);
    return 0;
  }
}

// ============================================================
// DEVELOPMENT MODE (localhost)
// ============================================================
//
// Localhost'da cron job'lar AVTOMATIK ISHLAMAYDI.
// Test qilish uchun API endpoint'larni manual chaqiring:
//
// Payment reminders:
//   curl http://localhost:3000/api/cron/payment-reminders
//
// Check overdue:
//   curl http://localhost:3000/api/cron/check-overdue
//
// Hosting reminder:
//   curl http://localhost:3000/api/cron/hosting-reminder
//
// Eslatma: Development mode'da CRON_SECRET talab qilinmaydi.
//
// ============================================================
// PRODUCTION MODE (Linux Crontab Setup)
// ============================================================
//
// 1. .env faylga CRON_SECRET qo'shing:
//    CRON_SECRET=your-super-secret-key-here
//
// 2. SSH orqali serverga kiring va `crontab -e` buyrug'ini ishga tushiring
//
// 3. Quyidagi qatorlarni qo'shing (CRON_SECRET ni almashtiring):
//
// # Payment reminders - har 5 daqiqada
// */5 * * * * curl -sH "Authorization: Bearer YOUR_CRON_SECRET" https://easydebt.uz/api/cron/payment-reminders > /dev/null 2>&1
//
// # Overdue check - har kuni soat 00:00 da
// 0 0 * * * curl -sH "Authorization: Bearer YOUR_CRON_SECRET" https://easydebt.uz/api/cron/check-overdue > /dev/null 2>&1
//
// # Hosting reminder - har kuni soat 09:00 da
// 0 9 * * * curl -sH "Authorization: Bearer YOUR_CRON_SECRET" https://easydebt.uz/api/cron/hosting-reminder > /dev/null 2>&1
//
// 4. Saqlang va chiqing (Ctrl+X, Y, Enter)
//
// Yoki query param bilan:
// curl -s "https://easydebt.uz/api/cron/payment-reminders?key=YOUR_CRON_SECRET"
//
// Crontab tekshirish: crontab -l
// ============================================================
