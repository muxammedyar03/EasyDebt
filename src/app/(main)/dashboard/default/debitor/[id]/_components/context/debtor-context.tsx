"use client";

import { DebtorDomain } from "@/types/domain";
import { calculatePaymentRating, type PaymentRating } from "@/entities/debtor/model";
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
  overdueDays,
  children,
}: {
  initialDebtor: DebtorDomain;
  overdueDays: number;
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
    return calculatePaymentRating(debts, payments, overdueDays, stats.remaining);
  }, [debts, payments, stats.remaining, overdueDays]);

  const firstDebtDate = React.useMemo(() => {
    if (debts.length === 0) {
      return new Date();
    }
    return debts.map((debt) => new Date(debt.createdAt)).sort((a, b) => a.getTime() - b.getTime())[0];
  }, [debts]);

  const daysSinceFirstDebt = React.useMemo(() => {
    if (debts.length <= 0) {
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
      subtitle:
        (payment.note ?? payment.paymentType == "CASH")
          ? "Naqd"
          : payment.paymentType == "CLICK"
            ? "Click"
            : payment.paymentType == "CARD"
              ? "Karta"
              : "Unknown",
      createdAt: new Date(payment.createdAt),
    }));

    return [...debtEvents, ...paymentEvents].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
