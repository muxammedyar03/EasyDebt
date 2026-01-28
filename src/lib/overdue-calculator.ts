/**
 * OVERDUE CALCULATION ENGINE
 *
 * Single source of truth for all overdue-related calculations.
 * Computes overdue status dynamically from facts (debts, payments, settings).
 * No database storage of computed values - all calculations are on-demand.
 */

export interface OverdueSettings {
  goodUntilDays: number; // Days until status becomes "medium" (e.g., 30)
  mediumUntilDays: number; // Days until status becomes "bad" (e.g., 45)
  minPaidPercent: number; // Minimum paid percentage to stop overdue counting (e.g., 0.5 for 50%)
}

export interface OverdueStatus {
  status: "good" | "medium" | "bad";
  isOverdue: boolean;
  overdueDays: number;
  paidPercent: number;
  thresholdReachedAt?: Date; // When min_paid_percent was first reached
}

export interface DebtWithPayments {
  amount: number;
  createdAt: Date;
  payments: Array<{
    amount: number;
    createdAt: Date;
  }>;
}

/**
 * Calculate overdue status for a single debt
 *
 * Business Rules:
 * 1. If paid_percent >= min_paid_percent:
 *    - status = "good", is_overdue = false
 *    - overdue_days = days until threshold was reached
 *
 * 2. Else if overdue_days <= good_until_days:
 *    - status = "good", is_overdue = false
 *
 * 3. Else if overdue_days <= medium_until_days:
 *    - status = "medium", is_overdue = false
 *
 * 4. Else:
 *    - status = "bad", is_overdue = true
 */
export function calculateDebtOverdueStatus(debt: DebtWithPayments, settings: OverdueSettings): OverdueStatus {
  const debtCreatedAt = new Date(debt.createdAt);
  const totalPaid = debt.payments.reduce((sum, p) => sum + p.amount, 0);
  const paidPercent = debt.amount > 0 ? totalPaid / debt.amount : 0;

  // Check if minimum paid percentage is reached
  if (paidPercent >= settings.minPaidPercent) {
    // Find when the threshold was first reached
    let thresholdReachedAt = debtCreatedAt;
    let accumulatedPayment = 0;
    const sortedPayments = [...debt.payments].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    for (const payment of sortedPayments) {
      accumulatedPayment += payment.amount;
      if (accumulatedPayment >= debt.amount * settings.minPaidPercent) {
        thresholdReachedAt = new Date(payment.createdAt);
        break;
      }
    }

    const overdueDays = Math.floor((thresholdReachedAt.getTime() - debtCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

    return {
      status: "good",
      isOverdue: false,
      overdueDays,
      paidPercent,
      thresholdReachedAt,
    };
  }

  // Minimum paid percentage not reached - calculate days from debt creation to today
  const now = new Date();
  const overdueDays = Math.floor((now.getTime() - debtCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

  // Determine status based on overdue days
  let status: "good" | "medium" | "bad";
  let isOverdue: boolean;

  if (overdueDays <= settings.goodUntilDays) {
    status = "good";
    isOverdue = false;
  } else if (overdueDays <= settings.mediumUntilDays) {
    status = "medium";
    isOverdue = false;
  } else {
    status = "bad";
    isOverdue = true;
  }

  return {
    status,
    isOverdue,
    overdueDays,
    paidPercent,
  };
}

/**
 * Find the earliest unpaid debt (debt with less than min_paid_percent paid)
 *
 * CRITICAL: Overdue calculation ALWAYS starts from the earliest unpaid debt.
 * New debts do NOT reset the overdue counter.
 */
// function getEarliestUnpaidDebt(debts: DebtWithPayments[], settings: OverdueSettings): DebtWithPayments | null {
//   const unpaidDebts = debts.filter((debt) => {
//     const totalPaid = debt.payments.reduce((sum, p) => sum + p.amount, 0);
//     const paidPercent = debt.amount > 0 ? totalPaid / debt.amount : 0;
//     return paidPercent < settings.minPaidPercent;
//   });

//   if (unpaidDebts.length === 0) return null;

//   // Sort by creation date and return the earliest
//   return unpaidDebts.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
// }

/**
 * Calculate overdue status for a debtor with multiple debts
 *
 * CRITICAL RULE: Overdue ALWAYS starts from the earliest unpaid debt.
 * New debts do NOT reset or affect the overdue counter.
 *
 * Example:
 * - Debt 1: Oct 22, 2025 (unpaid)
 * - Debt 2: Jan 11, 2026 (unpaid)
 * - Start date = Oct 22 (earliest unpaid)
 * - Overdue days = days from Oct 22 to today (NOT from Jan 11)
 */

/**
 * Parse settings from database format (string values) to typed format
 */
export function parseOverdueSettings(settingsRecord: Record<string, string>): OverdueSettings {
  return {
    goodUntilDays: settingsRecord.good_until_days ? parseInt(settingsRecord.good_until_days, 10) : 30,
    mediumUntilDays: settingsRecord.medium_until_days ? parseInt(settingsRecord.medium_until_days, 10) : 45,
    minPaidPercent: settingsRecord.min_paid_percent ? parseFloat(settingsRecord.min_paid_percent) : 0.5,
  };
}

/**
 * Get default overdue settings
 */
export function getDefaultOverdueSettings(): OverdueSettings {
  return {
    goodUntilDays: 30,
    mediumUntilDays: 45,
    minPaidPercent: 0.5,
  };
}

/**
 * Helper function to compute overdue status for a debtor with domain types
 * Used in service layer and mappers
 */
export function computeDebtorOverdueStatus(
  debts: Array<{ amount: number; createdAt: Date }> = [],
  payments: Array<{ amount: number; createdAt: Date }> = [],
  settings: OverdueSettings,
): OverdueStatus {
  if (debts.length === 0) {
    return {
      status: "good",
      isOverdue: false,
      overdueDays: 0,
      paidPercent: 1,
    };
  }

  // Convert to DebtWithPayments format
  const debtsWithPayments: DebtWithPayments[] = debts.map((debt) => ({
    amount: debt.amount,
    createdAt: debt.createdAt,
    payments: payments.filter((p) => new Date(p.createdAt) >= new Date(debt.createdAt)),
  }));

  return calculateDebtorOverdueStatus(debtsWithPayments, settings);
}

export function calculateDebtorOverdueStatus(debts: DebtWithPayments[], settings: OverdueSettings): OverdueStatus {
  if (debts.length === 0) {
    return {
      status: "good",
      isOverdue: false,
      overdueDays: 0,
      paidPercent: 1,
    };
  }

  // Calculate current remaining debt
  const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0);
  const totalPaid = debts.reduce((sum, d) => sum + d.payments.reduce((pSum, p) => pSum + p.amount, 0), 0);
  const remainingDebt = totalDebt - totalPaid;
  const aggregatePaidPercent = totalDebt > 0 ? totalPaid / totalDebt : 0;

  // If remaining debt <= 0, debtor is in good standing
  if (remainingDebt <= 0) {
    return {
      status: "good",
      isOverdue: false,
      overdueDays: 0,
      paidPercent: aggregatePaidPercent,
    };
  }

  // Find last 50%+ payment using same logic as rating-calculator
  type TransactionItem = DebtWithPayments | { amount: number; createdAt: Date };
  const allTransactions: Array<{ type: "debt" | "payment"; date: Date; amount: number; item: TransactionItem }> = [];

  debts.forEach((debt) => {
    allTransactions.push({ type: "debt", date: new Date(debt.createdAt), amount: debt.amount, item: debt });
    debt.payments.forEach((payment) => {
      allTransactions.push({
        type: "payment",
        date: new Date(payment.createdAt),
        amount: payment.amount,
        item: payment,
      });
    });
  });

  allTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  let lastResetPayment: TransactionItem | null = null;
  let runningDebt = 0;

  for (const transaction of allTransactions) {
    if (transaction.type === "debt") {
      runningDebt += transaction.amount;
    } else {
      const is50Plus = runningDebt > 0 && transaction.amount >= runningDebt * 0.5;
      if (is50Plus) {
        lastResetPayment = transaction.item;
      }
      runningDebt -= transaction.amount;
    }
  }

  // Calculate overdue days from last 50%+ payment or first debt
  const now = new Date();
  let overdueDays: number;

  if (lastResetPayment) {
    overdueDays = Math.floor((now.getTime() - new Date(lastResetPayment.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  } else {
    const firstDebt = debts.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
    overdueDays = Math.floor((now.getTime() - new Date(firstDebt.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  }

  // Determine status based on overdue days
  let status: "good" | "medium" | "bad";
  let isOverdue: boolean;

  if (overdueDays <= settings.goodUntilDays) {
    status = "good";
    isOverdue = false;
  } else if (overdueDays <= settings.mediumUntilDays) {
    status = "medium";
    isOverdue = false;
  } else {
    status = "bad";
    isOverdue = true;
  }

  return {
    status,
    isOverdue,
    overdueDays,
    paidPercent: aggregatePaidPercent,
  };
}
