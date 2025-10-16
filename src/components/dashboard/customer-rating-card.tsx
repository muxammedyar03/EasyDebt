"use client";

import * as React from "react";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CustomerRatingProps {
  goodCount: number;
  averageCount: number;
  badCount: number;
  totalCount: number;
}

export function CustomerRatingCard({ goodCount, averageCount, badCount, totalCount }: CustomerRatingProps) {
  const router = useRouter();

  const getPercentage = (count: number) => {
    if (totalCount === 0) return 0;
    return ((count / totalCount) * 100).toFixed(1);
  };

  return (
    <Card className="cursor-pointer transition-all hover:shadow-lg" onClick={() => router.push("/dashboard/customers")}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Mijozlar Reytingi</span>
          <ArrowRight className="text-muted-foreground h-5 w-5" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Good Customers */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Yaxshi Mijozlar</p>
                <p className="text-muted-foreground text-xs">45 kun ichida to&apos;lagan</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">{goodCount}</p>
              <p className="text-muted-foreground text-xs">{getPercentage(goodCount)}%</p>
            </div>
          </div>

          {/* Average Customers */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Minus className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">O&apos;rtacha Mijozlar</p>
                <p className="text-muted-foreground text-xs">45-55 kun ichida to&apos;lagan</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-yellow-600">{averageCount}</p>
              <p className="text-muted-foreground text-xs">{getPercentage(averageCount)}%</p>
            </div>
          </div>

          {/* Bad Customers */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Yomon Mijozlar</p>
                <p className="text-muted-foreground text-xs">55+ kun kechiktirib to&apos;lagan</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-red-600">{badCount}</p>
              <p className="text-muted-foreground text-xs">{getPercentage(badCount)}%</p>
            </div>
          </div>
        </div>

        <Button variant="outline" className="mt-4 w-full" onClick={() => router.push("/dashboard/customers")}>
          Batafsil ko&apos;rish
        </Button>
      </CardContent>
    </Card>
  );
}
