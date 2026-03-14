"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Minus, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ViewDebtorValue } from "../model";

export interface ViewDebtorHeaderProps {
  value: ViewDebtorValue;
  onAddDebt: () => void;
  onAddPayment: () => void;
  onExport: () => Promise<void>;
}

export function ViewDebtorHeader({ value, onAddDebt, onAddPayment, onExport }: ViewDebtorHeaderProps) {
  const router = useRouter();
  const { debtor } = value;

  return (
    <div className="flex w-full flex-col justify-between md:flex-row md:items-center">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {debtor.firstName} {debtor.lastName}
          </h1>
          <p className="text-muted-foreground text-sm">{debtor.phoneNumber || "Telefon raqami yo'q"}</p>
        </div>
      </div>
      <div className="mt-5 hidden justify-end gap-2 md:mt-0 md:flex">
        <Button variant="outline" className="h-12" onClick={onAddDebt}>
          <Plus className="h-4 w-4" />
          Qarz qo&apos;shish
        </Button>
        <Button variant="outline" className="h-12" onClick={onAddPayment}>
          <Minus className="h-4 w-4" />
          To&apos;lov qo&apos;shish
        </Button>
        <Button variant="default" className="h-12" onClick={onExport}>
          <Download className="h-4 w-4" />
          PDF Export
        </Button>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 md:hidden">
        <Button variant="outline" className="h-12" onClick={onAddDebt}>
          <Plus className="h-4 w-4" />
          Qarz
        </Button>
        <Button variant="outline" className="h-12" onClick={onAddPayment}>
          <Minus className="h-4 w-4" />
          To&apos;lov
        </Button>
        <Button variant="default" className="h-12" onClick={onExport}>
          <Download className="h-4 w-4" />
          PDF
        </Button>
      </div>
    </div>
  );
}
