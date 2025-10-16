"use client";

import * as React from "react";
import { TrendingDown, TrendingUp, AlertCircle, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface RiskAnalysisProps {
  totalDebtors: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  overdueCount: number;
  debtLimit: number;
}

export function RiskAnalysisCard({
  totalDebtors,
  highRiskCount,
  mediumRiskCount,
  lowRiskCount,
  overdueCount,
}: RiskAnalysisProps) {
  const highRiskPercentage = totalDebtors > 0 ? (highRiskCount / totalDebtors) * 100 : 0;
  const mediumRiskPercentage = totalDebtors > 0 ? (mediumRiskCount / totalDebtors) * 100 : 0;
  const lowRiskPercentage = totalDebtors > 0 ? (lowRiskCount / totalDebtors) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Risk Tahlili
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Debtors */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="text-muted-foreground h-4 w-4" />
            <span className="text-sm font-medium">Jami qarzdorlar</span>
          </div>
          <span className="text-2xl font-bold">{totalDebtors}</span>
        </div>

        {/* High Risk */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-destructive h-4 w-4" />
              <span className="text-sm font-medium">Yuqori risk (Limitdan oshgan)</span>
            </div>
            <span className="text-destructive text-sm font-semibold">
              {highRiskCount} ({highRiskPercentage.toFixed(1)}%)
            </span>
          </div>
          <Progress value={highRiskPercentage} className="bg-destructive/20 h-2" indicatorClassName="bg-destructive" />
        </div>

        {/* Overdue */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Muddati o&apos;tgan</span>
            </div>
            <span className="text-sm font-semibold text-orange-500">
              {overdueCount} ({totalDebtors > 0 ? ((overdueCount / totalDebtors) * 100).toFixed(1) : 0}%)
            </span>
          </div>
          <Progress
            value={totalDebtors > 0 ? (overdueCount / totalDebtors) * 100 : 0}
            className="h-2 bg-orange-500/20"
            indicatorClassName="bg-orange-500"
          />
        </div>

        {/* Medium Risk */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">O&apos;rta risk (Qarzdor)</span>
            </div>
            <span className="text-sm font-semibold text-yellow-600">
              {mediumRiskCount} ({mediumRiskPercentage.toFixed(1)}%)
            </span>
          </div>
          <Progress value={mediumRiskPercentage} className="h-2 bg-yellow-500/20" indicatorClassName="bg-yellow-500" />
        </div>

        {/* Low Risk */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Past risk (To&apos;langan)</span>
            </div>
            <span className="text-sm font-semibold text-green-600">
              {lowRiskCount} ({lowRiskPercentage.toFixed(1)}%)
            </span>
          </div>
          <Progress value={lowRiskPercentage} className="h-2 bg-green-500/20" indicatorClassName="bg-green-500" />
        </div>
      </CardContent>
    </Card>
  );
}
