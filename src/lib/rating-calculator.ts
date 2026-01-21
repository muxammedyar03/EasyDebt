import type { DebtorDomain } from "@/types/domain";

export interface PaymentRating {
  score: number;
  label: "Yomon" | "O'rtacha" | "Yaxshi" | "A'lo";
  color: string;
}

const MIN_PAYMENT_PERCENT = 0.5;
const DEFAULT_RATING: PaymentRating = {
  score: 0,
  label: "Yaxshi",
  color: "text-orange-600",
};

/**
 * Calculate payment rating based on debts and payments
 *
 * NEW LOGIC:
 * 1. Find last 50%+ payment (reset point)
 * 2. Consider only debts AFTER that payment
 * 3. If debts exist after last 50%+ payment and no new payments -> calculate avgDays from that point
 * 4. If no debts after last 50%+ payment -> avgDays = 0, A'lo rating
 */
export function calculatePaymentRating(
  debts: DebtorDomain["debts"] = [],
  payments: DebtorDomain["payments"] = [],
  overdueDays: number,
  totalDebtAmount?: number,
): PaymentRating {
  if (debts.length === 0) {
    return DEFAULT_RATING;
  }

  const now = new Date();

  // Sort debts and payments by date
  const sortedDebts = [...debts].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  // Find last 50%+ payment (reset point)
  // Strategy: Go through all debts and payments chronologically
  // Track cumulative debt and payment, check if payment >= 50% at each payment
  let lastResetPayment: (typeof sortedPayments)[0] | null = null;

  // Combine and sort all transactions by date
  type TransactionItem = (typeof sortedDebts)[0] | (typeof sortedPayments)[0];
  const allTransactions: Array<{ type: "debt" | "payment"; date: Date; amount: number; item: TransactionItem }> = [
    ...sortedDebts.map((d) => ({ type: "debt" as const, date: new Date(d.createdAt), amount: d.amount, item: d })),
    ...sortedPayments.map((p) => ({
      type: "payment" as const,
      date: new Date(p.createdAt),
      amount: p.amount,
      item: p,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate remaining debt at each point in time
  let remainingDebt = 0;

  for (const transaction of allTransactions) {
    if (transaction.type === "debt") {
      remainingDebt += transaction.amount;
    } else {
      // Check if this payment is >= 50% of remaining debt at this point
      const is50Plus = remainingDebt > 0 && transaction.amount >= remainingDebt * 0.5;
      if (is50Plus) {
        lastResetPayment = transaction.item as (typeof sortedPayments)[0];
      }
      remainingDebt -= transaction.amount;
    }
  }

  // Check current total debt
  const currentTotalDebt = totalDebtAmount ?? debts.reduce((sum, d) => sum + d.amount, 0);

  // If total debt is 0 or negative -> A'lo rating, avgDays = 0
  if (currentTotalDebt <= 0) {
    return {
      score: 0,
      label: "A'lo",
      color: "text-green-600",
    };
  }

  // If total debt > 0, calculate avgDays from last payment to today
  // Ignore whether there are debts after last reset or not
  let avgDays: number;

  if (lastResetPayment) {
    // Calculate days from last 50%+ payment to today
    avgDays = Math.floor((now.getTime() - new Date(lastResetPayment.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  } else {
    // No 50%+ payment yet, calculate from first debt to today
    const firstDebt = sortedDebts[0];
    avgDays = Math.floor((now.getTime() - new Date(firstDebt.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  }

  // Determine rating based on avgDays
  let label: PaymentRating["label"];
  let color: string;

  if (avgDays <= overdueDays - 30 || currentTotalDebt <= 0) {
    label = "A'lo";
    color = "text-green-600";
  } else if (avgDays > overdueDays - 30 && avgDays <= overdueDays - 15 && currentTotalDebt > 0) {
    label = "Yaxshi";
    color = "text-emerald-600";
  } else if (avgDays > overdueDays - 15 && avgDays <= overdueDays && currentTotalDebt > 0) {
    label = "O'rtacha";
    color = "text-yellow-600";
  } else if (avgDays > overdueDays && currentTotalDebt > 0) {
    label = "Yomon";
    color = "text-red-600";
  } else {
    label = "Yaxshi";
    color = "text-emerald-600";
  }

  return {
    score: Math.round(avgDays),
    label,
    color,
  };
}

/**
 * Calculate payment percentage
 * Returns the percentage of total debt that has been paid
 */
export function calculatePaymentPercentage(
  debts: DebtorDomain["debts"] = [],
  payments: DebtorDomain["payments"] = [],
): number {
  const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  return totalDebt > 0 ? totalPaid / totalDebt : 0;
}

/**
 * Check if debtor is overdue based on debts and payments
 *
 * NEW LOGIC:
 * 1. If total_debt <= 0 -> NOT overdue
 * 2. If total_debt > 0 and last 50%+ payment exists -> check days from last payment to today
 * 3. If total_debt > 0 and no 50%+ payment -> check days from first debt to today
 * 4. If days > overdueDays -> OVERDUE
 */
export function isDebtorOverdue(
  debts: DebtorDomain["debts"] = [],
  payments: DebtorDomain["payments"] = [],
  overdueDays: number = 45,
  totalDebtAmount?: number,
): boolean {
  if (debts.length === 0) {
    return false;
  }

  const now = new Date();
  const sortedDebts = [...debts].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  // Calculate current total debt
  const currentTotalDebt =
    totalDebtAmount ?? debts.reduce((sum, d) => sum + d.amount, 0) - payments.reduce((sum, p) => sum + p.amount, 0);

  // If total debt is 0 or negative -> not overdue
  if (currentTotalDebt <= 0) {
    return false;
  }

  // Find last 50%+ payment (same logic as calculatePaymentRating)
  let lastResetPayment: (typeof sortedPayments)[0] | null = null;

  type TransactionItem = (typeof sortedDebts)[0] | (typeof sortedPayments)[0];
  const allTransactions: Array<{ type: "debt" | "payment"; date: Date; amount: number; item: TransactionItem }> = [
    ...sortedDebts.map((d) => ({ type: "debt" as const, date: new Date(d.createdAt), amount: d.amount, item: d })),
    ...sortedPayments.map((p) => ({
      type: "payment" as const,
      date: new Date(p.createdAt),
      amount: p.amount,
      item: p,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate remaining debt at each point in time
  let remainingDebt = 0;

  for (const transaction of allTransactions) {
    if (transaction.type === "debt") {
      remainingDebt += transaction.amount;
    } else {
      // Check if this payment is >= 50% of remaining debt at this point
      const is50Plus = remainingDebt > 0 && transaction.amount >= remainingDebt * 0.5;
      if (is50Plus) {
        lastResetPayment = transaction.item as (typeof sortedPayments)[0];
      }
      remainingDebt -= transaction.amount;
    }
  }

  // Calculate days based on last 50%+ payment or first debt
  let daysSince: number;

  if (lastResetPayment) {
    // Calculate days from last 50%+ payment to today
    daysSince = Math.floor((now.getTime() - new Date(lastResetPayment.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  } else {
    // No 50%+ payment yet, calculate from first debt to today
    const firstDebt = sortedDebts[0];
    daysSince = Math.floor((now.getTime() - new Date(firstDebt.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  }

  const isOverdue = daysSince > overdueDays;

  return isOverdue;
}

/**
 * Calculate average days between debt and payment for customer ratings
 * Used in debtor.service.ts for getCustomerRatings
 *
 * Returns the average days from debt creation to payment (or to today if no payment)
 * Returns 0 if 50% or more of total debt is paid
 */
export function calculateAverageDaysBetweenDebtAndPayment(
  debts: Array<{ amount: number; createdAt: Date }> = [],
  payments: Array<{ amount: number; createdAt: Date }> = [],
  totalDebtAmount: number = 0,
): number {
  // If 50% or more is paid, return 0
  const totalDebt = totalDebtAmount || debts.reduce((sum, d) => sum + d.amount, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const paidPercentage = totalDebt > 0 ? totalPaid / totalDebt : 0;

  if (paidPercentage >= 0.5) {
    return 0;
  }

  // Calculate average days from debt to payment
  let totalDays = 0;
  let validPaymentsCount = 0;
  const now = new Date();

  debts.forEach((debt) => {
    const minPaymentAmount = debt.amount * MIN_PAYMENT_PERCENT;
    const eligiblePayments = payments.filter(
      (payment) => new Date(payment.createdAt) >= new Date(debt.createdAt) && payment.amount >= minPaymentAmount,
    );

    let days: number;
    if (eligiblePayments.length > 0) {
      const firstValidPayment = eligiblePayments[0];
      days = Math.floor(
        (new Date(firstValidPayment.createdAt).getTime() - new Date(debt.createdAt).getTime()) / (1000 * 60 * 60 * 24),
      );
    } else {
      days = Math.floor((now.getTime() - new Date(debt.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    }

    totalDays += days;
    validPaymentsCount++;
  });

  return validPaymentsCount > 0 ? totalDays / validPaymentsCount : 0;
}

/**
 * Calculate customer rating for service layer (high/medium/critical)
 * Used in debtor.service.ts for getCustomerRatings
 */
export function calculateCustomerRating(
  avgDaysBetweenDebtAndPayment: number,
  totalDebt: number,
  overdueDays: number = 45,
): "high" | "medium" | "critical" {
  if (totalDebt <= 0) {
    return "high";
  }

  if (avgDaysBetweenDebtAndPayment === 0) {
    // If avgDays is 0 (50%+ paid), always high rating
    return "high";
  }

  if (avgDaysBetweenDebtAndPayment <= overdueDays - 15) {
    return "high";
  } else if (avgDaysBetweenDebtAndPayment > overdueDays - 15 && avgDaysBetweenDebtAndPayment <= overdueDays) {
    return "medium";
  } else {
    return "critical";
  }
}
