"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";

type DebtorsTableFiltersProps = {
  isMobile: boolean;
  statusValue: string;
  onStatusChange: (status: string) => void;
};

export function DebtorsTableFilters({ isMobile, statusValue, onStatusChange }: DebtorsTableFiltersProps) {
  const t = useTranslations();
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");

  const labels = {
    all: tCommon("all"),
    debtor: tDashboard("statusDebtor"),
    expired: tDashboard("statusExpired"),
    overLimit: tDashboard("statusOverLimit"),
    paid: tDashboard("statusPaid"),
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {isMobile ? (
        <Select value={statusValue} onValueChange={onStatusChange}>
          <SelectTrigger className="!h-12 w-[140px] sm:w-[180px]">
            <SelectValue placeholder={t("dashboard.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{labels.all}</SelectItem>
            <SelectItem value="qarzdor">{labels.debtor}</SelectItem>
            <SelectItem value="muddati_otgan">{labels.expired}</SelectItem>
            <SelectItem value="limitdan_oshgan">{labels.overLimit}</SelectItem>
            <SelectItem value="tolangan">{labels.paid}</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Tabs value={statusValue} onValueChange={onStatusChange}>
          <TabsList className="grid h-12 w-full grid-cols-2 sm:grid-cols-5">
            <TabsTrigger value="all">{labels.all}</TabsTrigger>
            <TabsTrigger value="qarzdor">{labels.debtor}</TabsTrigger>
            <TabsTrigger value="muddati_otgan">{labels.expired}</TabsTrigger>
            <TabsTrigger value="limitdan_oshgan" className="text-xs sm:text-sm">
              {labels.overLimit}
            </TabsTrigger>
            <TabsTrigger value="tolangan">{labels.paid}</TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </div>
  );
}
