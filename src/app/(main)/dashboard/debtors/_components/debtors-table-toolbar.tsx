"use client";

import { Search, Trash2, FileDown, Download, Upload, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { t } from "@/lib/i18n";

type DebtorsTableToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  isSearching: boolean;
  selectedCount: number;
  onBulkDelete: () => void;
  onImportClick: () => void;
  onExportDialogClick: () => void;
  onExcelExport: () => void;
};

export function DebtorsTableToolbar({
  searchValue,
  onSearchChange,
  isSearching,
  selectedCount,
  onBulkDelete,
  onImportClick,
  onExportDialogClick,
  onExcelExport,
}: DebtorsTableToolbarProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 items-center justify-between gap-2">
        <div className="relative flex-1 lg:max-w-xl">
          <Search className="text-muted-foreground absolute top-4 left-2.5 h-4 w-4" />
          <Input
            placeholder={t("debtorsTable.searchPlaceholder")}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-12 w-full pr-10 pl-8"
          />
          {isSearching && (
            <div className="absolute top-1/2 right-3 -translate-y-1/2">
              <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <Button variant="destructive" size="sm" onClick={onBulkDelete} className="hidden md:flex">
              <Trash2 className="mr-2 h-4 w-4" />
              {t("debtorsTable.deleteSelected", { count: selectedCount })}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-12 gap-2" size="sm">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">{t("common.export")}</span>
                <ChevronDown className="h-4 w-4 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onImportClick}>
                <Upload className="mr-2 h-4 w-4" />
                {t("common.import")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportDialogClick}>
                <Download className="mr-2 h-4 w-4" />
                {t("debtorsTable.exportJson")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExcelExport}>
                <FileDown className="mr-2 h-4 w-4" />
                {t("debtorsTable.exportExcel")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
