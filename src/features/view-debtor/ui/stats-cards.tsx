"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeDollarSign, Banknote, Calendar1Icon, ChartNoAxesCombined, FileText, HandCoinsIcon } from "lucide-react";
import { formatCurrencyUzs, formatDateUz } from "@/lib/format";
import type { ViewDebtorValue } from "../model";

export interface ViewStatsCardsProps {
  value: ViewDebtorValue;
}

const RATING_LABEL_KEYS = {
  Yomon: "bad",
  "O'rtacha": "average",
  Yaxshi: "good",
  "A'lo": "excellent",
} as const;

export function ViewStatsCards({ value }: ViewStatsCardsProps) {
  const { debtor, stats, rating, firstDebtDate, daysSinceFirstDebt } = value;
  const t = useTranslations("stats");
  const tRating = useTranslations("rating");
  const tCommon = useTranslations("common");
  const ratingLabelKey = RATING_LABEL_KEYS[rating.label] ?? "good";

  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
      <Card className="col-span-full gap-1 py-4 xl:col-span-2">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>{t("info")}</CardTitle>
          <FileText className="h-5 w-5 text-indigo-500" />
        </CardHeader>
        <CardContent className="space-y-1 pt-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("address")}</span>
            <span>{debtor.address || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("debtorAddedAt")}</span>
            <span>{formatDateUz(new Date(debtor.createdAt))}</span>
          </div>
        </CardContent>
      </Card>
      <Card className="col-span-full gap-1 py-4 xl:col-span-2">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>{t("extra")}</CardTitle>
          <Calendar1Icon className="h-5 w-5 text-indigo-500" />
        </CardHeader>
        <CardContent className="flex items-center justify-between pt-2">
          <div className="text-muted-foreground text-base">{t("firstDebt")}</div>
          <div className="text-base font-semibold">{formatDateUz(firstDebtDate)}</div>
        </CardContent>
        <CardContent className="flex items-center justify-between">
          <div className="text-muted-foreground text-base">{t("daysSinceFirstDebt")}</div>
          <div className="text-base font-semibold">
            {daysSinceFirstDebt} {tCommon("days")}
          </div>
        </CardContent>
      </Card>
      <Card className="gap-1 py-4 xl:gap-2">
        <CardHeader className="flex items-center justify-between !py-0 md:pb-3 xl:!pb-4">
          <CardTitle className="text-sm font-medium">{t("totalDebt")}</CardTitle>
          <BadgeDollarSign className="h-5 w-5 text-indigo-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrencyUzs(stats.totalDebtAdded || 0)}</div>
        </CardContent>
      </Card>
      <Card className="gap-1 py-4 xl:gap-2">
        <CardHeader className="flex items-center justify-between !py-0 md:pb-3 xl:!pb-4">
          <CardTitle className="text-sm font-medium">{t("totalPaid")}</CardTitle>
          <HandCoinsIcon className="h-5 w-5 text-indigo-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{formatCurrencyUzs(stats.totalPaid)}</div>
        </CardContent>
      </Card>
      <Card className="gap-1 py-4 xl:gap-2">
        <CardHeader className="flex items-center justify-between !py-0 md:pb-3 xl:!pb-4">
          <CardTitle className="text-sm font-medium">{t("remaining")}</CardTitle>
          <Banknote className="h-6 w-6 text-indigo-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{formatCurrencyUzs(stats.remaining)}</div>
        </CardContent>
      </Card>
      <Card className="col-span-full gap-1 py-4 xl:col-span-1">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>{t("rating")}</CardTitle>
          <ChartNoAxesCombined className="h-5 w-5 text-indigo-500" />
        </CardHeader>
        <CardContent className="space-y-1 pt-2">
          <div className={`text-xl font-semibold ${rating.color}`}>{tRating(ratingLabelKey)}</div>
          <div className="text-muted-foreground text-xs">{t("avgDays", { score: rating.score })}</div>
        </CardContent>
      </Card>
    </div>
  );
}
