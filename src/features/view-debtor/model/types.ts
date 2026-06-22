import type { DebtorDomain } from "@/types/domain";
import type { PaymentRating } from "@/entities/debtor/model";

export interface TimelineEvent {
  id: string;
  type: "DEBT" | "PAYMENT";
  amount: number;
  title: string;
  subtitle?: string | null;
  createdAt: Date;
}

export interface ViewDebtorStats {
  totalDebtAdded: number;
  totalPaid: number;
  remaining: number;
}

export interface ViewDebtorValue {
  debtor: DebtorDomain;
  stats: ViewDebtorStats;
  rating: PaymentRating;
  timeline: TimelineEvent[];
  firstDebtDate: Date;
  daysSinceFirstDebt: number;
  refresh: () => Promise<void>;
}
