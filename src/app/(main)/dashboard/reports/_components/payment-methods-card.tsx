"use client";

import * as React from "react";
import { Banknote, CreditCard, Smartphone } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface PaymentMethodsCardProps {
  cash: number;
  card: number;
  click: number;
  total: number;
}

export function PaymentMethodsCard({ cash, card, click, total }: PaymentMethodsCardProps) {
  const getPercentage = (amount: number) => {
    if (total === 0) return 0;
    return (amount / total) * 100;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("uz-UZ").format(amount) + " so'm";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>To&apos;lov Usullari</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Cash */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-green-500" />
                <span className="font-medium">Naqd</span>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatCurrency(cash)}</p>
                <p className="text-muted-foreground text-xs">{getPercentage(cash).toFixed(1)}%</p>
              </div>
            </div>
            <Progress value={getPercentage(cash)} indicatorClassName="bg-green-500" />
          </div>

          {/* Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-500" />
                <span className="font-medium">Karta</span>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatCurrency(card)}</p>
                <p className="text-muted-foreground text-xs">{getPercentage(card).toFixed(1)}%</p>
              </div>
            </div>
            <Progress value={getPercentage(card)} indicatorClassName="bg-blue-500" />
          </div>

          {/* Click */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-purple-500" />
                <span className="font-medium">Click</span>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatCurrency(click)}</p>
                <p className="text-muted-foreground text-xs">{getPercentage(click).toFixed(1)}%</p>
              </div>
            </div>
            <Progress value={getPercentage(click)} indicatorClassName="bg-purple-500" />
          </div>

          {/* Total */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Jami</span>
              <span className="text-xl font-bold">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
