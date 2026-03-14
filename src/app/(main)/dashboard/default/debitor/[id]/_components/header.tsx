"use client";

import * as React from "react";
import { useDebtor } from "./context/debtor-context";
import { APP_CONFIG } from "@/config/app-config";
import { useCurrentUser } from "@/hooks/use-current-user";
import { exportDebtorReceipt } from "@/lib/pdf";
import { ViewDebtorHeader } from "@/features/view-debtor/ui";

interface DebtorHeaderProps {
  onAddDebt: () => void;
  onAddPayment: () => void;
}

export function DebtorHeader({ onAddDebt, onAddPayment }: DebtorHeaderProps) {
  const value = useDebtor();
  const { debtor, stats, rating, timeline } = value;
  const { user } = useCurrentUser();

  const handleExport = React.useCallback(async () => {
    const timelineForExport = timeline.map((event) => ({
      ...event,
      created_at: event.createdAt,
    }));

    await exportDebtorReceipt({
      appName: APP_CONFIG.name,
      logoUrl: "/favicon.ico",
      debtor: {
        id: debtor.id,
        first_name: debtor.firstName,
        last_name: debtor.lastName,
        phone_number: debtor.phoneNumber,
        address: debtor.address,
        total_debt: debtor.totalDebt,
        created_at: debtor.createdAt,
      },
      totals: stats,
      rating: { label: rating.label, score: rating.score },
      timeline: timelineForExport,
      generatedBy: user
        ? { id: user.id, username: user.username, first_name: user.first_name, last_name: user.last_name }
        : null,
      generatedAt: new Date(),
    });
  }, [debtor, stats, rating, timeline, user]);

  return <ViewDebtorHeader value={value} onAddDebt={onAddDebt} onAddPayment={onAddPayment} onExport={handleExport} />;
}
