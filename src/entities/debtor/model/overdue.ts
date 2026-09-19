/**
 * Debtor entity – model: overdue calculation.
 * Single source of truth for overdue-related calculations.
 */

export interface OverdueSettings {
  goodUntilDays: number;
  mediumUntilDays: number;
  minPaidPercent: number;
}

export interface OverdueStatus {
  status: "good" | "medium" | "bad";
  isOverdue: boolean;
  overdueDays: number;
  paidPercent: number;
  thresholdReachedAt?: Date;
}

export interface DebtWithPayments {
  amount: number;
  createdAt: Date;
  payments: Array<{
    amount: number;
    createdAt: Date;
    resetsRating?: boolean;
  }>;
}

export function calculateDebtOverdueStatus(debt: DebtWithPayments, settings: OverdueSettings): OverdueStatus {
  const debtCreatedAt = new Date(debt.createdAt);
  const totalPaid = debt.payments.reduce((sum, p) => sum + p.amount, 0);
  const paidPercent = debt.amount > 0 ? totalPaid / debt.amount : 0;

  if (paidPercent >= settings.minPaidPercent) {
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

  const now = new Date();
  const overdueDays = Math.floor((now.getTime() - debtCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

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

export function parseOverdueSettings(settingsRecord: Record<string, string>): OverdueSettings {
  return {
    goodUntilDays: settingsRecord.good_until_days ? parseInt(settingsRecord.good_until_days, 10) : 30,
    mediumUntilDays: settingsRecord.medium_until_days ? parseInt(settingsRecord.medium_until_days, 10) : 45,
    minPaidPercent: settingsRecord.min_paid_percent ? parseFloat(settingsRecord.min_paid_percent) : 0.5,
  };
}

export function getDefaultOverdueSettings(): OverdueSettings {
  return {
    goodUntilDays: 30,
    mediumUntilDays: 45,
    minPaidPercent: 0.5,
  };
}

export function computeDebtorOverdueStatus(
  debts: Array<{ amount: number; createdAt: Date }> = [],
  payments: Array<{ amount: number; createdAt: Date; resetsRating?: boolean }> = [],
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

  const debtsWithPayments: DebtWithPayments[] = debts.map((debt, index) => ({
    amount: debt.amount,
    createdAt: debt.createdAt,
    // Feed each ledger payment exactly once, not once per debt.
    payments: index === 0 ? payments : [],
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

  const totalDebt = debts.reduce((sum, d) => sum + d.amount, 0);
  const totalPaid = debts.reduce((sum, d) => sum + d.payments.reduce((pSum, p) => pSum + p.amount, 0), 0);
  const remainingDebt = totalDebt - totalPaid;
  const aggregatePaidPercent = totalDebt > 0 ? totalPaid / totalDebt : 0;

  if (remainingDebt <= 0) {
    return {
      status: "good",
      isOverdue: false,
      overdueDays: 0,
      paidPercent: aggregatePaidPercent,
    };
  }

  type TransactionItem = DebtWithPayments | { amount: number; createdAt: Date; resetsRating?: boolean };
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
      const is50Plus = runningDebt > 0 && transaction.amount >= runningDebt * settings.minPaidPercent;
      if (is50Plus || ("resetsRating" in transaction.item && transaction.item.resetsRating)) {
        lastResetPayment = transaction.item;
      }
      runningDebt -= transaction.amount;
    }
  }

  const now = new Date();
  let overdueDays: number;

  if (lastResetPayment) {
    overdueDays = Math.floor((now.getTime() - new Date(lastResetPayment.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  } else {
    const firstDebt = [...debts].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
    overdueDays = Math.floor((now.getTime() - new Date(firstDebt.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  }

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
