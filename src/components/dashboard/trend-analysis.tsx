"use client";

import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TrendData {
  label: string;
  current: number;
  previous: number;
  format?: "currency" | "number";
}

interface TrendAnalysisProps {
  trends: TrendData[];
}

export function TrendAnalysis({ trends }: TrendAnalysisProps) {
  const formatValue = (value: number, format?: "currency" | "number") => {
    if (format === "currency") {
      return new Intl.NumberFormat("uz-UZ").format(value) + " so'm";
    }
    return value.toString();
  };

  const getTrend = (current: number, previous: number) => {
    if (previous === 0) return { percentage: 0, direction: "neutral" as const };

    const percentage = ((current - previous) / previous) * 100;
    const direction = percentage > 0 ? ("up" as const) : percentage < 0 ? ("down" as const) : ("neutral" as const);

    return { percentage: Math.abs(percentage), direction };
  };

  const getTrendIcon = (direction: "up" | "down" | "neutral") => {
    switch (direction) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="text-muted-foreground h-4 w-4" />;
    }
  };

  const getTrendColor = (direction: "up" | "down" | "neutral") => {
    switch (direction) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trend Tahlili (Oylik)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {trends.map((trend) => {
            const { percentage, direction } = getTrend(trend.current, trend.previous);

            return (
              <div
                key={trend.label}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{trend.label}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{formatValue(trend.current, trend.format)}</span>
                    <div className={`flex items-center gap-1 text-sm ${getTrendColor(direction)}`}>
                      {getTrendIcon(direction)}
                      <span className="font-medium">{percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-xs">O&apos;tgan oy</p>
                  <p className="text-muted-foreground text-sm font-medium">
                    {formatValue(trend.previous, trend.format)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
