"use client";

import type { Table } from "@tanstack/react-table";
import { Search, Trash2, FileDown, Download, Upload } from "lucide-react";
import { useTranslations } from "next-intl";

import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DebtorView } from "@/types/view";

type DebtorsTableToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  isSearching: boolean;
  selectedCount: number;
  onBulkDelete: () => void;
  onImportClick: () => void;
  onExportDialogClick: () => void;
  onExcelExport: () => void;
  table?: Table<DebtorView>;
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
  table,
}: DebtorsTableToolbarProps) {
  const translate = useTranslations();

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 items-center justify-between gap-2">
        <div className="relative flex-1 lg:max-w-xl">
          <Search className="text-muted-foreground absolute top-4 left-2.5 h-4 w-4" />
          <Input
            placeholder={translate("home.searchPlaceholder")}
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
            <Button variant="destructive" size="sm" onClick={onBulkDelete} className="hidden h-14 md:flex">
              <Trash2 className="mr-2 h-4 w-4" />
              {translate("common.delete")} ({selectedCount})
            </Button>
          )}
          {table ? <DataTableViewOptions table={table} /> : null}
          <Button variant="outline" className="h-14 gap-2" size="sm" onClick={onImportClick}>
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button variant="outline" className="h-14 gap-2" size="sm" onClick={onExportDialogClick}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button
            variant="outline"
            className="h-14 w-12 gap-2 bg-blue-500 text-white sm:w-auto dark:bg-blue-600"
            size="sm"
            onClick={onExcelExport}
          >
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">Excel</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
