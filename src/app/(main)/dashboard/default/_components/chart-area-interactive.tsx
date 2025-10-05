"use client";

import * as React from "react";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/hooks/use-mobile";

export const description = "An interactive area chart";

const chartConfig = {
  visitors: {
    label: "To'lovlar",
  },
  cash: {
    label: "Naqd",
    color: "var(--chart-1)",
  },
  card: {
    label: "Karta",
    color: "var(--chart-2)",
  },
  click: {
    label: "Click",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

interface ChartAreaInteractiveProps {
  chartData: Array<{
    date: string;
    cash: number;
    card: number;
    click: number;
  }>;
}

export function ChartAreaInteractive({ chartData }: ChartAreaInteractiveProps) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState("90d");

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
        <CardTitle>To'lov Usullari</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">Oxirgi 3 oylik to'lovlar statistikasi</span>
          <span className="@[540px]/card:hidden">Oxirgi 3 oy</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Oxirgi 3 oy</ToggleGroupItem>
            <ToggleGroupItem value="30d">Oxirgi 30 kun</ToggleGroupItem>
            <ToggleGroupItem value="7d">Oxirgi 7 kun</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Oxirgi 3 oy" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Oxirgi 3 oy
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Oxirgi 30 kun
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Oxirgi 7 kun
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
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
                return date.toLocaleDateString("en-US", {
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
                    return new Date(value).toLocaleDateString("en-US", {
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
