/**
 * VIEW LAYER - Payment Reminder UI/Presentation Types
 *
 * Rules:
 * - These types are optimized for UI rendering
 * - Include formatted strings (dates, times)
 * - Include UI-specific computed fields
 * - NO Prisma types allowed
 * - NO business logic - only presentation concerns
 */

import type { PaymentReminderStatus } from "../domain/payment-reminder.domain";

/**
 * View model for Payment Reminder - optimized for UI display
 */
export type PaymentReminderView = {
  // Core fields
  id: number;
  debtorId: number;

  // Debtor info for display
  debtorName: string;
  debtorPhone: string | null;

  // Reminder details
  reminderAt: Date;
  reminderAtFormatted: string; // e.g., "24-yanvar 2026, 14:30"
  reminderTimeFormatted: string; // e.g., "14:30"
  reminderDateFormatted: string; // e.g., "24-yanvar 2026"
  note: string | null;

  // Status
  status: PaymentReminderStatus;
  statusBadge: {
    label: string;
    variant: "default" | "destructive" | "secondary" | "outline" | "success";
    color: string;
  };

  // Computed UI fields
  isOverdue: boolean;
  isPending: boolean;
  timeUntilReminderFormatted: string | null; // e.g., "2 soat qoldi" or "3 kun o'tdi"
  notifiedAt: Date | null;
  notifiedAtFormatted: string | null;

  // Metadata
  createdAt: Date;
  createdAtFormatted: string;
  createdBy: number;
  creatorName: string | null;
};

/**
 * Compact view for list/table display
 */
export type PaymentReminderListView = Pick<
  PaymentReminderView,
  "id" | "debtorId" | "debtorName" | "reminderAtFormatted" | "statusBadge" | "timeUntilReminderFormatted" | "note"
>;

/**
 * Form data for creating/editing reminder
 */
export type PaymentReminderFormData = {
  debtorId: number;
  reminderDate: Date;
  reminderTime: string; // HH:mm format
  note?: string;
};

/**
 * Status badge configuration
 */
export const REMINDER_STATUS_BADGES: Record<PaymentReminderStatus, PaymentReminderView["statusBadge"]> = {
  PENDING: {
    label: "Kutilmoqda",
    variant: "secondary",
    color: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  },
  NOTIFIED: {
    label: "Bildirildi",
    variant: "default",
    color: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  },
  COMPLETED: {
    label: "Bajarildi",
    variant: "success",
    color: "bg-green-500/10 text-green-700 border-green-500/20",
  },
  CANCELLED: {
    label: "Bekor qilindi",
    variant: "outline",
    color: "bg-gray-500/10 text-gray-700 border-gray-500/20",
  },
};
