"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Minus, Plus, Download, FileText, Printer, ChevronDown, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ViewDebtorValue } from "../model";

export interface ViewDebtorHeaderProps {
  value: ViewDebtorValue;
  onAddDebt: () => void;
  onAddPayment: () => void;
  onExport: () => Promise<void>;
  onPrintReceipt?: () => void;
  onShareProfile?: () => void;
}

export function ViewDebtorHeader({
  value,
  onAddDebt,
  onAddPayment,
  onExport,
  onPrintReceipt,
  onShareProfile,
}: ViewDebtorHeaderProps) {
  const router = useRouter();
  const t = useTranslations("debtor");
  const { debtor } = value;

  return (
    <div className="flex w-full flex-col justify-between md:flex-row md:items-center">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {debtor.firstName} {debtor.lastName}
          </h1>
          <p className="text-muted-foreground text-sm">{debtor.phoneNumber || t("noPhone")}</p>
        </div>
      </div>
      <div className="mt-5 hidden justify-end gap-2 md:mt-0 md:flex">
        {onShareProfile && (
          <Button variant="outline" className="h-9 gap-2" onClick={onShareProfile}>
            <Share2 className="h-4 w-4 text-slate-500" />
            {t("shareProfile")}
          </Button>
        )}
        <Button variant="outline" className="h-9" onClick={onAddDebt}>
          <Plus className="h-4 w-4" />
          {t("addDebt")}
        </Button>
        <Button variant="outline" className="h-9" onClick={onAddPayment}>
          <Minus className="h-4 w-4" />
          {t("addPayment")}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" className="h-9">
              <Download className="h-4 w-4" />
              {t("export")}
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={async (e) => {
                e.preventDefault();
                await onExport();
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              {t("pdfExport")}
            </DropdownMenuItem>
            {onPrintReceipt && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  onPrintReceipt();
                }}
              >
                <Printer className="mr-2 h-4 w-4" />
                {t("printReceipt")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 md:hidden">
        <Button variant="outline" className="h-9" onClick={onAddDebt}>
          <Plus className="h-4 w-4" />
          {t("debtShort")}
        </Button>
        <Button variant="outline" className="h-9" onClick={onAddPayment}>
          <Minus className="h-4 w-4" />
          {t("paymentShort")}
        </Button>
        {onShareProfile && (
          <Button variant="outline" className="h-9 gap-2" onClick={onShareProfile}>
            <Share2 className="h-4 w-4 text-slate-500" />
            {t("share")}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" className="h-9">
              <Download className="h-4 w-4" />
              {t("export")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={async (e) => {
                e.preventDefault();
                await onExport();
              }}
            >
              <FileText className="mr-2 h-4 w-4" />
              {t("pdfShort")}
            </DropdownMenuItem>
            {onPrintReceipt && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  onPrintReceipt();
                }}
              >
                <Printer className="mr-2 h-4 w-4" />
                {t("receiptShort")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
