"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { t } from "@/lib/i18n";
import { DebtorsAdvancedFilters } from "./debtors-advanced-filters";

type DebtorsTableFiltersProps = {
  isMobile: boolean;
  statusValue: string;
  onStatusChange: (status: string) => void;
  onClearAllFilters: () => void;
  hasActiveFilters: boolean;
};

export function DebtorsTableFilters({
  isMobile,
  statusValue,
  onStatusChange,
  onClearAllFilters,
  hasActiveFilters,
}: DebtorsTableFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        {isMobile ? (
          <Select value={statusValue} onValueChange={onStatusChange}>
            <SelectTrigger className="!h-12 w-[140px] sm:w-[180px]">
              <SelectValue placeholder={t("common.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              <SelectItem value="qarzdor">{t("debtors.debtorStatus")}</SelectItem>
              <SelectItem value="muddati_otgan">{t("debtors.overdueStatus")}</SelectItem>
              <SelectItem value="limitdan_oshgan">{t("debtors.overLimit")}</SelectItem>
              <SelectItem value="tolangan">{t("debtors.paid")}</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Tabs value={statusValue} onValueChange={onStatusChange}>
            <TabsList className="grid h-12 w-full grid-cols-2 sm:grid-cols-5">
              <TabsTrigger value="all">{t("common.all")}</TabsTrigger>
              <TabsTrigger value="qarzdor">{t("debtors.debtorStatus")}</TabsTrigger>
              <TabsTrigger value="muddati_otgan">{t("debtors.overdueStatus")}</TabsTrigger>
              <TabsTrigger value="limitdan_oshgan" className="text-xs sm:text-sm">
                {t("debtors.overLimit")}
              </TabsTrigger>
              <TabsTrigger value="tolangan">{t("debtors.paid")}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>
      <div className="flex items-center gap-2">
        {hasActiveFilters && (
          <Button variant="outline" className="h-12 gap-2" onClick={onClearAllFilters}>
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">{t("debtorsTable.clearAllFilters")}</span>
          </Button>
        )}
        <DebtorsAdvancedFilters />
      </div>
    </div>
  );
}
