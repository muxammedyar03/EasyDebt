"use client";

import { useDebtor } from "./context/debtor-context";
import { ViewStatsCards } from "@/features/view-debtor/ui";

export function StatsCards() {
  const value = useDebtor();
  return <ViewStatsCards value={value} />;
}
