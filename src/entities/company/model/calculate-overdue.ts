/**
 * Company overdue: simplified vs debtor rating logic.
 * Overdue when remaining debt > 0 and days since last payment
 * (or last debt if never paid) exceed overdueDays.
 */

export type CompanyOverdueInput = {
  totalDebt: number;
  lastPaymentDate: Date | null;
  lastDebtDate: Date | null;
  createdAt: Date;
  overdueDays: number;
};

export type CompanyOverdueResult = {
  isOverdue: boolean;
  daysOverdue: number | null;
};

export function calculateCompanyOverdueStatus(input: CompanyOverdueInput): CompanyOverdueResult {
  if (input.totalDebt <= 0) {
    return { isOverdue: false, daysOverdue: null };
  }

  const referenceDate = input.lastPaymentDate ?? input.lastDebtDate ?? input.createdAt;
  const daysSince = Math.floor((Date.now() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSince > input.overdueDays) {
    return { isOverdue: true, daysOverdue: daysSince };
  }

  return { isOverdue: false, daysOverdue: null };
}
