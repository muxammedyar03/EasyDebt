"use client";

import { useDebtor } from "./context/debtor-context";
import { ViewDebtorTimeline } from "@/features/view-debtor/ui";

export function DebtorTimeline() {
  const { timeline } = useDebtor();
  return <ViewDebtorTimeline timeline={timeline} />;
}
