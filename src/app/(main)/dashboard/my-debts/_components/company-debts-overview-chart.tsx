"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { ArrowRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrencyUzs } from "@/lib/format";
import type { ChartPeriod } from "@/lib/period-date-range";
import type { CompanyChartMetric, CompanyChartPoint } from "@/types/domain/company-daily-snapshot.domain";

type ChartResponse = {
  period: ChartPeriod;
  type: CompanyChartMetric;
  points: CompanyChartPoint[];
};

const PERIODS: ChartPeriod[] = ["week", "3months", "year"];
const METRICS: CompanyChartMetric[] = ["debt", "payments"];

export function CompanyDebtsOverviewChart() {
  const t = useTranslations("myDebts");
  const [period, setPeriod] = React.useState<ChartPeriod>("week");
  const [metric, setMetric] = React.useState<CompanyChartMetric>("debt");

  const periodLabels = React.useMemo(
    (): Record<ChartPeriod, string> => ({
      week: t("chartPeriodWeek"),
      "3months": t("chartPeriod3Months"),
      year: t("chartPeriodYear"),
    }),
    [t],
  );

  const metricLabels = React.useMemo(
    (): Record<CompanyChartMetric, string> => ({
      debt: t("chartMetricDebt"),
      payments: t("chartMetricPayments"),
    }),
    [t],
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["company-debts-chart", period, metric],
    queryFn: async () => {
      const qs = new URLSearchParams({ period, type: metric });
      const res = await fetch(`/api/company-reports/chart?${qs}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || t("chartLoadError"));
      }
      return res.json() as Promise<ChartResponse>;
    },
    placeholderData: keepPreviousData,
  });

  const chartConfig = React.useMemo(
    () =>
      ({
        value: {
          label: metricLabels[metric],
          color: metric === "debt" ? "var(--chart-1)" : "var(--chart-2)",
        },
      }) satisfies ChartConfig,
    [metric, metricLabels],
  );

  const points = data?.points ?? [];

  return (
    <Card className="@container/card">
      <CardHeader className="gap-4 space-y-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg">{t("chartHeader")}</CardTitle>
            <CardDescription>
              {t("chartDescription", {
                metric: metricLabels[metric],
                period: periodLabels[period],
              })}
            </CardDescription>
          </div>
          <Button asChild variant="outline" className="h-8 shrink-0 text-xs sm:h-11 sm:text-sm">
            <Link href="/dashboard/my-debts/report">
              {t("chartDetails")}
              <ArrowRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:hidden">
            <Select value={period} onValueChange={(v) => setPeriod(v as ChartPeriod)}>
              <SelectTrigger className="!h-10 w-full" aria-label={t("chartPeriod")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {periodLabels[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={metric} onValueChange={(v) => setMetric(v as CompanyChartMetric)}>
              <SelectTrigger className="!h-10 w-full" aria-label={t("chartMetric")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRICS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {metricLabels[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/40 hidden flex-wrap gap-2 rounded-xl border p-1.5 sm:flex">
            {PERIODS.map((key) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={period === key ? "default" : "ghost"}
                className="h-9 px-4 text-sm"
                onClick={() => setPeriod(key)}
              >
                {periodLabels[key]}
              </Button>
            ))}
          </div>

          <div className="bg-muted/40 hidden flex-wrap gap-2 rounded-xl border p-1.5 sm:flex">
            {METRICS.map((key) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={metric === key ? "default" : "ghost"}
                className="h-9 px-4 text-sm"
                onClick={() => setMetric(key)}
              >
                {metricLabels[key]}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-2 pt-2 sm:px-6 sm:pt-4">
        {isLoading && !data ? (
          <div className="text-muted-foreground flex h-[260px] items-center justify-center gap-2 text-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t("chartLoading")}
          </div>
        ) : error ? (
          <div className="text-destructive flex h-[260px] items-center justify-center text-sm">{error.message}</div>
        ) : points.length === 0 ? (
          <div className="text-muted-foreground flex h-[260px] items-center justify-center text-sm">{t("noData")}</div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
            <AreaChart data={points}>
              <defs>
                <linearGradient id="fillCompanyMetric" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload as CompanyChartPoint | undefined;
                      return item?.date ?? "";
                    }}
                    formatter={(value) => formatCurrencyUzs(Number(value))}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="value"
                type="monotone"
                fill="url(#fillCompanyMetric)"
                stroke="var(--color-value)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
