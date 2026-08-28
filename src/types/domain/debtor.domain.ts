/**
 * DOMAIN LAYER - Business Logic Types
 *
 * Rules:
 * - These types represent business entities, NOT database structure
 * - Use number (not Decimal) for all monetary values
 * - Include computed/derived fields (risk status, days overdue, etc.)
 * - NO Prisma types allowed here
 * - These types are stable even if DB schema changes
 */

import type { PaymentDomain } from "./payment.domain";
import type { DebtDomain } from "./debt.domain";

/**
 * Risk classification for debtors based on business rules
 */
export type DebtorRiskStatus = "low" | "medium" | "high" | "critical";

/**
 * Debtor status based on payment behavior
 */
export type DebtorStatus = "active" | "overdue" | "paid_off" | "inactive";

/**
 * Domain model for Debtor
 *
 * This is the business representation, not the database representation.
 * It includes:
 * - Computed fields (risk status, days overdue)
 * - Business logic fields (status, risk level)
 * - Normalized data types (number instead of Decimal)
 */
export type DebtorDomain = {
  // Core identity
  id: number;
  externalId: string;
  clientId: number;

  // Personal information
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  address: string | null;

  // Financial data (normalized to number)
  totalDebt: number;
  isOverdue: boolean;
  lastPaymentDate: Date | null;

  // Computed business fields
  riskStatus: DebtorRiskStatus;
  status: DebtorStatus;
  daysOverdue: number | null;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: number;

  // Relations (optional, only when needed)
  debts?: DebtDomain[];
  payments?: PaymentDomain[];
  creator?: {
    id: number;
    username: string;
    firstName: string | null;
    lastName: string | null;
  };
};

/**
 * Stats for debtors
 */
export type DebtorStats = {
  totalDebtors: number;
  totalDebt: number;
  totalDebtsCount: number;
  todayDebtsCount: number;
  todayDebtsAmount: number;
  todayPaymentsCount: number;
  todayPaymentsAmount: number;
};

/**
 * Input type for creating a new debtor
 */
export type CreateDebtorDomainInput = {
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  address?: string | null;
  createdBy: number;
};

/**
 * Input type for updating a debtor
 */
export type UpdateDebtorDomainInput = {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | null;
  address?: string | null;
};

/**
 * Query filters for debtor domain operations
 */
export type DebtorDomainFilters = {
  search?: string;
  status?: DebtorStatus;
  riskStatus?: DebtorRiskStatus;
  isOverdue?: boolean;
  minDebt?: number;
  maxDebt?: number;
  createdBy?: number;
};

/**
 * Pagination options
 */
export type PaginationOptions = {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

/**
 * Paginated result
 */
export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
