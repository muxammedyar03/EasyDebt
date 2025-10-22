"use client";

import * as React from "react";

export type Debt = {
  id: number;
  amount: number;
  description: string | null;
  created_at: Date | string;
};

export type Payment = {
  id: number;
  amount: number;
  payment_type: string;
  note: string | null;
  created_at: Date | string;
};

export type Debtor = {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  address: string | null;
  total_debt: number;
  created_at: Date | string;
  updated_at: Date | string;
  debts: Debt[];
  payments: Payment[];
};

export type TimelineEvent = {
  id: string;
  type: "DEBT" | "PAYMENT";
  amount: number;
  title: string;
  subtitle?: string | null;
  created_at: Date;
};

interface DebtorContextValue {
  debtor: Debtor;
  setDebtor: React.Dispatch<React.SetStateAction<Debtor>>;
  totals: {
    totalDebtAdded: number;
    totalPaid: number;
    remaining: number;
  };
  rating: {
    score: number; // 0..100
    label: "Yomon" | "O'rtacha" | "Yaxshi" | "A'lo";
    color: string;
  };
  timeline: TimelineEvent[];
  refresh: () => Promise<void>;
}

const DebtorContext = React.createContext<DebtorContextValue | undefined>(undefined);

export function useDebtor() {
  const ctx = React.useContext(DebtorContext);
  if (!ctx) throw new Error("useDebtor must be used within DebtorProvider");
  return ctx;
}

export function DebtorProvider({ initialDebtor, children }: { initialDebtor: Debtor; children: React.ReactNode }) {
  const [debtor, setDebtor] = React.useState<Debtor>(initialDebtor);

  const totals = React.useMemo(() => {
    const totalDebtAdded = debtor.debts.reduce((s, d) => s + d.amount, 0);
    const totalPaid = debtor.payments.reduce((s, p) => s + p.amount, 0);
    const remaining = debtor.total_debt;
    return { totalDebtAdded, totalPaid, remaining };
  }, [debtor]);

  const rating = React.useMemo(() => {
    // Simple heuristic: payment ratio and recency
    const ratio = totals.totalPaid / Math.max(1, totals.totalDebtAdded);
    const lastPayment = debtor.payments.map((p) => new Date(p.created_at)).sort((a, b) => b.getTime() - a.getTime())[0];

    const daysSince = lastPayment ? (Date.now() - lastPayment.getTime()) / (1000 * 60 * 60 * 24) : Infinity;

    let score = Math.round(Math.min(1, ratio) * 70);
    if (daysSince < 7) score += 30;
    else if (daysSince < 30) score += 15;

    score = Math.max(0, Math.min(100, score));

    let label: DebtorContextValue["rating"]["label"] = "Yomon";
    let color = "text-red-600";
    if (score >= 85) {
      label = "A'lo";
      color = "text-green-600";
    } else if (score >= 65) {
      label = "Yaxshi";
      color = "text-emerald-600";
    } else if (score >= 45) {
      label = "O'rtacha";
      color = "text-yellow-600";
    }

    return { score, label, color };
  }, [debtor, totals]);

  const timeline: TimelineEvent[] = React.useMemo(() => {
    const debtEvents: TimelineEvent[] = debtor.debts.map((d) => ({
      id: `debt-${d.id}`,
      type: "DEBT",
      amount: d.amount,
      title: `Qarz qo'shildi: +${d.amount.toLocaleString()} so'm`,
      subtitle: d.description,
      created_at: new Date(d.created_at),
    }));

    const paymentEvents: TimelineEvent[] = debtor.payments.map((p) => ({
      id: `payment-${p.id}`,
      type: "PAYMENT",
      amount: p.amount,
      title: `To'lov: -${p.amount.toLocaleString()} so'm`,
      subtitle: p.note ?? p.payment_type,
      created_at: new Date(p.created_at),
    }));

    return [...debtEvents, ...paymentEvents].sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  }, [debtor]);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/debtors/${debtor.id}`);
      if (res.ok) {
        const data = await res.json();
        setDebtor(data);
      }
    } catch (e) {
      console.error("Error refreshing debtor", e);
    }
  }, [debtor.id]);

  const value: DebtorContextValue = React.useMemo(
    () => ({ debtor, setDebtor, totals, rating, timeline, refresh }),
    [debtor, totals, rating, timeline, refresh],
  );

  return <DebtorContext.Provider value={value}>{children}</DebtorContext.Provider>;
}
