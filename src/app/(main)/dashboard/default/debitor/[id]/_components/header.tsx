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
  const { debtor, stats, rating, timeline } = useDebtor();
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
      {/* Desktop buttons */}
      <div className="mt-5 hidden justify-end gap-2 md:mt-0 md:flex">
        <Button variant="outline" className="h-12" onClick={onAddDebt}>
          <Plus className="h-4 w-4" />
          Qarz qo&apos;shish
        </Button>
        <Button variant="outline" className="h-12" onClick={onAddPayment}>
          <Minus className="h-4 w-4" />
          To&apos;lov qo&apos;shish
        </Button>
        <Button variant="default" className="h-12" onClick={handleExport}>
          <Download className="h-4 w-4" />
          PDF Export
        </Button>
      </div>
      {/* Mobile buttons */}
      <div className="mt-5 grid grid-cols-3 gap-2 md:hidden">
        <Button variant="outline" className="h-12" onClick={onAddDebt}>
          <Plus className="h-4 w-4" />
          Qarz
        </Button>
        <Button variant="outline" className="h-12" onClick={onAddPayment}>
          <Minus className="h-4 w-4" />
          To&apos;lov
        </Button>
        <Button variant="default" className="h-12" onClick={handleExport}>
          <Download className="h-4 w-4" />
          PDF
        </Button>
      </div>
    </div>
  );
}
