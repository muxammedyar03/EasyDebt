"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/i18n";
import type { DebtorListStatus } from "@/lib/debtors/debtors-list-filters";

const STATUS_OPTIONS: {
  value: DebtorListStatus;
  labelKey: "debtors.debtorStatus" | "debtors.overdueStatus" | "debtors.overLimit" | "debtors.paid";
}[] = [
  { value: "qarzdor", labelKey: "debtors.debtorStatus" },
  { value: "muddati_otgan", labelKey: "debtors.overdueStatus" },
  { value: "limitdan_oshgan", labelKey: "debtors.overLimit" },
  { value: "tolangan", labelKey: "debtors.paid" },
];

function parseStatusesFromUrl(searchParams: ReturnType<typeof useSearchParams>): DebtorListStatus[] {
  const statusesParam = searchParams?.get("statuses");
  if (statusesParam) {
    return statusesParam.split(",").filter(Boolean) as DebtorListStatus[];
  }
  const single = searchParams?.get("status");
  if (single && single !== "all") {
    return [single as DebtorListStatus];
  }
  return [];
}

export function DebtorsAdvancedFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);

  const [dateFrom, setDateFrom] = React.useState(searchParams?.get("dateFrom") || "");
  const [dateTo, setDateTo] = React.useState(searchParams?.get("dateTo") || "");
  const [minDebt, setMinDebt] = React.useState(searchParams?.get("minDebt") || "");
  const [maxDebt, setMaxDebt] = React.useState(searchParams?.get("maxDebt") || "");
  const [selectedStatuses, setSelectedStatuses] = React.useState<DebtorListStatus[]>(() =>
    parseStatusesFromUrl(searchParams),
  );

  React.useEffect(() => {
    setDateFrom(searchParams?.get("dateFrom") || "");
    setDateTo(searchParams?.get("dateTo") || "");
    setMinDebt(searchParams?.get("minDebt") || "");
    setMaxDebt(searchParams?.get("maxDebt") || "");
    setSelectedStatuses(parseStatusesFromUrl(searchParams));
  }, [searchParams]);

  const activeCount = React.useMemo(() => {
    let count = 0;
    if (searchParams?.get("dateFrom")) count++;
    if (searchParams?.get("dateTo")) count++;
    if (searchParams?.get("minDebt")) count++;
    if (searchParams?.get("maxDebt")) count++;
    if (searchParams?.get("statuses") || (searchParams?.get("status") && searchParams.get("status") !== "all")) count++;
    return count;
  }, [searchParams]);

  const toggleStatus = (status: DebtorListStatus) => {
    setSelectedStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    if (dateFrom) params.set("dateFrom", dateFrom);
    else params.delete("dateFrom");

    if (dateTo) params.set("dateTo", dateTo);
    else params.delete("dateTo");

    if (minDebt.trim()) params.set("minDebt", minDebt.replace(/\s/g, ""));
    else params.delete("minDebt");

    if (maxDebt.trim()) params.set("maxDebt", maxDebt.replace(/\s/g, ""));
    else params.delete("maxDebt");

    params.delete("status");
    if (selectedStatuses.length > 0) {
      params.set("statuses", selectedStatuses.join(","));
    } else {
      params.delete("statuses");
    }

    params.set("page", "1");
    router.push(`?${params.toString()}`);
    setOpen(false);
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setMinDebt("");
    setMaxDebt("");
    setSelectedStatuses([]);

    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("dateFrom");
    params.delete("dateTo");
    params.delete("minDebt");
    params.delete("maxDebt");
    params.delete("statuses");
    params.delete("status");
    params.set("page", "1");
    router.push(`?${params.toString()}`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-12 gap-2">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">{t("debtorsTable.advancedFilter")}</span>
          {activeCount > 0 && (
            <span className="bg-primary text-primary-foreground flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs">
              {activeCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("debtorsTable.advancedFilters")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="debtors-dateFrom">{t("debtorsTable.dateFrom")}</Label>
              <Input id="debtors-dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debtors-dateTo">{t("debtorsTable.dateTo")}</Label>
              <Input id="debtors-dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="debtors-minDebt">{t("debtorsTable.minDebt")}</Label>
              <Input
                id="debtors-minDebt"
                inputMode="numeric"
                placeholder={t("debtorsTable.minDebtPlaceholder")}
                value={minDebt}
                onChange={(e) => setMinDebt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="debtors-maxDebt">{t("debtorsTable.maxDebt")}</Label>
              <Input
                id="debtors-maxDebt"
                inputMode="numeric"
                placeholder={t("debtorsTable.maxDebtPlaceholder")}
                value={maxDebt}
                onChange={(e) => setMaxDebt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>{t("common.status")}</Label>
            <div className="border-border rounded-md border">
              {STATUS_OPTIONS.map((option) => (
                <div key={option.value} className="flex h-10 items-center space-x-2 border-b px-3 last:border-b-0">
                  <Checkbox
                    id={`debtor-status-${option.value}`}
                    checked={selectedStatuses.includes(option.value)}
                    onCheckedChange={() => toggleStatus(option.value)}
                  />
                  <label
                    htmlFor={`debtor-status-${option.value}`}
                    className="cursor-pointer text-sm leading-none font-medium"
                  >
                    {t(option.labelKey)}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={applyFilters} className="flex-1">
              {t("debtorsTable.applyFilter")}
            </Button>
            <Button onClick={clearFilters} variant="outline" className="flex-1">
              <X className="mr-2 h-4 w-4" />
              {t("debtorsTable.clearFilters")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
