import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp } from "lucide-react";

import { RiskAnalysisCard } from "@/app/(main)/dashboard/reports/_components/risk-analysis-card";
import { TrendAnalysis } from "@/app/(main)/dashboard/reports/_components/trend-analysis";

type ReportsSummarySectionProps = {
  totalDebtsAmount: number;
  totalDebtsCount: number;
  totalPaymentsAmount: number;
  totalPaymentsCount: number;
  totalDebtors: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  overdueCount: number;
  debtLimit: number;
  trends: {
    label: string;
    current: number;
    previous: number;
    format: "currency" | "number";
  }[];
};

export function ReportsSummarySection(props: ReportsSummarySectionProps) {
  const {
    totalDebtsAmount,
    totalDebtsCount,
    totalPaymentsAmount,
    totalPaymentsCount,
    totalDebtors,
    highRiskCount,
    mediumRiskCount,
    lowRiskCount,
    overdueCount,
    debtLimit,
    trends,
  } = props;

  return (
    <Suspense fallback={<div className="bg-muted h-64 animate-pulse rounded-xl border" />}>
      <p className="text-muted-foreground pb-4 pl-2">Batafsil statistika va tahlil</p>
      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-6 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs md:grid-cols-2">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Umumiy qarz</CardDescription>
            <CardTitle className="flex items-end gap-1">
              <p className="text-2xl leading-none font-semibold tabular-nums @[250px]/card:text-3xl">
                {totalDebtsAmount.toLocaleString()}
              </p>
              <span className="text-md leading-5">so&apos;m</span>
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-red-600">
                <TrendingUp className="size-4" />
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="text-muted-foreground">{totalDebtsCount} ta qarz yozuvi</div>
          </CardFooter>
        </Card>

        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Umumiy to&apos;lovlar</CardDescription>
            <CardTitle className="flex items-end gap-1">
              <p className="text-2xl leading-none font-semibold tabular-nums @[250px]/card:text-3xl">
                {totalPaymentsAmount.toLocaleString()}
              </p>
              <span className="text-md leading-5">so&apos;m</span>
            </CardTitle>
            <CardAction>
              <Badge variant="outline" className="text-green-600">
                <TrendingDown className="size-4" />
              </Badge>
            </CardAction>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="text-muted-foreground">{totalPaymentsCount} ta to&apos;lov</div>
          </CardFooter>
        </Card>
      </div>
      <div className="grid gap-6 pt-4 md:grid-cols-2">
        <RiskAnalysisCard
          totalDebtors={totalDebtors}
          highRiskCount={highRiskCount}
          mediumRiskCount={mediumRiskCount}
          lowRiskCount={lowRiskCount}
          overdueCount={overdueCount}
          debtLimit={debtLimit}
        />
        <TrendAnalysis trends={trends} />
      </div>
    </Suspense>
  );
}
