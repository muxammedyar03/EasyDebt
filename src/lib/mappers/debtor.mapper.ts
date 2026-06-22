/**
 * MAPPER LAYER - Prisma → Domain → View
 *
 * Rules:
 * - Prisma types ONLY in this file (and service layer)
 * - All conversions happen here
 * - No business logic, only data transformation
 * - Type-safe conversions with explicit handling
 */

import type { Debtor, Debt, Payment, User } from "@prisma/client";
import type { DebtorDomain, DebtorRiskStatus, DebtorStatus } from "@/types/domain/debtor.domain";
import type { DebtDomain } from "@/types/domain/debt.domain";
import type { PaymentDomain } from "@/types/domain/payment.domain";
import type { DebtorView, DebtorTableView, DebtorDetailView } from "@/types/view/debtor.view";

// ============================================================================
// PRISMA → DOMAIN
// ============================================================================

/**
 * Convert Prisma Debtor to Domain Debtor
 *
 * This is the ONLY place where Prisma types are converted to domain types.
 * Handles:
 * - Decimal → number conversion
 * - Computing business fields (risk status, days overdue)
 * - Normalizing data types
 */
export function prismaToDomainDebtor(
  prismaDebtor: Debtor & {
    debts?: Debt[];
    payments?: Payment[];
    creator?: User;
  },
  options?: {
    debtLimit?: number;
    overdueDays?: number;
  },
): DebtorDomain {
  const debtLimit = options?.debtLimit ?? 2000000;
  const overdueDays = options?.overdueDays ?? 45;

  // Convert Decimal to number
  const totalDebt = prismaDebtor.total_debt.toNumber();

  // Compute days overdue
  const daysOverdue = prismaDebtor.last_payment_date
    ? Math.floor((Date.now() - prismaDebtor.last_payment_date.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Compute risk status based on business rules
  const riskStatus = computeRiskStatus(totalDebt, prismaDebtor.is_overdue, debtLimit);

  // Compute status
  const status = computeDebtorStatus(totalDebt, prismaDebtor.is_overdue);

  return {
    id: prismaDebtor.id,
    externalId: prismaDebtor.external_id,
    firstName: prismaDebtor.first_name,
    lastName: prismaDebtor.last_name,
    phoneNumber: prismaDebtor.phone_number,
    address: prismaDebtor.address,
    totalDebt,
    isOverdue: prismaDebtor.is_overdue,
    lastPaymentDate: prismaDebtor.last_payment_date,
    riskStatus,
    status,
    daysOverdue: daysOverdue && daysOverdue > overdueDays ? daysOverdue : null,
    createdAt: prismaDebtor.created_at,
    updatedAt: prismaDebtor.updated_at,
    createdBy: prismaDebtor.created_by,
    // Map relations if present
    debts: prismaDebtor.debts?.map(prismaToDomainDebt),
    payments: prismaDebtor.payments?.map(prismaToDomainPayment),
    creator: prismaDebtor.creator
      ? {
          id: prismaDebtor.creator.id,
          username: prismaDebtor.creator.username,
          firstName: prismaDebtor.creator.first_name,
          lastName: prismaDebtor.creator.last_name,
        }
      : undefined,
  };
}

/**
 * Convert Prisma Debt to Domain Debt
 */
export function prismaToDomainDebt(prismaDebt: Debt): DebtDomain {
  return {
    id: prismaDebt.id,
    externalId: prismaDebt.external_id,
    debtorId: prismaDebt.debtor_id,
    amount: prismaDebt.amount.toNumber(),
    description: prismaDebt.description,
    items: prismaDebt.items as DebtDomain["items"],
    createdAt: prismaDebt.created_at,
    createdBy: prismaDebt.created_by,
  };
}

/**
 * Convert Prisma Payment to Domain Payment
 */
export function prismaToDomainPayment(prismaPayment: Payment): PaymentDomain {
  return {
    id: prismaPayment.id,
    externalId: prismaPayment.external_id,
    debtorId: prismaPayment.debtor_id,
    amount: prismaPayment.amount.toNumber(),
    paymentType: prismaPayment.payment_type as PaymentDomain["paymentType"],
    note: prismaPayment.note,
    createdAt: prismaPayment.created_at,
    createdBy: prismaPayment.created_by,
  };
}

// ============================================================================
// DOMAIN → VIEW
// ============================================================================

/**
 * Convert Domain Debtor to View Debtor
 *
 * This handles all UI formatting concerns:
 * - Currency formatting
 * - Date formatting
 * - Badge generation
 * - Display name generation
 */
export function domainToViewDebtor(
  domainDebtor: DebtorDomain,
  options?: {
    currency?: string;
    locale?: string;
    includeRelations?: boolean;
  },
): DebtorView {
  const currency = options?.currency ?? "UZS";
  const locale = options?.locale ?? "uz-UZ";

  const fullName = `${domainDebtor.firstName} ${domainDebtor.lastName}`;
  const displayName = `${domainDebtor.firstName} ${domainDebtor.lastName.charAt(0)}.`;

  // Format phone number
  const phoneDisplay = domainDebtor.phoneNumber ? formatPhoneNumber(domainDebtor.phoneNumber) : null;

  // Format currency
  const totalDebtFormatted = formatCurrency(domainDebtor.totalDebt, currency, locale);

  // Format dates
  const lastPaymentDateFormatted = domainDebtor.lastPaymentDate
    ? formatRelativeDate(domainDebtor.lastPaymentDate)
    : null;

  const createdAtFormatted = formatDate(domainDebtor.createdAt, locale);
  const updatedAtFormatted = formatDate(domainDebtor.updatedAt, locale);

  // Format days overdue
  const daysOverdueDisplay = domainDebtor.daysOverdue ? `${domainDebtor.daysOverdue} days` : null;

  // Generate badges
  const riskStatusBadge = getRiskStatusBadge(domainDebtor.riskStatus);
  const statusBadge = getStatusBadge(domainDebtor.status);

  // Compute summary if relations present
  const debtsCount = domainDebtor.debts?.length;
  const paymentsCount = domainDebtor.payments?.length;
  const totalPaid = domainDebtor.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const totalPaidFormatted = formatCurrency(totalPaid, currency, locale);

  return {
    id: domainDebtor.id,
    externalId: domainDebtor.externalId,
    fullName,
    firstName: domainDebtor.firstName,
    lastName: domainDebtor.lastName,
    displayName,
    phoneNumber: domainDebtor.phoneNumber,
    phoneDisplay,
    address: domainDebtor.address,
    totalDebt: domainDebtor.totalDebt,
    totalDebtFormatted,
    isOverdue: domainDebtor.isOverdue,
    lastPaymentDate: domainDebtor.lastPaymentDate,
    lastPaymentDateFormatted,
    riskStatus: domainDebtor.riskStatus,
    riskStatusBadge,
    status: domainDebtor.status,
    statusBadge,
    daysOverdue: domainDebtor.daysOverdue,
    daysOverdueDisplay,
    isHighRisk: domainDebtor.riskStatus === "high" || domainDebtor.riskStatus === "critical",
    canEdit: true, // TODO: Add permission logic
    canDelete: true, // TODO: Add permission logic
    createdAt: domainDebtor.createdAt,
    createdAtFormatted,
    updatedAt: domainDebtor.updatedAt,
    updatedAtFormatted,
    debtsCount,
    paymentsCount,
    totalPaid,
    totalPaidFormatted,
  };
}

/**
 * Convert Domain Debtor to Table View (minimal fields)
 */
export function domainToTableViewDebtor(domainDebtor: DebtorDomain): DebtorTableView {
  const view = domainToViewDebtor(domainDebtor);
  return {
    id: view.id,
    externalId: view.externalId,
    fullName: view.fullName,
    phoneDisplay: view.phoneDisplay,
    totalDebtFormatted: view.totalDebtFormatted,
    riskStatusBadge: view.riskStatusBadge,
    statusBadge: view.statusBadge,
    daysOverdueDisplay: view.daysOverdueDisplay,
    lastPaymentDateFormatted: view.lastPaymentDateFormatted,
  };
}

/**
 * Convert Domain Debtor to Detail View (with relations)
 */
export function domainToDetailViewDebtor(domainDebtor: DebtorDomain): DebtorDetailView {
  const view = domainToViewDebtor(domainDebtor, { includeRelations: true });

  return {
    ...view,
    debts: (domainDebtor.debts ?? []).map((debt) => ({
      id: debt.id,
      amount: debt.amount,
      amountFormatted: formatCurrency(debt.amount, "UZS", "uz-UZ"),
      description: debt.description,
      createdAt: debt.createdAt,
      createdAtFormatted: formatDate(debt.createdAt, "uz-UZ"),
    })),
    payments: (domainDebtor.payments ?? []).map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      amountFormatted: formatCurrency(payment.amount, "UZS", "uz-UZ"),
      paymentType: payment.paymentType,
      createdAt: payment.createdAt,
      createdAtFormatted: formatDate(payment.createdAt, "uz-UZ"),
    })),
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function computeRiskStatus(totalDebt: number, isOverdue: boolean, debtLimit: number): DebtorRiskStatus {
  if (totalDebt <= 0) return "low";
  // If debt is >= debtLimit, it's high risk (teng bo'lsa ham limitdan oshgan)
  if (isOverdue && totalDebt >= debtLimit) return "critical";
  if (totalDebt >= debtLimit) return "high";
  if (isOverdue) return "medium";
  return "low";
}

function computeDebtorStatus(totalDebt: number, isOverdue: boolean): DebtorStatus {
  if (totalDebt <= 0) return "paid_off";
  if (isOverdue) return "overdue";
  return "active";
}

function formatCurrency(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(date, "uz-UZ");
}

function formatPhoneNumber(phone: string): string {
  // Simple formatting - adjust based on your phone number format
  return phone.replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, "+998 $1 $2 $3 $4");
}

function getRiskStatusBadge(riskStatus: DebtorRiskStatus): DebtorView["riskStatusBadge"] {
  const badges = {
    low: { label: "Low Risk", variant: "default" as const, color: "green" },
    medium: { label: "Medium Risk", variant: "secondary" as const, color: "yellow" },
    high: { label: "High Risk", variant: "outline" as const, color: "orange" },
    critical: { label: "Critical", variant: "destructive" as const, color: "red" },
  };
  return badges[riskStatus];
}

function getStatusBadge(status: DebtorStatus): DebtorView["statusBadge"] {
  const badges = {
    active: { label: "Active", variant: "default" as const },
    overdue: { label: "Overdue", variant: "destructive" as const },
    paid_off: { label: "Paid Off", variant: "secondary" as const },
    inactive: { label: "Inactive", variant: "outline" as const },
  };
  return badges[status];
}

/**
 * Convert raw debtor row (from API/schema) directly to View
 * Used when you have raw database data without going through domain layer
 */
export function rowToViewDebtor(
  row: {
    id: number;
    external_id?: string;
    first_name: string;
    last_name: string;
    phone_number: string | null;
    address: string | null;
    total_debt: number;
    is_overdue: boolean;
    created_at: Date;
    updated_at: Date;
    created_by: number;
  },
  options?: {
    currency?: string;
    locale?: string;
    debtLimit?: number;
  },
): DebtorView {
  const currency = options?.currency ?? "UZS";
  const locale = options?.locale ?? "uz-UZ";
  const debtLimit = options?.debtLimit ?? 2000000;

  const fullName = `${row.first_name} ${row.last_name}`;
  const displayName = `${row.first_name} ${row.last_name.charAt(0)}.`;

  // Format phone number
  const phoneDisplay = row.phone_number ? formatPhoneNumber(row.phone_number) : null;

  // Format currency
  const totalDebtFormatted = formatCurrency(row.total_debt, currency, locale);

  // Compute risk status
  const riskStatus = computeRiskStatus(row.total_debt, row.is_overdue, debtLimit);

  // Compute status
  const status = computeDebtorStatus(row.total_debt, row.is_overdue);

  // Format dates
  const createdAtFormatted = formatDate(row.created_at, locale);
  const updatedAtFormatted = formatDate(row.updated_at, locale);

  // Generate badges
  const riskStatusBadge = getRiskStatusBadge(riskStatus);
  const statusBadge = getStatusBadge(status);

  return {
    id: row.id,
    externalId: row.external_id ?? `DEBTOR-${row.id}`,
    fullName,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName,
    phoneNumber: row.phone_number,
    phoneDisplay,
    address: row.address,
    totalDebt: row.total_debt,
    totalDebtFormatted,
    isOverdue: row.is_overdue,
    lastPaymentDate: null,
    lastPaymentDateFormatted: null,
    riskStatus,
    riskStatusBadge,
    status,
    statusBadge,
    daysOverdue: null,
    daysOverdueDisplay: null,
    isHighRisk: riskStatus === "high" || riskStatus === "critical",
    canEdit: true,
    canDelete: true,
    createdAt: row.created_at,
    createdAtFormatted,
    updatedAt: row.updated_at,
    updatedAtFormatted,
  };
}

/**
 * Convert CustomerRatingDomain to CustomerTableProps
 * Maps domain debtor to view debtor for UI display
 */
export function customerRatingDomainToTableProps(rating: {
  debtorId: number;
  debtor: DebtorDomain;
  payments: PaymentDomain[];
  validPayments: number;
  avgDaysBetweenPayments: number;
  avgDaysBetweenDebtAndPayment: number;
  rating: "high" | "medium" | "critical";
}): {
  debtorId: number;
  debtor: DebtorView;
  payments: PaymentDomain[];
  validPayments: number;
  avgDaysBetweenPayments: number;
  avgDaysBetweenDebtAndPayment: number;
  rating: "high" | "medium" | "critical";
} {
  return {
    debtorId: rating.debtorId,
    debtor: domainToViewDebtor(rating.debtor),
    payments: rating.payments as PaymentDomain[],
    validPayments: rating.validPayments,
    avgDaysBetweenPayments: rating.avgDaysBetweenPayments,
    avgDaysBetweenDebtAndPayment: rating.avgDaysBetweenDebtAndPayment,
    rating: rating.rating,
  };
}
