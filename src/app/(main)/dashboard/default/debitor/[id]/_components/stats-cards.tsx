"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDebtor } from "./context/debtor-context";
import { formatDateUz } from "@/lib/utils";
import { BadgeDollarSign, Banknote, Calendar1Icon, ChartNoAxesCombined, FileText, HandCoinsIcon } from "lucide-react";

export function StatsCards() {
  const { debtor, totals, rating, daysSince, first_debt } = useDebtor();

  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
      <Card className="col-span-full gap-1 py-4 xl:col-span-2">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Ma&apos;lumotlar</CardTitle>
          <FileText className="h-5 w-5 text-indigo-500" />
        </CardHeader>
        <CardContent className="space-y-1 pt-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Manzil:</span>
            <span>{debtor.address || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Qarzdor qo&apos;shilgan sana:</span>
            <span>{formatDateUz(new Date(debtor.created_at))}</span>
          </div>
        </CardContent>
      </Card>
      <Card className="col-span-full gap-1 py-4 xl:col-span-2">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Qo&apos;shimcha</CardTitle>
          <Calendar1Icon className="h-5 w-5 text-indigo-500" />
        </CardHeader>
        <CardContent className="flex items-center justify-between pt-2">
          <div className="text-muted-foreground text-base">Birinchi qarz:</div>
          <div className={`text-base font-semibold ${rating.color}`}>{formatDateUz(first_debt)}</div>
        </CardContent>
        <CardContent className="flex items-center justify-between">
          <div className="text-muted-foreground text-base">Qarz olingandan boshlab o&apos;tdi:</div>
          <div className={`text-base font-semibold ${rating.color}`}>{daysSince.toFixed()} kun</div>
        </CardContent>
      </Card>
      <Card className="gap-1 py-4 xl:gap-2">
        <CardHeader className="flex items-center justify-between !py-0 md:pb-3 xl:!pb-4">
          <CardTitle className="text-sm font-medium">Umumiy qarz</CardTitle>
          <BadgeDollarSign className="h-5 w-5 text-indigo-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totals.totalDebtAdded.toLocaleString()} so&apos;m</div>
        </CardContent>
      </Card>
      <Card className="gap-1 py-4 xl:gap-2">
        <CardHeader className="flex items-center justify-between !py-0 md:pb-3 xl:!pb-4">
          <CardTitle className="text-sm font-medium">Umumiy to&apos;lov</CardTitle>
          <HandCoinsIcon className="h-5 w-5 text-indigo-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{totals.totalPaid.toLocaleString()} so&apos;m</div>
        </CardContent>
      </Card>
      <Card className="gap-1 py-4 xl:gap-2">
        <CardHeader className="flex items-center justify-between !py-0 md:pb-3 xl:!pb-4">
          <CardTitle className="text-sm font-medium">Qolgan qarz</CardTitle>
          <Banknote className="h-6 w-6 text-indigo-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{debtor.total_debt.toLocaleString()} so&apos;m</div>
        </CardContent>
      </Card>
      <Card className="col-span-full gap-1 py-4 xl:col-span-1">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Reyting</CardTitle>
          <ChartNoAxesCombined className="h-5 w-5 text-indigo-500" />
        </CardHeader>
        <CardContent className="space-y-1 pt-2">
          <div className={`text-xl font-semibold ${rating.color}`}>{rating.label}</div>
          <div className="text-muted-foreground text-xs">Ball: {rating.score} / 100</div>
        </CardContent>
      </Card>
    </div>
  );
}
