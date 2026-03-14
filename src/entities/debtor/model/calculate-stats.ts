import type { DebtorStats } from "@/types/domain/debtor.domain";

/**
 * Debtor entity – model: build stats from raw counts/sums.
 * Service fetches data via repositories, then uses this to build DebtorStats.
 */
export type DebtorStatsInput = {
  totalDebtors: number;
  totalDebt: number;
  totalDebtsCount: number;
  todayDebtsCount: number;
  todayDebtsAmount: number;
  todayPaymentsCount: number;
  todayPaymentsAmount: number;
};

export function buildDebtorStats(raw: DebtorStatsInput): DebtorStats {
  return {
    totalDebtors: raw.totalDebtors,
    totalDebt: raw.totalDebt,
    totalDebtsCount: raw.totalDebtsCount,
    todayDebtsCount: raw.todayDebtsCount,
    todayDebtsAmount: raw.todayDebtsAmount,
    todayPaymentsCount: raw.todayPaymentsCount,
    todayPaymentsAmount: raw.todayPaymentsAmount,
  };
}
