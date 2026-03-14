"use client";

import type { TimelineEvent } from "@/features/view-debtor/model";
import { ViewDebtorTimeline } from "@/features/view-debtor/ui";

interface DebtorTimelineProps {
  timeline: TimelineEvent[];
}

export function DebtorTimeline({ timeline }: DebtorTimelineProps) {
  return <ViewDebtorTimeline timeline={timeline} />;
}
