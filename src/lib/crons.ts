/**
 * CRONS - Centralized Cron Job Management
 *
 * All cron job logic is managed from this single file.
 * Each cron function follows the same pattern:
 * - Returns a Promise<number> (count of items processed)
 * - Handles its own errors gracefully
 * - Logs its activity
 *
 * Cron jobs can be triggered via:
 * 1. API routes at /api/cron/* (for external cron services)
 * 2. Linux system crontab (curl to API routes)
 * 3. In-app node-cron scheduler (see startCronScheduler below)
 */

import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { paymentReminderService } from "@/lib/services/payment-reminder.service";
import { format } from "date-fns";
import { uz } from "date-fns/locale";

// Re-export existing cron functions for backward compatibility
export { checkOverdueDebtors, reEvaluateOverdueDebtors } from "./overdue-checker";
export { checkHostingReminder } from "./hosting-reminder";

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
    console.log("[cron/payment-reminders] Starting check...");

    // Find all pending reminders that are due
    const dueReminders = await paymentReminderService.findDueReminders();

    if (dueReminders.length === 0) {
      console.log("[cron/payment-reminders] No due reminders found");
      return 0;
    }

    console.log(`[cron/payment-reminders] Found ${dueReminders.length} due reminders`);

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
        const reminderTimeFormatted = format(reminder.reminderAt, "d-MMMM yyyy, HH:mm", {
          locale: uz,
        });

        // Create notification
        await createNotification({
          userId: reminder.createdBy,
          debtorId: reminder.debtorId,
          type: "PAYMENT_REMINDER",
          title: "To'lov eslatmasi",
          message: reminder.note
            ? `${debtorFullName} - ${reminder.note} (${reminderTimeFormatted})`
            : `${debtorFullName} uchun to'lov eslatmasi (${reminderTimeFormatted})`,
        });

        // Mark reminder as notified
        await paymentReminderService.markAsNotified(reminder.id);

        processedCount++;
        console.log(`[cron/payment-reminders] Processed reminder ${reminder.id} for debtor ${reminder.debtorId}`);
      } catch (error) {
        console.error(`[cron/payment-reminders] Failed to process reminder ${reminder.id}:`, error);
      }
    }

    console.log(`[cron/payment-reminders] Completed. Processed ${processedCount} reminders`);
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

  return await prisma.paymentReminder.findMany({
    where: {
      status: "PENDING",
      reminder_at: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      debtor: true,
      creator: true,
    },
    orderBy: {
      reminder_at: "asc",
    },
  });
}

/**
 * Get statistics for reminders
 */
export async function getReminderStats() {
  const [pending, notified, completed, cancelled] = await Promise.all([
    prisma.paymentReminder.count({ where: { status: "PENDING" } }),
    prisma.paymentReminder.count({ where: { status: "NOTIFIED" } }),
    prisma.paymentReminder.count({ where: { status: "COMPLETED" } }),
    prisma.paymentReminder.count({ where: { status: "CANCELLED" } }),
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

    const result = await prisma.paymentReminder.deleteMany({
      where: {
        status: {
          in: ["COMPLETED", "CANCELLED"],
        },
        updated_at: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`[cron/cleanup] Deleted ${result.count} old reminders`);
    return result.count;
  } catch (error) {
    console.error("[cron/cleanup] Error:", error);
    return 0;
  }
}

/**
 * Start in-app cron scheduler for VPS deployments
 *
 * Call this function once when the app starts (e.g., in instrumentation.ts)
 *
 * @example
 * // In src/instrumentation.ts:
 * export async function register() {
 *   if (process.env.NODE_ENV === 'production') {
 *     const { startCronScheduler } = await import('./lib/crons');
 *     startCronScheduler();
 *   }
 * }
 */
let cronStarted = false;

export function startCronScheduler() {
  if (cronStarted) {
    console.log("[cron] Scheduler already running");
    return;
  }

  // Only run on server side
  if (typeof window !== "undefined") {
    return;
  }

  cronStarted = true;
  console.log("[cron] Starting in-app cron scheduler...");

  // Payment reminders - every 5 minutes
  setInterval(
    async () => {
      try {
        const count = await checkPaymentReminders();
        if (count > 0) {
          console.log(`[cron] Payment reminders processed: ${count}`);
        }
      } catch (error) {
        console.error("[cron] Payment reminders error:", error);
      }
    },
    30 * 60 * 1000, // 30 minutes
  );

  // Overdue check - every hour (will only notify once per debtor)
  setInterval(
    async () => {
      try {
        const { checkOverdueDebtors } = await import("./overdue-checker");
        const count = await checkOverdueDebtors();
        if (count > 0) {
          console.log(`[cron] Overdue debtors processed: ${count}`);
        }
      } catch (error) {
        console.error("[cron] Overdue check error:", error);
      }
    },
    30 * 60 * 1000, // 30 minutes
  );

  // Hosting reminder - every hour (will only create once per month)
  setInterval(
    async () => {
      try {
        const { checkHostingReminder } = await import("./hosting-reminder");
        const count = await checkHostingReminder();
        if (count > 0) {
          console.log(`[cron] Hosting reminder created`);
        }
      } catch (error) {
        console.error("[cron] Hosting reminder error:", error);
      }
    },
    60 * 60 * 1000,
  ); // 1 hour

  console.log("[cron] Scheduler started successfully");
  console.log("[cron] - Payment reminders: every 5 minutes");
  console.log("[cron] - Overdue check: every 1 hour");
  console.log("[cron] - Hosting reminder: every 1 hour");
}

// ============================================================
// Cron Schedule Reference (for Linux crontab or external services)
// ============================================================
//
// Linux crontab example (run: crontab -e):
//   */5 * * * * curl -s http://localhost:3000/api/cron/payment-reminders
//   0 0 * * * curl -s http://localhost:3000/api/cron/check-overdue
//   0 0 * * * curl -s http://localhost:3000/api/cron/hosting-reminder
//
// Vercel cron.json example:
//   { "crons": [
//     { "path": "/api/cron/payment-reminders", "schedule": "*/5 * * * *" },
//     { "path": "/api/cron/check-overdue", "schedule": "0 0 * * *" },
//     { "path": "/api/cron/hosting-reminder", "schedule": "0 0 * * *" }
//   ]}
