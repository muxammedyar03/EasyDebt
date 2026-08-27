"use client";

import { FileDown, FilterIcon, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportCompaniesListToExcel } from "@/lib/companies/export-companies-excel-client";
import { getErrorMessage } from "@/lib/errors";
import { useState } from "react";

type CompaniesToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  isSearching: boolean;
  status: string;
  sortBy: string;
  dateFrom: string;
  dateTo: string;
  minAmount: string;
  maxAmount: string;
  onStatusChange: (status: string) => void;
  onSortChange: (sortBy: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onMinAmountChange: (value: string) => void;
  onMaxAmountChange: (value: string) => void;
  onAddCompany: () => void;
};

export function CompaniesToolbar({
  searchValue,
  onSearchChange,
  isSearching,
  status,
  sortBy,
  dateFrom,
  dateTo,
  minAmount,
  maxAmount,
  onStatusChange,
  onSortChange,
  onDateFromChange,
  onDateToChange,
  onMinAmountChange,
  onMaxAmountChange,
  onAddCompany,
}: CompaniesToolbarProps) {
  const t = useTranslations("myDebts");
  const tCommon = useTranslations("common");
  const tExport = useTranslations("dataExport");
  const [showFilter, setShowFilter] = useState(false);

  const handleExcel = async () => {
    try {
      const { rowCount } = await exportCompaniesListToExcel({
        search: searchValue,
        status,
        headers: [
          tExport("companyHeaderId"),
          tExport("companyHeaderName"),
          tExport("companyHeaderContact"),
          tExport("companyHeaderPhone"),
          tExport("companyHeaderAddress"),
          tExport("companyHeaderTotalDebt"),
          tExport("companyHeaderTotalPayments"),
          tExport("companyHeaderStatus"),
        ],
      });
      toast.success(t("exportSuccess", { count: rowCount }));
    } catch (error) {
      toast.error(getErrorMessage(error, t("exportError")));
    }
  };

  const toggleFilter = () => {
    setShowFilter(!showFilter);
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 lg:max-w-xl">
          <Search className="text-muted-foreground absolute top-3.5 left-2.5 h-4 w-4" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="border-border h-11 border bg-white pr-10 pl-8 dark:bg-zinc-800"
          />
          {isSearching && (
            <div className="absolute top-1/2 right-3 -translate-y-1/2">
              <div className="border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-11" onClick={handleExcel}>
            <FileDown className="mr-2 h-4 w-4" />
            {tCommon("excel")}
          </Button>
          <Button className="h-11" onClick={onAddCompany}>
            <Plus className="mr-2 h-4 w-4" />
            {t("addCompany")}
          </Button>
          <Button className="h-11 w-11" onClick={toggleFilter}>
            <FilterIcon />
          </Button>
        </div>
      </div>

      {showFilter && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="grid gap-1.5">
            <Label className="text-xs">{tCommon("status")}</Label>
            <Select value={status} onValueChange={onStatusChange}>
              <SelectTrigger className="border-border h-10 w-full border">
                <SelectValue placeholder={tCommon("status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tCommon("all")}</SelectItem>
                <SelectItem value="qarzdor">{t("statusDebtor")}</SelectItem>
                <SelectItem value="tolangan">{t("statusPaid")}</SelectItem>
                <SelectItem value="muddati_otgan">{t("statusOverdue")}</SelectItem>
                <SelectItem value="limitdan_otgan">{t("statusOverLimit")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">{t("sort")}</Label>
            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="border-border h-10 w-full border">
                <SelectValue placeholder={t("sort")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">{t("sortName")}</SelectItem>
                <SelectItem value="amount">{t("sortAmount")}</SelectItem>
                <SelectItem value="debt_added_at">{t("sortDebtAdded")}</SelectItem>
                <SelectItem value="paid_at">{t("sortPaidAt")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs">{t("dateFrom")}</Label>
            <Input
              type="date"
              className="border-border h-10 border"
              value={dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">{t("dateTo")}</Label>
            <Input
              type="date"
              className="border-border h-10 border"
              value={dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">{t("minAmount")}</Label>
            <Input
              type="number"
              className="border-border h-10 border"
              placeholder="0"
              value={minAmount}
              onChange={(e) => onMinAmountChange(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">{t("maxAmount")}</Label>
            <Input
              type="number"
              className="border-border h-10 border"
              placeholder="—"
              value={maxAmount}
              onChange={(e) => onMaxAmountChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
