"use client";

import { useState } from "react";
import { Users, TrendingUp, TrendingDown } from "lucide-react";

import { SectionCard } from "../../_components/section-card";

interface SectionCardsProps {
  stats: {
    totalDebtors: number;
    totalDebt: number;
    totalDebtsCount: number;
    totalDebtsAmount: number;
    totalPaymentsCount: number;
    totalPaymentsAmount: number;
    todayDebtsCount: number;
    todayDebtsAmount: number;
    todayPaymentsCount: number;
    todayPaymentsAmount: number;
  };
}

export function SectionCards({ stats }: SectionCardsProps) {
  const [visibleCards, setVisibleCards] = useState({
    totalDebt: false,
    todayPayments: false,
    todayDebts: false,
  });

  const toggleVisibility = (cardKey: keyof typeof visibleCards) => {
    setVisibleCards((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey],
    }));
  };

  const maskAmount = (amount: number, isVisible: boolean) => {
    if (isVisible) {
      return amount.toLocaleString();
    }
    return "*******";
  };

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <SectionCard
        title="Ja'mi qarzdorlar"
        count={stats.totalDebtors}
        icon={<Users className="size-4" />}
        titleFooter={"Umumiy qarzdorlar soni"}
        description="Tizimda ro'yxatdan o'tgan"
      />

      <SectionCard
        title="Umumiy qarz"
        amount={stats.totalDebt}
        isHide
        icon={<TrendingUp className="size-4" />}
        description={`${stats.totalDebtsCount} ta qarz yozuvi`}
      />

      <SectionCard
        title="Bugungi to'lovlar"
        amount={stats.todayPaymentsAmount}
        isHide
        defaultVisible
        icon={<TrendingUp className="size-4" />}
        titleFooter={"Bugun to&apos;langan qarzlar"}
        description={`${stats.todayPaymentsCount} ta to&apos;lov`}
      />

      <SectionCard
        title="Bugungi qarzlar"
        amount={stats.todayDebtsAmount}
        isHide
        defaultVisible
        icon={<TrendingDown className="size-4" />}
        titleFooter={"Bugungi qarzlar"}
        description={`${stats.todayDebtsCount} ta qarz`}
      />
    </div>
  );
}
