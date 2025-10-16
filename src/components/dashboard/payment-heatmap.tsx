"use client";

import * as React from "react";
import { Calendar } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PaymentHeatmapProps {
  paymentsByDate: Map<string, number>;
}

export function PaymentHeatmap({ paymentsByDate }: PaymentHeatmapProps) {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 89); // Last 90 days

  const dates: Date[] = [];
  for (let i = 0; i < 90; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dates.push(date);
  }

  const maxAmount = Math.max(...Array.from(paymentsByDate.values()), 1);

  const getIntensity = (amount: number) => {
    if (amount === 0) return "bg-muted";
    const percentage = (amount / maxAmount) * 100;
    if (percentage < 25) return "bg-green-200 dark:bg-green-900";
    if (percentage < 50) return "bg-green-300 dark:bg-green-800";
    if (percentage < 75) return "bg-green-400 dark:bg-green-700";
    return "bg-green-500 dark:bg-green-600";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("uz-UZ").format(amount) + " so'm";
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("uz-UZ", { day: "2-digit", month: "short" });
  };

  // Group by weeks
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  dates.forEach((date, index) => {
    currentWeek.push(date);
    if (currentWeek.length === 7 || index === dates.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          To&apos;lovlar Kalendari (90 kun)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"].map((day) => (
              <div key={day} className="text-muted-foreground text-center text-xs font-medium">
                {day}
              </div>
            ))}
          </div>

          <div className="space-y-1">
            {weeks.map((week) => (
              <div key={week.toString()} className="grid grid-cols-7 gap-1 md:gap-2">
                {week.map((date) => {
                  const dateStr = date.toISOString().split("T")[0];
                  const amount = paymentsByDate.get(dateStr) || 0;
                  const intensity = getIntensity(amount);

                  return (
                    <div
                      key={date.toString()}
                      className={`group relative aspect-square rounded-sm ${intensity} hover:ring-primary transition-all hover:ring-2`}
                      title={`${formatDate(date)}: ${formatCurrency(amount)}`}
                    >
                      <div className="bg-popover text-popover-foreground absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded px-2 py-1 text-xs whitespace-nowrap shadow-md group-hover:block">
                        <div className="font-medium">{formatDate(date)}</div>
                        <div>{formatCurrency(amount)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="text-muted-foreground flex items-center justify-end gap-2 pt-4 text-xs">
            <span>Kam</span>
            <div className="flex gap-1">
              <div className="bg-muted h-3 w-3 rounded-sm" />
              <div className="h-3 w-3 rounded-sm bg-green-200 dark:bg-green-900" />
              <div className="h-3 w-3 rounded-sm bg-green-300 dark:bg-green-800" />
              <div className="h-3 w-3 rounded-sm bg-green-400 dark:bg-green-700" />
              <div className="h-3 w-3 rounded-sm bg-green-500 dark:bg-green-600" />
            </div>
            <span>Ko&apos;p</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
