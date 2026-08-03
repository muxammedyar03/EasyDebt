/**
 * DOMAIN LAYER - Company (supplier) business types
 *
 * Shop owes these companies. Parallel to Debtor, without rating.
 */

import type { CompanyDebtDomain } from "./company-debt.domain";
import type { CompanyPaymentDomain } from "./company-payment.domain";

export type CompanyStatus = "active" | "overdue" | "paid_off" | "inactive";

export type CompanyFilterStatus = "all" | "tolangan" | "qarzdor" | "muddati_otgan" | "limitdan_otgan";

export type CompanySortBy = "name" | "amount" | "debt_added_at" | "paid_at" | "created_at";

export type CompanyDomain = {
  id: number;
  externalId: string;
  name: string;
  contactPerson: string | null;
  phoneNumber: string | null;
  address: string | null;
  totalDebt: number;
  isOverdue: boolean;
  lastPaymentDate: Date | null;
  lastDebtDate: Date | null;
  status: CompanyStatus;
  daysOverdue: number | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number;
  debts?: CompanyDebtDomain[];
  payments?: CompanyPaymentDomain[];
  creator?: {
    id: number;
    username: string;
    firstName: string | null;
    lastName: string | null;
  };
};

export type CompanyStats = {
  totalCompanies: number;
  totalDebt: number;
  totalDebtsCount: number;
  totalPaymentsAmount: number;
  todayDebtsCount: number;
  todayDebtsAmount: number;
  todayPaymentsCount: number;
  todayPaymentsAmount: number;
};

export type CreateCompanyDomainInput = {
  name: string;
  contactPerson?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  createdBy: number;
};

export type UpdateCompanyDomainInput = {
  name?: string;
  contactPerson?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
};

export type CompanyDomainFilters = {
  search?: string;
  status?: CompanyFilterStatus;
  isOverdue?: boolean;
  minDebt?: number;
  maxDebt?: number;
  dateFrom?: Date;
  dateTo?: Date;
  createdBy?: number;
};

export type CompanyPaginationOptions = {
  page: number;
  limit: number;
  sortBy?: CompanySortBy;
  sortOrder?: "asc" | "desc";
};
