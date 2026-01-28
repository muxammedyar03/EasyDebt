/**
 * VIEW LAYER - UI/Presentation Types
 *
 * Rules:
 * - These types are optimized for UI rendering
 * - Include formatted strings (currency, dates)
 * - Include UI-specific computed fields (display names, badges)
 * - NO Prisma types allowed
 * - NO business logic - only presentation concerns
 * - These types can change frequently based on UI needs
 */

import type { DebtorRiskStatus, DebtorStatus } from "../domain/debtor.domain";

/**
 * View model for Debtor - optimized for UI display
 */
export type DebtorView = {
  // Core fields
  id: number;
  externalId: string;

  // Display names (formatted)
  fullName: string;
  firstName: string;
  lastName: string;
  displayName: string; // e.g., "John D." for compact views

  // Contact (formatted)
  phoneNumber: string | null;
  phoneDisplay: string | null; // Formatted phone number
  address: string | null;

  // Financial (formatted for display)
  totalDebt: number;
  totalDebtFormatted: string; // e.g., "1,234,567.00 UZS"
  isOverdue: boolean;
  lastPaymentDate: Date | null;
  lastPaymentDateFormatted: string | null; // e.g., "2 days ago"

  // Status badges
  riskStatus: DebtorRiskStatus;
  riskStatusBadge: {
    label: string;
    variant: "default" | "destructive" | "secondary" | "outline";
    color: string;
  };
  status: DebtorStatus;
  statusBadge: {
    label: string;
    variant: "default" | "destructive" | "secondary" | "outline";
  };

  // Computed UI fields
  daysOverdue: number | null;
  daysOverdueDisplay: string | null; // e.g., "45 days"
  isHighRisk: boolean;
  canEdit: boolean;
  canDelete: boolean;

  // Metadata
  createdAt: Date;
  createdAtFormatted: string;
  updatedAt: Date;
  updatedAtFormatted: string;

  // Summary counts (for list views)
  debtsCount?: number;
  paymentsCount?: number;
  totalPaid?: number;
  totalPaidFormatted?: string;

  // Payment reminder (for dashboard)
  nextReminder?: {
    id: number;
    reminderAt: Date;
    status: "PENDING" | "NOTIFIED";
    note: string | null;
  } | null;
};

/**
 * Compact view for table rows (minimal fields)
 */
export type DebtorTableView = Pick<
  DebtorView,
  | "id"
  | "fullName"
  | "phoneDisplay"
  | "totalDebtFormatted"
  | "riskStatusBadge"
  | "statusBadge"
  | "daysOverdueDisplay"
  | "lastPaymentDateFormatted"
>;

/**
 * Detailed view for detail pages
 */
export type DebtorDetailView = DebtorView & {
  debts: Array<{
    id: number;
    amount: number;
    amountFormatted: string;
    description: string | null;
    createdAt: Date;
    createdAtFormatted: string;
  }>;
  payments: Array<{
    id: number;
    amount: number;
    amountFormatted: string;
    paymentType: string;
    createdAt: Date;
    createdAtFormatted: string;
  }>;
};

/**
 * View options for formatting
 */
export type DebtorViewOptions = {
  currency?: string;
  locale?: string;
  dateFormat?: "short" | "long" | "relative";
  includeRelations?: boolean;
};
