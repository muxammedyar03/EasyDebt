"use client";

import { Users, TrendingUp, TrendingDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { SectionCard } from "../../_components/section-card";
import { DebtorStats } from "@/types/domain/debtor.domain";

export function SectionCards({ stats }: { stats: DebtorStats }) {
  const t = useTranslations("home");

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <SectionCard
        title={t("totalDebtors")}
        count={stats.totalDebtors}
        icon={<Users className="size-4" />}
        description={t("registeredInSystem")}
      />

      <SectionCard
        title={t("totalDebt")}
        amount={stats.totalDebt}
        isHide
        icon={<TrendingUp className="size-4" />}
        description={t("debtRecords", { count: stats.totalDebtsCount })}
      />

      <SectionCard
        title={t("todayPayments")}
        amount={stats.todayPaymentsAmount}
        isHide
        defaultVisible
        icon={<TrendingUp className="size-4" />}
        description={t("paymentCount", { count: stats.todayPaymentsCount })}
      />

      <SectionCard
        title={t("todayDebts")}
        amount={stats.todayDebtsAmount}
        isHide
        defaultVisible
        icon={<TrendingDown className="size-4" />}
        description={t("debtCount", { count: stats.todayDebtsCount })}
      />
    </div>
  );
}
