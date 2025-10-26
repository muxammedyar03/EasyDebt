"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Minus, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDebtor } from "./context/debtor-context";
import { APP_CONFIG } from "@/config/app-config";
import { useCurrentUser } from "@/hooks/use-current-user";
import { exportDebtorReceipt } from "@/lib/pdf";

export function DebtorHeader({ onAddDebt, onAddPayment }: { onAddDebt: () => void; onAddPayment: () => void }) {
  const router = useRouter();
  const { debtor, totals, rating, timeline } = useDebtor();
  const { user } = useCurrentUser();

  const handleExport = React.useCallback(async () => {
    await exportDebtorReceipt({
      appName: APP_CONFIG.name,
      logoUrl: "/favicon.ico",
      debtor: {
        id: debtor.id,
        first_name: debtor.first_name,
        last_name: debtor.last_name,
        phone_number: debtor.phone_number,
        address: debtor.address,
        total_debt: debtor.total_debt,
        created_at: debtor.created_at,
      },
      totals,
      rating: { label: rating.label, score: rating.score },
      timeline,
      generatedBy: user
        ? { id: user.id, username: user.username, first_name: user.first_name, last_name: user.last_name }
        : null,
      generatedAt: new Date(),
    });
  }, [debtor, totals, rating, timeline, user]);

  return (
    <div className="flex w-full flex-col justify-between md:flex-row md:items-center">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {debtor.first_name} {debtor.last_name}
          </h1>
          <p className="text-muted-foreground text-sm">{debtor.phone_number || "Telefon raqami yo'q"}</p>
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2 md:mt-0">
        <Button variant="outline" onClick={onAddDebt}>
          <Plus className="mr-2 h-4 w-4" />
          Qarz qo&apos;shish
        </Button>
        <Button variant="outline" onClick={onAddPayment}>
          <Minus className="mr-2 h-4 w-4" />
          To&apos;lov qo&apos;shish
        </Button>
        <Button variant="default" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          PDF Export
        </Button>
      </div>
    </div>
  );
}
