import { useMemo } from "react";
import type { DebtorDomain } from "@/types/domain";
import { calculatePaymentRating } from "@/entities/debtor/model";
import type { TimelineEvent, ViewDebtorStats } from "./types";

/** Result of stats/rating/timeline computation – shared by sync (server) and hook (client after refetch) */
export type ViewDebtorComputed = {
  stats: ViewDebtorStats;
  rating: ReturnType<typeof calculatePaymentRating>;
  timeline: TimelineEvent[];
  firstDebtDate: Date;
  daysSinceFirstDebt: number;
};

/**
 * Pure computation for debtor detail view (stats, rating, timeline).
 * Use on server to avoid running calculation on client for initial load (Task 1.3).
 */
export function computeViewValueSync(debtor: DebtorDomain, overdueDays: number): ViewDebtorComputed {
  const debts = debtor.debts ?? [];
  const payments = debtor.payments ?? [];
  const totalDebtAdded = debts.reduce((sum, d) => sum + d.amount, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = debtor.totalDebt ?? 0;
  const stats: ViewDebtorStats = { totalDebtAdded, totalPaid, remaining };
  const rating = calculatePaymentRating(debts, payments, overdueDays, stats.remaining);
  const firstDebtDate =
    debts.length === 0
      ? new Date()
      : debts.map((d) => new Date(d.createdAt)).sort((a, b) => a.getTime() - b.getTime())[0];
  const daysSinceFirstDebt =
    debts.length === 0 ? 0 : Math.floor((Date.now() - firstDebtDate.getTime()) / (1000 * 60 * 60 * 24));
  const debtEvents: TimelineEvent[] = debts.map((d) => ({
    id: `debt-${d.id}`,
    type: "DEBT" as const,
    amount: d.amount,
    title: `Qarz qo'shildi: +${d.amount.toLocaleString()} so'm`,
    subtitle: d.description ?? null,
    createdAt: new Date(d.createdAt),
  }));
  const paymentEvents: TimelineEvent[] = payments.map((p) => ({
    id: `payment-${p.id}`,
    type: "PAYMENT" as const,
    amount: p.amount,
    title: `To'lov: -${p.amount.toLocaleString()} so'm`,
    subtitle:
      p.paymentType === "CASH"
        ? "Naqd"
        : p.paymentType === "CLICK"
          ? "Click"
          : p.paymentType === "CARD"
            ? "Karta"
            : "Unknown",
    createdAt: new Date(p.createdAt),
  }));
  const timeline = [...debtEvents, ...paymentEvents].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return { stats, rating, timeline, firstDebtDate, daysSinceFirstDebt };
}

export function useComputedViewValue(
  debtor: DebtorDomain | undefined,
  overdueDays: number,
): {
  stats: ViewDebtorStats;
  rating: ReturnType<typeof calculatePaymentRating>;
  timeline: TimelineEvent[];
  firstDebtDate: Date;
  daysSinceFirstDebt: number;
} {
  const debts = useMemo(() => debtor?.debts ?? [], [debtor?.debts]);
  const payments = useMemo(() => debtor?.payments ?? [], [debtor?.payments]);

  const stats = useMemo(() => {
    const totalDebtAdded = debts.reduce((sum, d) => sum + d.amount, 0);
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = debtor?.totalDebt ?? 0;
    return { totalDebtAdded, totalPaid, remaining };
  }, [debts, payments, debtor?.totalDebt]);

  const rating = useMemo(
    () => calculatePaymentRating(debts, payments, overdueDays, stats.remaining),
    [debts, payments, stats.remaining, overdueDays],
  );

  const firstDebtDate = useMemo(() => {
    if (debts.length === 0) return new Date();
    return debts.map((d) => new Date(d.createdAt)).sort((a, b) => a.getTime() - b.getTime())[0];
  }, [debts]);

  const daysSinceFirstDebt = useMemo(() => {
    if (debts.length === 0) return 0;
    return Math.floor((Date.now() - firstDebtDate.getTime()) / (1000 * 60 * 60 * 24));
  }, [debts.length, firstDebtDate]);

  const timeline = useMemo(() => {
    const debtEvents: TimelineEvent[] = debts.map((d) => ({
      id: `debt-${d.id}`,
      type: "DEBT" as const,
      amount: d.amount,
      title: `Qarz qo'shildi: +${d.amount.toLocaleString()} so'm`,
      subtitle: d.description ?? null,
      createdAt: new Date(d.createdAt),
    }));
    const paymentEvents: TimelineEvent[] = payments.map((p) => ({
      id: `payment-${p.id}`,
      type: "PAYMENT" as const,
      amount: p.amount,
      title: `To'lov: -${p.amount.toLocaleString()} so'm`,
      subtitle:
        p.paymentType === "CASH"
          ? "Naqd"
          : p.paymentType === "CLICK"
            ? "Click"
            : p.paymentType === "CARD"
              ? "Karta"
              : "Unknown",
      createdAt: new Date(p.createdAt),
    }));
    return [...debtEvents, ...paymentEvents].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [debts, payments]);

  return { stats, rating, timeline, firstDebtDate, daysSinceFirstDebt };
}
