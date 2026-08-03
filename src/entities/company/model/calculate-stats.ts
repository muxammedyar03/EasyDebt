import type { CompanyStats } from "@/types/domain/company.domain";

export type CompanyStatsInput = {
  totalCompanies: number;
  totalDebt: number;
  totalDebtsCount: number;
  totalPaymentsAmount: number;
  todayDebtsCount: number;
  todayDebtsAmount: number;
  todayPaymentsCount: number;
  todayPaymentsAmount: number;
};

export function buildCompanyStats(raw: CompanyStatsInput): CompanyStats {
  return {
    totalCompanies: raw.totalCompanies,
    totalDebt: raw.totalDebt,
    totalDebtsCount: raw.totalDebtsCount,
    totalPaymentsAmount: raw.totalPaymentsAmount,
    todayDebtsCount: raw.todayDebtsCount,
    todayDebtsAmount: raw.todayDebtsAmount,
    todayPaymentsCount: raw.todayPaymentsCount,
    todayPaymentsAmount: raw.todayPaymentsAmount,
  };
}
