"use client";

import type { ViewDebtorValue } from "@/features/view-debtor/model";
import { ViewStatsCards } from "@/features/view-debtor/ui";

interface StatsCardsProps {
  value: ViewDebtorValue;
}

export function StatsCards({ value }: StatsCardsProps) {
  return <ViewStatsCards value={value} />;
}
