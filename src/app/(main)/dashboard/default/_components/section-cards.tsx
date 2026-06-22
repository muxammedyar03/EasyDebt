"use client";

import { Users, TrendingUp, TrendingDown } from "lucide-react";

import { SectionCard } from "../../_components/section-card";
import { DebtorStats } from "@/types/domain/debtor.domain";
import { t } from "@/lib/i18n";

export function SectionCards({ stats }: { stats: DebtorStats }) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <SectionCard
        title={t("dashboard.totalDebtors")}
        count={stats.totalDebtors}
        icon={<Users className="size-4" />}
        description={t("dashboard.registeredInSystem")}
      />

      <SectionCard
        title={t("dashboard.totalDebt")}
        amount={stats.totalDebt}
        isHide
        icon={<TrendingUp className="size-4" />}
        description={t("dashboard.debtRecordsCount", { count: stats.totalDebtsCount })}
      />

      <SectionCard
        title={t("dashboard.todayPayments")}
        amount={stats.todayPaymentsAmount}
        isHide
        defaultVisible
        icon={<TrendingUp className="size-4" />}
        description={t("dashboard.paymentRecordsCount", { count: stats.todayPaymentsCount })}
      />

      <SectionCard
        title={t("dashboard.todayDebts")}
        amount={stats.todayDebtsAmount}
        isHide
        defaultVisible
        icon={<TrendingDown className="size-4" />}
        description={t("dashboard.todayDebtRecordsCount", { count: stats.todayDebtsCount })}
      />
    </div>
  );
}
