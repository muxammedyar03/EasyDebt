"use client";

import type { ViewDebtorValue } from "@/features/view-debtor/model";
import { ViewDebtorHeader } from "@/features/view-debtor/ui";

interface DebtorHeaderProps {
  value: ViewDebtorValue;
  onAddDebt: () => void;
  onAddPayment: () => void;
  onExport: () => Promise<void>;
}

export function DebtorHeader({ value, onAddDebt, onAddPayment, onExport }: DebtorHeaderProps) {
  return <ViewDebtorHeader value={value} onAddDebt={onAddDebt} onAddPayment={onAddPayment} onExport={onExport} />;
}
