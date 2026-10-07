"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface AuditLogFiltersProps {
  isMobile?: boolean;
}

const ACTION_VALUES = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "EXPORT",
  "IMPORT",
  "DEBT_ADDED",
  "PAYMENT_ADDED",
  "DEBT_UPDATED",
  "PAYMENT_UPDATED",
  "UNDO",
  "CANCEL",
] as const;

const ENTITY_TYPE_VALUES = [
  "DEBTOR",
  "DEBT",
  "PAYMENT",
  "USER",
  "SETTINGS",
  "PAYMENT_REMINDER",
  "COMPANY",
  "COMPANY_DEBT",
  "COMPANY_PAYMENT",
  "COMPANY_PAYMENT_RECEIPT",
] as const;

type AuditLogFilterContentProps = {
  dateFrom: string;
  dateTo: string;
  selectedActions: string[];
  selectedEntityTypes: string[];
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onActionToggle: (action: string) => void;
  onEntityTypeToggle: (entityType: string) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
};

function AuditLogFilterContent({
  dateFrom,
  dateTo,
  selectedActions,
  selectedEntityTypes,
  onDateFromChange,
  onDateToChange,
  onActionToggle,
  onEntityTypeToggle,
  onApplyFilters,
  onClearFilters,
}: AuditLogFilterContentProps) {
  const t = useTranslations("audit");
  const tCommon = useTranslations("common");

  const actionOptions = React.useMemo(
    () =>
      ACTION_VALUES.map((value) => ({
        value,
        label: t(
          (
            {
              CREATE: "actionCreate",
              UPDATE: "actionUpdate",
              DELETE: "actionDelete",
              LOGIN: "actionLogin",
              LOGOUT: "actionLogout",
              EXPORT: "actionExport",
              IMPORT: "actionImport",
              DEBT_ADDED: "actionDebtAdded",
              PAYMENT_ADDED: "actionPaymentAdded",
              DEBT_UPDATED: "actionDebtUpdated",
              PAYMENT_UPDATED: "actionPaymentUpdated",
              UNDO: "actionUndo",
              CANCEL: "actionCancel",
            } as const
          )[value],
        ),
      })),
    [t],
  );

  const entityTypeOptions = React.useMemo(
    () =>
      ENTITY_TYPE_VALUES.map((value) => ({
        value,
        label: t(
          (
            {
              DEBTOR: "entityDebtor",
              DEBT: "entityDebt",
              PAYMENT: "entityPayment",
              USER: "entityUser",
              SETTINGS: "entitySettings",
              PAYMENT_REMINDER: "entityPaymentReminder",
              COMPANY: "entityCompany",
              COMPANY_DEBT: "entityCompanyDebt",
              COMPANY_PAYMENT: "entityCompanyPayment",
              COMPANY_PAYMENT_RECEIPT: "entityCompanyPaymentReceipt",
            } as const
          )[value],
        ),
      })),
    [t],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="dateFrom">{t("dateFrom")}</Label>
        <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="dateTo">{t("dateTo")}</Label>
        <Input id="dateTo" type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />
      </div>

      <div className="space-y-3">
        <Label>{t("actionType")}</Label>
        <div className="border-border h-32 overflow-y-scroll rounded-md border">
          {actionOptions.map((action) => (
            <div key={action.value} className="flex h-8 items-center space-x-2 border-b px-2">
              <Checkbox
                id={`action-${action.value}`}
                checked={selectedActions.includes(action.value)}
                onCheckedChange={() => onActionToggle(action.value)}
              />
              <label
                htmlFor={`action-${action.value}`}
                className="cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {action.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label>{t("entityType")}</Label>
        <div className="border-border h-32 overflow-y-scroll rounded-md border">
          {entityTypeOptions.map((entityType) => (
            <div key={entityType.value} className="flex h-8 items-center space-x-2 border-b px-2">
              <Checkbox
                id={`entity-${entityType.value}`}
                checked={selectedEntityTypes.includes(entityType.value)}
                onCheckedChange={() => onEntityTypeToggle(entityType.value)}
              />
              <label
                htmlFor={`entity-${entityType.value}`}
                className="cursor-pointer text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {entityType.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <Button onClick={onApplyFilters} className="w-full">
          {tCommon("applyFilters")}
        </Button>
        <Button onClick={onClearFilters} variant="outline" className="w-full">
          <X className="mr-2 h-4 w-4" />
          {tCommon("clearFilters")}
        </Button>
      </div>
    </div>
  );
}

export function AuditLogFilters({ isMobile = false }: AuditLogFiltersProps) {
  const tCommon = useTranslations("common");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);

  const [dateFrom, setDateFrom] = React.useState(searchParams?.get("dateFrom") || "");
  const [dateTo, setDateTo] = React.useState(searchParams?.get("dateTo") || "");

  const [selectedActions, setSelectedActions] = React.useState<string[]>(
    searchParams?.get("action")?.split(",").filter(Boolean) || [],
  );
  const [selectedEntityTypes, setSelectedEntityTypes] = React.useState<string[]>(
    searchParams?.get("entityType")?.split(",").filter(Boolean) || [],
  );

  const handleActionToggle = (action: string) => {
    setSelectedActions((prev) => (prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]));
  };

  const handleEntityTypeToggle = (entityType: string) => {
    setSelectedEntityTypes((prev) =>
      prev.includes(entityType) ? prev.filter((e) => e !== entityType) : [...prev, entityType],
    );
  };

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    if (selectedActions.length > 0) {
      params.set("action", selectedActions.join(","));
    } else {
      params.delete("action");
    }

    if (selectedEntityTypes.length > 0) {
      params.set("entityType", selectedEntityTypes.join(","));
    } else {
      params.delete("entityType");
    }

    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    } else {
      params.delete("dateFrom");
    }

    if (dateTo) {
      params.set("dateTo", dateTo);
    } else {
      params.delete("dateTo");
    }

    params.set("page", "1");
    router.push(`?${params.toString()}`);
    if (isMobile) setOpen(false);
  };

  const handleClearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSelectedActions([]);
    setSelectedEntityTypes([]);
    router.push("/dashboard/audit-logs");
    if (isMobile) setOpen(false);
  };

  const filterContentProps: AuditLogFilterContentProps = {
    dateFrom,
    dateTo,
    selectedActions,
    selectedEntityTypes,
    onDateFromChange: setDateFrom,
    onDateToChange: setDateTo,
    onActionToggle: handleActionToggle,
    onEntityTypeToggle: handleEntityTypeToggle,
    onApplyFilters: applyFilters,
    onClearFilters: handleClearFilters,
  };

  // Mobile/Tablet - Dialog
  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="default" size="sm" className="bg-primary h-12">
            <Filter className="mr-2 h-4 w-4" />
            {tCommon("filters")}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{tCommon("filters")}</DialogTitle>
          </DialogHeader>
          <AuditLogFilterContent {...filterContentProps} />
        </DialogContent>
      </Dialog>
    );
  }

  // Desktop 2xl+ - Sidebar Card
  return (
    <Card className="p-4">
      <CardHeader className="p-0">
        <CardTitle className="flex items-center gap-2 p-0 pt-2">
          <Filter className="h-5 w-5" />
          {tCommon("filters")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <AuditLogFilterContent {...filterContentProps} />
      </CardContent>
    </Card>
  );
}
