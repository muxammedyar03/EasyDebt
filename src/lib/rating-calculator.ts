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
 * Rules:
 * 1. If 50% or more of total debt is paid -> "A'lo" (high rating, 0 days)
 * 2. If no debts or no payments -> default rating
 * 3. Calculate average days from debt to payment (or to today if no payment)
 * 4. Rate based on average days:
 *    - <= 15 days: "A'lo" (green)
 *    - <= 30 days: "Yaxshi" (emerald)
 *    - <= 45 days: "O'rtacha" (yellow)
 *    - > 45 days: "Yomon" (red)
 */
export function calculatePaymentRating(
  debts: DebtorDomain["debts"] = [],
  payments: DebtorDomain["payments"] = [],
  totalDebtAmount?: number,
): PaymentRating {
  // No debts or no payments
  if (debts.length === 0 || payments.length === 0) {
    return DEFAULT_RATING;
  }

  // Calculate total debt and total paid
  const totalDebt = totalDebtAmount ?? debts.reduce((sum, d) => sum + d.amount, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const paidPercentage = totalDebt > 0 ? totalPaid / totalDebt : 0;

  // If 50% or more is paid, return high rating with 0 days
  if (paidPercentage >= 0.5) {
    return {
      score: 0,
      label: "A'lo",
      color: "text-green-600",
    };
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
      // Calculate days from debt to first valid payment
      const firstValidPayment = eligiblePayments[0];
      days = Math.floor(
        (new Date(firstValidPayment.createdAt).getTime() - new Date(debt.createdAt).getTime()) / (1000 * 60 * 60 * 24),
      );
    } else {
      // No valid payment found - calculate days from debt to today
      days = Math.floor((now.getTime() - new Date(debt.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    }

    totalDays += days;
    validPaymentsCount++;
  });

  // If no valid payments found, return default
  if (validPaymentsCount === 0) {
    return DEFAULT_RATING;
  }

  const avgDays = totalDays / validPaymentsCount;

  // Determine rating based on average days
  let label: PaymentRating["label"];
  let color: string;

  if (avgDays <= 15) {
    label = "A'lo";
    color = "text-green-600";
  } else if (avgDays <= 30) {
    label = "Yaxshi";
    color = "text-emerald-600";
  } else if (avgDays <= 45) {
    label = "O'rtacha";
    color = "text-yellow-600";
  } else {
    label = "Yomon";
    color = "text-red-600";
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
 * Check if debtor should be marked as overdue
 * Debtor is overdue if:
 * 1. First debt is older than threshold AND
 * 2. Less than 50% of total debt has been paid
 */
export function isDebtorOverdue(
  debts: DebtorDomain["debts"] = [],
  payments: DebtorDomain["payments"] = [],
  overdueDays: number = 45,
): boolean {
  if (debts.length === 0) {
    return false;
  }

  // Get first debt date
  const firstDebtDate = debts.map((d) => new Date(d.createdAt)).sort((a, b) => a.getTime() - b.getTime())[0];

  // Calculate overdue threshold
  const overdueDate = new Date();
  overdueDate.setDate(overdueDate.getDate() - overdueDays);

  // Calculate payment percentage
  const paidPercentage = calculatePaymentPercentage(debts, payments);

  // Debtor is overdue if first debt is older than threshold AND less than 50% paid
  return firstDebtDate < overdueDate && paidPercentage < 0.5;
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
