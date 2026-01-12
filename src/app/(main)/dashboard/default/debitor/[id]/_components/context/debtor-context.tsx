"use client";

import { DebtorDomain } from "@/types/domain";
import * as React from "react";

interface TimelineEvent {
  id: string;
  type: "DEBT" | "PAYMENT";
  amount: number;
  title: string;
  subtitle?: string | null;
  createdAt: Date;
}

interface DebtorStats {
  totalDebtAdded: number;
  totalPaid: number;
  remaining: number;
}

interface PaymentRating {
  score: number;
  label: "Yomon" | "O'rtacha" | "Yaxshi" | "A'lo";
  color: string;
}

interface DebtorContextValue {
  debtor: DebtorDomain;
  setDebtor: React.Dispatch<React.SetStateAction<DebtorDomain>>;
  stats: DebtorStats;
  rating: PaymentRating;
  timeline: TimelineEvent[];
  firstDebtDate: Date;
  daysSinceFirstDebt: number;
  refresh: () => Promise<void>;
}

const DebtorContext = React.createContext<DebtorContextValue | undefined>(undefined);

export function useDebtor() {
  const ctx = React.useContext(DebtorContext);
  if (!ctx) throw new Error("useDebtor must be used within DebtorProvider");
  return ctx;
}

export function DebtorProvider({
  initialDebtor,
  children,
}: {
  initialDebtor: DebtorDomain;
  children: React.ReactNode;
}) {
  const [debtor, setDebtor] = React.useState<DebtorDomain>(initialDebtor);

  const debts = React.useMemo(() => debtor.debts ?? [], [debtor.debts]);
  const payments = React.useMemo(() => debtor.payments ?? [], [debtor.payments]);

  const stats = React.useMemo(() => {
    const totalDebtAdded = debts.reduce((sum, debt) => sum + debt.amount, 0);
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remaining = debtor.totalDebt;
    return { totalDebtAdded, totalPaid, remaining };
  }, [debts, payments, debtor.totalDebt]);

  const rating = React.useMemo(() => {
    const defaultRating = { score: 0, label: "Yaxshi" as const, color: "text-orange-600" };

    if (debts.length === 0 || payments.length === 0) {
      return defaultRating;
    }

    const MIN_PAYMENT_PERCENT = 0.5;
    let totalDays = 0;
    let validPaymentsCount = 0;

    debts.forEach((debt) => {
      const minPaymentAmount = debt.amount * MIN_PAYMENT_PERCENT;
      const eligiblePayments = payments.filter(
        (payment) => payment.createdAt >= debt.createdAt && payment.amount >= minPaymentAmount,
      );

      if (eligiblePayments.length > 0) {
        const firstValidPayment = eligiblePayments[0];
        const days = Math.floor(
          (firstValidPayment.createdAt.getTime() - debt.createdAt.getTime()) / (1000 * 60 * 60 * 24),
        );
        totalDays += days;
        validPaymentsCount++;
      }
    });

    if (validPaymentsCount === 0) {
      return defaultRating;
    }

    const avgDays = totalDays / validPaymentsCount;
    let label: PaymentRating["label"] = "Yomon";
    let color = "text-red-600";

    if (avgDays <= 15) {
      label = "A'lo";
      color = "text-green-600";
    } else if (avgDays <= 30) {
      label = "Yaxshi";
      color = "text-emerald-600";
    } else if (avgDays <= 45) {
      label = "O'rtacha";
      color = "text-yellow-600";
    }

    return { score: Math.round(avgDays), label, color };
  }, [debts, payments]);

  const firstDebtDate = React.useMemo(() => {
    if (debts.length === 0) {
      return new Date();
    }
    return debts.map((debt) => new Date(debt.createdAt)).sort((a, b) => a.getTime() - b.getTime())[0];
  }, [debts]);

  const daysSinceFirstDebt = React.useMemo(() => {
    if (debts.length === 0) {
      return 0;
    }
    const days = Math.floor((Date.now() - firstDebtDate.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  }, [debts, firstDebtDate]);

  const timeline = React.useMemo(() => {
    const debtEvents: TimelineEvent[] = debts.map((debt) => ({
      id: `debt-${debt.id}`,
      type: "DEBT" as const,
      amount: debt.amount,
      title: `Qarz qo'shildi: +${debt.amount.toLocaleString()} so'm`,
      subtitle: debt.description,
      createdAt: new Date(debt.createdAt),
    }));

    const paymentEvents: TimelineEvent[] = payments.map((payment) => ({
      id: `payment-${payment.id}`,
      type: "PAYMENT" as const,
      amount: payment.amount,
      title: `To'lov: -${payment.amount.toLocaleString()} so'm`,
      subtitle: payment.note ?? payment.paymentType,
      createdAt: new Date(payment.createdAt),
    }));

    return [...debtEvents, ...paymentEvents].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }, [debts, payments]);

  const debtorIdRef = React.useRef(initialDebtor.id);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/debtors/${debtorIdRef.current}`);

      if (res.ok) {
        const data = await res.json();
        setDebtor((prev) => {
          const hasChanged =
            prev.totalDebt !== data.totalDebt ||
            (prev.debts?.length ?? 0) !== (data.debts?.length ?? 0) ||
            (prev.payments?.length ?? 0) !== (data.payments?.length ?? 0);

          return hasChanged ? data : prev;
        });
      }
    } catch (error) {
      console.error("Error refreshing debtor:", error);
    }
  }, []);

  const value: DebtorContextValue = React.useMemo(
    () => ({
      debtor,
      setDebtor,
      stats,
      rating,
      timeline,
      refresh,
      firstDebtDate,
      daysSinceFirstDebt,
    }),
    [debtor, stats, rating, timeline, refresh, firstDebtDate, daysSinceFirstDebt],
  );

  if (!debtor) {
    return <div>Debtor not found</div>;
  }

  return <DebtorContext.Provider value={value}>{children}</DebtorContext.Provider>;
}
