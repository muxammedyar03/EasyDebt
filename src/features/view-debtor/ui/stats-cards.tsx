"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeDollarSign, Banknote, Calendar1Icon, ChartNoAxesCombined, FileText, HandCoinsIcon } from "lucide-react";
import { formatCurrencyUzs, formatDateUz } from "@/lib/format";
import type { ViewDebtorValue } from "../model";

export interface ViewStatsCardsProps {
  value: ViewDebtorValue;
}

export function ViewStatsCards({ value }: ViewStatsCardsProps) {
  const { debtor, stats, rating, firstDebtDate, daysSinceFirstDebt } = value;

  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
      <Card className="col-span-full gap-1 py-4 xl:col-span-2">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Информация</CardTitle>
          <FileText className="h-5 w-5 text-indigo-500" />
        </CardHeader>
        <CardContent className="space-y-1 pt-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Адрес:</span>
            <span>{debtor.address || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Дата добавления дебитора:</span>
            <span>{formatDateUz(new Date(debtor.createdAt))}</span>
          </div>
        </CardContent>
      </Card>
      <Card className="col-span-full gap-1 py-4 xl:col-span-2">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Дополнительно</CardTitle>
          <Calendar1Icon className="h-5 w-5 text-indigo-500" />
        </CardHeader>
        <CardContent className="flex items-center justify-between pt-2">
          <div className="text-muted-foreground text-base">Первый долг:</div>
          <div className="text-base font-semibold">{formatDateUz(firstDebtDate)}</div>
        </CardContent>
        <CardContent className="flex items-center justify-between">
          <div className="text-muted-foreground text-base">С момента первого долга прошло:</div>
          <div className="text-base font-semibold">{daysSinceFirstDebt} kun</div>
        </CardContent>
      </Card>
      <Card className="gap-1 py-4 xl:gap-2">
        <CardHeader className="flex items-center justify-between !py-0 md:pb-3 xl:!pb-4">
          <CardTitle className="text-sm font-medium">Общий долг</CardTitle>
          <BadgeDollarSign className="h-5 w-5 text-indigo-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrencyUzs(stats.totalDebtAdded || 0)}</div>
        </CardContent>
      </Card>
      <Card className="gap-1 py-4 xl:gap-2">
        <CardHeader className="flex items-center justify-between !py-0 md:pb-3 xl:!pb-4">
          <CardTitle className="text-sm font-medium">Общий платеж</CardTitle>
          <HandCoinsIcon className="h-5 w-5 text-indigo-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{formatCurrencyUzs(stats.totalPaid)}</div>
        </CardContent>
      </Card>
      <Card className="gap-1 py-4 xl:gap-2">
        <CardHeader className="flex items-center justify-between !py-0 md:pb-3 xl:!pb-4">
          <CardTitle className="text-sm font-medium">Остаток долга</CardTitle>
          <Banknote className="h-6 w-6 text-indigo-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{formatCurrencyUzs(stats.remaining)}</div>
        </CardContent>
      </Card>
      <Card className="col-span-full gap-1 py-4 xl:col-span-1">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Рейтинг</CardTitle>
          <ChartNoAxesCombined className="h-5 w-5 text-indigo-500" />
        </CardHeader>
        <CardContent className="space-y-1 pt-2">
          <div className={`text-xl font-semibold ${rating.color}`}>{rating.label}</div>
          <div className="text-muted-foreground text-xs">Среднее количество дней: {rating.score}</div>
        </CardContent>
      </Card>
    </div>
  );
}
