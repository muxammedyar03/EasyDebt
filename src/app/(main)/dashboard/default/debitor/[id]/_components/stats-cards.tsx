"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDebtor } from "./context/debtor-context";

export function StatsCards() {
  const { debtor, totals, rating } = useDebtor();

  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
      <Card className="gap-1 py-4 xl:gap-2">
        <CardHeader className="!py-0 md:pb-3 xl:!pb-4">
          <CardTitle className="text-sm font-medium">Umumiy qarz</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totals.totalDebtAdded.toLocaleString()} so&apos;m</div>
        </CardContent>
      </Card>
      <Card className="gap-1 py-4 xl:gap-2">
        <CardHeader className="!py-0 md:pb-3 xl:!pb-4">
          <CardTitle className="text-sm font-medium">Umumiy to&apos;lov</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{totals.totalPaid.toLocaleString()} so&apos;m</div>
        </CardContent>
      </Card>
      <Card className="gap-1 py-4 xl:gap-2">
        <CardHeader className="!py-0 md:pb-3 xl:!pb-4">
          <CardTitle className="text-sm font-medium">Qolgan qarz</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{debtor.total_debt.toLocaleString()} so&apos;m</div>
        </CardContent>
      </Card>
      <Card className="col-span-full gap-1 py-4 xl:col-span-1">
        <CardHeader>
          <CardTitle>Reyting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className={`text-xl font-semibold ${rating.color}`}>{rating.label}</div>
          <div className="text-muted-foreground text-sm">Ball: {rating.score} / 100</div>
        </CardContent>
      </Card>
      <Card className="col-span-full gap-1 py-4 xl:col-span-1">
        <CardHeader>
          <CardTitle>Ma&apos;lumotlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Manzil:</span>
            <span>{debtor.address || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Qo&apos;shilgan sana:</span>
            <span>{new Date(debtor.created_at).toLocaleDateString("uz-UZ")}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
