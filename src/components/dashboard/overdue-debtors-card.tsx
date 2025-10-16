"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OverdueDebtor {
  id: number;
  first_name: string;
  last_name: string;
  total_debt: number;
  last_payment_date: Date | null;
  created_at: Date;
}

interface OverdueDebtorsCardProps {
  debtors: OverdueDebtor[];
}

export function OverdueDebtorsCard({ debtors }: OverdueDebtorsCardProps) {
  const router = useRouter();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("uz-UZ").format(amount) + " so'm";
  };

  const getDaysSinceLastPayment = (lastPaymentDate: Date | null, createdAt: Date) => {
    const referenceDate = lastPaymentDate || createdAt;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - new Date(referenceDate).getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (debtors.length === 0) {
    return null;
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Muddati o&apos;tgan to&apos;lovlar ({debtors.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {debtors.slice(0, 5).map((debtor) => (
            <div
              key={debtor.id}
              className="hover:bg-muted flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors"
              onClick={() => router.push(`/dashboard/default/debitor/${debtor.id}`)}
            >
              <div className="flex-1">
                <p className="font-medium">
                  {debtor.first_name} {debtor.last_name}
                </p>
                <p className="text-muted-foreground text-sm">
                  {getDaysSinceLastPayment(debtor.last_payment_date, debtor.created_at)} kun to&apos;lov yo&apos;q
                </p>
              </div>
              <div className="text-right">
                <p className="text-destructive font-semibold">{formatCurrency(debtor.total_debt)}</p>
                <Badge variant="destructive" className="mt-1 text-xs">
                  Muddati o&apos;tgan
                </Badge>
              </div>
            </div>
          ))}
          {debtors.length > 5 && (
            <p className="text-muted-foreground text-center text-sm">va yana {debtors.length - 5} ta...</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
