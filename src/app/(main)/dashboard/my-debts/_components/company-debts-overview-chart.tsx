"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCurrencyUzs } from "@/lib/format";
import type { ChartPeriod } from "@/lib/period-date-range";
import type { CompanyChartMetric, CompanyChartPoint } from "@/types/domain/company-daily-snapshot.domain";

type ChartResponse = {
  period: ChartPeriod;
  type: CompanyChartMetric;
  points: CompanyChartPoint[];
};

async function fetchChart(period: ChartPeriod, type: CompanyChartMetric): Promise<ChartResponse> {
  const qs = new URLSearchParams({ period, type });
  const res = await fetch(`/api/company-reports/chart?${qs}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Grafik yuklashda xatolik");
  }
  return res.json();
}

const debtChartConfig = {
  value: {
    label: "Umumiy qarz",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const paymentsChartConfig = {
  value: {
    label: "To'lovlar",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const PERIOD_LABELS: Record<ChartPeriod, string> = {
  week: "Oxirgi hafta",
  "3months": "3 oy",
  year: "Ushbu yil",
};

const TYPE_LABELS: Record<CompanyChartMetric, string> = {
  debt: "Umumiy qarz",
  payments: "To'lovlar",
};

export function CompanyDebtsOverviewChart() {
  const [period, setPeriod] = React.useState<ChartPeriod>("week");
  const [metric, setMetric] = React.useState<CompanyChartMetric>("debt");

  const { data, isLoading, error } = useQuery({
    queryKey: ["company-debts-chart", period, metric],
    queryFn: () => fetchChart(period, metric),
    placeholderData: keepPreviousData,
  });

  const chartConfig = metric === "debt" ? debtChartConfig : paymentsChartConfig;
  const points = data?.points ?? [];

  return (
    <Card className="@container/card">
      <CardHeader className="gap-4 space-y-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-lg">Qarz va to&apos;lovlar dinamikasi</CardTitle>
            <CardDescription>
              {TYPE_LABELS[metric]} · {PERIOD_LABELS[period]}
            </CardDescription>
          </div>
          <Button asChild variant="outline" className="h-11 shrink-0">
            <Link href="/dashboard/my-debts/report">
              Batafsil
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="bg-muted/40 flex flex-wrap gap-2 rounded-xl border p-1.5">
            {(Object.keys(PERIOD_LABELS) as ChartPeriod[]).map((key) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={period === key ? "default" : "ghost"}
                className="h-9 px-4 text-sm"
                onClick={() => setPeriod(key)}
              >
                {PERIOD_LABELS[key]}
              </Button>
            ))}
          </div>

          <div className="bg-muted/40 flex flex-wrap gap-2 rounded-xl border p-1.5">
            {(Object.keys(TYPE_LABELS) as CompanyChartMetric[]).map((key) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={metric === key ? "default" : "ghost"}
                className="h-9 px-4 text-sm"
                onClick={() => setMetric(key)}
              >
                {TYPE_LABELS[key]}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-2 pt-2 sm:px-6 sm:pt-4">
        {isLoading && !data ? (
          <div className="text-muted-foreground flex h-[260px] items-center justify-center gap-2 text-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            Yuklanmoqda...
          </div>
        ) : error ? (
          <div className="text-destructive flex h-[260px] items-center justify-center text-sm">{error.message}</div>
        ) : points.length === 0 ? (
          <div className="text-muted-foreground flex h-[260px] items-center justify-center text-sm">
            Ma&apos;lumot topilmadi
          </div>
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
