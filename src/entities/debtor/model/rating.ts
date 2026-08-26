/**
 * Debtor entity – model: payment/customer rating calculation.
 */

import type { DebtorDomain } from "@/types/domain";

export interface PaymentRating {
  score: number;
  label: "Yomon" | "O'rtacha" | "Yaxshi" | "A'lo";
  color: string;
}

type TransactionInput = { amount: number; createdAt: Date; resetsRating?: boolean };

const MIN_PAYMENT_PERCENT = 0.5;
const DEFAULT_RATING: PaymentRating = {
  score: 0,
  label: "Yaxshi",
  color: "text-orange-600",
};

export function calculatePaymentRating(
  debts: TransactionInput[] = [],
  payments: TransactionInput[] = [],
  overdueDays: number,
  totalDebtAmount?: number,
): PaymentRating {
  if (debts.length === 0) {
    return DEFAULT_RATING;
  }

  const now = new Date();

  const sortedDebts = [...debts].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

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

  let remainingDebt = 0;

  for (const transaction of allTransactions) {
    if (transaction.type === "debt") {
      remainingDebt += transaction.amount;
    } else {
      const payment = transaction.item as (typeof sortedPayments)[0];
      const is50Plus = remainingDebt > 0 && transaction.amount >= remainingDebt * 0.5;
      if (is50Plus || payment.resetsRating) {
        lastResetPayment = payment;
      }
      remainingDebt -= transaction.amount;
    }
  }

  const currentTotalDebt = totalDebtAmount ?? debts.reduce((sum, d) => sum + d.amount, 0);

  if (currentTotalDebt <= 0) {
    return {
      score: 0,
      label: "A'lo",
      color: "text-green-600",
    };
  }

  let avgDays: number;

  if (lastResetPayment) {
    avgDays = Math.floor((now.getTime() - new Date(lastResetPayment.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  } else {
    const firstDebt = sortedDebts[0];
    avgDays = Math.floor((now.getTime() - new Date(firstDebt.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  }

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

export function calculatePaymentPercentage(
  debts: DebtorDomain["debts"] = [],
  payments: DebtorDomain["payments"] = [],
): number {
  const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  return totalDebt > 0 ? totalPaid / totalDebt : 0;
}

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

  const currentTotalDebt =
    totalDebtAmount ?? debts.reduce((sum, d) => sum + d.amount, 0) - payments.reduce((sum, p) => sum + p.amount, 0);

  if (currentTotalDebt <= 0) {
    return false;
  }

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

  let remainingDebt = 0;

  for (const transaction of allTransactions) {
    if (transaction.type === "debt") {
      remainingDebt += transaction.amount;
    } else {
      const payment = transaction.item as (typeof sortedPayments)[0];
      const is50Plus = remainingDebt > 0 && transaction.amount >= remainingDebt * 0.5;
      if (is50Plus || payment.resetsRating) {
        lastResetPayment = payment;
      }
      remainingDebt -= transaction.amount;
    }
  }

  let daysSince: number;

  if (lastResetPayment) {
    daysSince = Math.floor((now.getTime() - new Date(lastResetPayment.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  } else {
    const firstDebt = sortedDebts[0];
    daysSince = Math.floor((now.getTime() - new Date(firstDebt.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  }

  return daysSince > overdueDays;
}

export function calculateAverageDaysBetweenDebtAndPayment(
  debts: Array<{ amount: number; createdAt: Date }> = [],
  payments: Array<{ amount: number; createdAt: Date }> = [],
  totalDebtAmount: number = 0,
): number {
  const totalDebt = totalDebtAmount || debts.reduce((sum, d) => sum + d.amount, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const paidPercentage = totalDebt > 0 ? totalPaid / totalDebt : 0;

  if (paidPercentage >= 0.5) {
    return 0;
  }

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

export function calculateCustomerRating(
  avgDaysBetweenDebtAndPayment: number,
  totalDebt: number,
  overdueDays: number = 45,
): "high" | "medium" | "critical" {
  if (totalDebt <= 0) {
    return "high";
  }

  if (avgDaysBetweenDebtAndPayment === 0) {
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
