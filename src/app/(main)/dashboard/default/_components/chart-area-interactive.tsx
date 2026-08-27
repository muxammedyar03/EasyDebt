"use client";

import * as React from "react";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { useLocale, useTranslations } from "next-intl";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

export const description = "An interactive area chart";

interface ChartAreaInteractiveProps {
  chartData: Array<{
    date: string;
    cash: number;
    card: number;
    click: number;
  }>;
}

export function ChartAreaInteractive({ chartData }: ChartAreaInteractiveProps) {
  const t = useTranslations("home");
  const tPayment = useTranslations("payment");
  const locale = useLocale();
  const isMobile = useIsMobile();
  const router = useRouter();
  const [timeRange, setTimeRange] = React.useState("90d");

  const chartConfig = React.useMemo(
    () =>
      ({
        visitors: {
          label: t("payments"),
        },
        cash: {
          label: tPayment("cash"),
          color: "var(--chart-1)",
        },
        card: {
          label: tPayment("card"),
          color: "var(--chart-2)",
        },
        click: {
          label: tPayment("click"),
          color: "var(--chart-3)",
        },
      }) satisfies ChartConfig,
    [t, tPayment],
  );

  const dateLocale = locale === "ru" ? "ru-RU" : "uz-UZ";

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d");
    }
  }, [isMobile]);

  const filteredData = React.useMemo(() => {
    const now = new Date();
    let daysToSubtract = 90;
    if (timeRange === "30d") {
      daysToSubtract = 30;
    } else if (timeRange === "7d") {
      daysToSubtract = 7;
    }
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    return chartData.filter((item) => {
      const date = new Date(item.date);
      return date >= startDate;
    });
  }, [chartData, timeRange]);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{t("paymentMethods")}</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">{t("last3MonthsStats")}</span>
          <span className="@[540px]/card:hidden">{t("last3MonthsShort")}</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">{t("last3Months")}</ToggleGroupItem>
            <ToggleGroupItem value="30d">{t("last30Days")}</ToggleGroupItem>
            <ToggleGroupItem value="7d">{t("last7Days")}</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder={t("last3Months")} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                {t("last3Months")}
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                {t("last30Days")}
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                {t("last7Days")}
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
        <CardTitle>
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/reports")}>
            {t("viewAll")} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillCash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-cash)" stopOpacity={1.0} />
                <stop offset="95%" stopColor="var(--color-cash)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillCard" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-card)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-card)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillClick" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-click)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-click)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString(dateLocale, {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              defaultIndex={isMobile ? -1 : 10}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString(dateLocale, {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  indicator="dot"
                />
              }
            />
            <Area dataKey="cash" type="natural" fill="url(#fillCash)" stroke="var(--color-cash)" stackId="a" />
            <Area dataKey="card" type="natural" fill="url(#fillCard)" stroke="var(--color-card)" stackId="a" />
            <Area dataKey="click" type="natural" fill="url(#fillClick)" stroke="var(--color-click)" stackId="a" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
