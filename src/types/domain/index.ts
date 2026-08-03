/**
 * Domain types - Business logic layer
 *
 * Export all domain types from a single entry point
 */

export type {
  DebtorDomain,
  CreateDebtorDomainInput,
  UpdateDebtorDomainInput,
  DebtorDomainFilters,
  DebtorRiskStatus,
  DebtorStatus,
  PaginationOptions,
  PaginatedResult,
} from "./debtor.domain";

export type { DebtDomain, CreateDebtDomainInput, UpdateDebtDomainInput, DebtItem } from "./debt.domain";

export {
  PaymentTypeDomain,
  type PaymentDomain,
  type CreatePaymentDomainInput,
  type UpdatePaymentDomainInput,
} from "./payment.domain";

export type {
  PaymentReminderDomain,
  PaymentReminderStatus,
  CreatePaymentReminderInput,
  UpdatePaymentReminderInput,
  PaymentReminderFilters,
  PaymentReminderComputedFields,
} from "./payment-reminder.domain";

export type {
  CompanyDomain,
  CompanyStats,
  CompanyStatus,
  CompanyFilterStatus,
  CompanySortBy,
  CreateCompanyDomainInput,
  UpdateCompanyDomainInput,
  CompanyDomainFilters,
  CompanyPaginationOptions,
} from "./company.domain";

export type {
  CompanyDebtDomain,
  CreateCompanyDebtDomainInput,
  UpdateCompanyDebtDomainInput,
} from "./company-debt.domain";

export type {
  CompanyPaymentDomain,
  CreateCompanyPaymentDomainInput,
  UpdateCompanyPaymentDomainInput,
} from "./company-payment.domain";

export type {
  CompanyDailySnapshotDomain,
  CompanyDayDebtActivity,
  CompanyDayPaymentActivity,
  CompanyDayActivityDomain,
  UpsertCompanyDailySnapshotInput,
} from "./company-daily-snapshot.domain";
