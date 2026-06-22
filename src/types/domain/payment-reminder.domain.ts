/**
 * DOMAIN LAYER - Payment Reminder Business Logic Types
 *
 * Rules:
 * - These types represent business entities, NOT database structure
 * - Include computed/derived fields
 * - NO Prisma types allowed here
 * - These types are stable even if DB schema changes
 */

import type { DebtorDomain } from "./debtor.domain";

/**
 * Payment reminder status
 */
export type PaymentReminderStatus = "PENDING" | "NOTIFIED" | "COMPLETED" | "CANCELLED";

/**
 * Domain model for Payment Reminder
 */
export type PaymentReminderDomain = {
  // Core identity
  id: number;

  // Relations
  debtorId: number;
  createdBy: number;

  // Reminder details
  reminderAt: Date;
  note: string | null;
  status: PaymentReminderStatus;
  notifiedAt: Date | null;

  // Metadata
  createdAt: Date;
  updatedAt: Date;

  // Optional relations (only when needed)
  debtor?: DebtorDomain;
  creator?: {
    id: number;
    username: string;
    firstName: string | null;
    lastName: string | null;
  };
};

/**
 * Input type for creating a new payment reminder
 */
export type CreatePaymentReminderInput = {
  debtorId: number;
  createdBy: number;
  reminderAt: Date;
  note?: string | null;
};

/**
 * Input type for updating a payment reminder
 */
export type UpdatePaymentReminderInput = {
  reminderAt?: Date;
  note?: string | null;
  status?: PaymentReminderStatus;
};

/**
 * Query filters for payment reminder operations
 */
export type PaymentReminderFilters = {
  debtorId?: number;
  createdBy?: number;
  status?: PaymentReminderStatus;
  reminderAtFrom?: Date;
  reminderAtTo?: Date;
};

/**
 * Computed fields for payment reminder
 */
export type PaymentReminderComputedFields = {
  isOverdue: boolean;
  timeUntilReminder: number; // milliseconds
  isPastDue: boolean;
};
