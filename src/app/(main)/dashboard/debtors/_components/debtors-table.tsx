"use client";

/**
 * Qarzdorlar ro'yxati — container.
 * URL boshqaruvi: hooks/use-debtors-table-url.ts
 * Mutatsiya / Excel: @/lib/debtors
 * Jadval UI: debtors-table-desktop.tsx, toolbar, filters, pagination
 */

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { DebtorCard } from "@/components/mobile/debtor-card";
import { Checkbox } from "@/components/ui/checkbox";
import { QuickAddDebt } from "@/features/create-debt/ui";
import { QuickAddPayment } from "@/features/make-payment/ui";
import { invalidateRecentAuditActions } from "@/features/audit-log";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { useIsMobile } from "@/hooks/use-mobile";
import { bulkDeleteDebtors, deleteDebtorById, exportDebtorsListToExcel } from "@/lib/debtors";
import type { DebtorView } from "@/types/view";

import { createDashboardColumns } from "../../default/_components/columns";
import { useDebtorsTableUrl } from "./hooks/use-debtors-table-url";
import { DebtorsTableDesktop } from "./debtors-table-desktop";
import { DebtorsTableFilters } from "./debtors-table-filters";
import { DebtorsTablePagination } from "./debtors-table-pagination";
import { DebtorsTableToolbar } from "./debtors-table-toolbar";
import { ExportImportDialog } from "./export-import-dialog";

interface DebtorsTableProps {
  debtors: DebtorView[];
  totalPages: number;
  currentPage: number;
  debtLimit: number;
}

const selectColumn: ColumnDef<DebtorView> = {
  id: "select",
  header: ({ table }) => (
    <div className="flex items-center justify-center">
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    </div>
  ),
  cell: ({ row }: { row: Row<DebtorView> }) => (
    <div className="flex items-center justify-center">
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    </div>
  ),
  enableSorting: false,
  enableHiding: false,
};

export function DebtorsTable({ debtors, totalPages, currentPage, debtLimit }: DebtorsTableProps) {
  const translate = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { searchParams, searchValue, setSearchValue, isSearching, handleStatusFilter, handlePageChange } =
    useDebtorsTableUrl();

  const [quickDebtDialog, setQuickDebtDialog] = React.useState<{ open: boolean; debtorId: number; debtorName: string }>(
    { open: false, debtorId: 0, debtorName: "" },
  );
  const [quickPaymentDialog, setQuickPaymentDialog] = React.useState<{
    open: boolean;
    debtorId: number;
    debtorName: string;
    totalDebt: number;
  }>({ open: false, debtorId: 0, debtorName: "", totalDebt: 0 });
  const [exportDialog, setExportDialog] = React.useState(false);
  const [importDialog, setImportDialog] = React.useState(false);

  const refresh = React.useCallback(() => {
    void invalidateRecentAuditActions(queryClient);
    router.refresh();
  }, [queryClient, router]);

  const columns = React.useMemo(
    () => [selectColumn, ...createDashboardColumns({ debtLimit, onDataChange: refresh })],
    [debtLimit, refresh],
  );

  const table = useDataTableInstance({
    data: debtors,
    columns,
    getRowId: (row) => row.id.toString(),
    manualPagination: true,
    initialColumnVisibility: {
      phoneNumber: false,
      address: false,
    },
  });

  const selectedIds = React.useMemo(
    () => table.getFilteredSelectedRowModel().rows.map((row) => row.original.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rowSelection drives selection
    [table.getState().rowSelection, debtors],
  );

  const handleBulkDelete = React.useCallback(async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(translate("debtorsPage.confirmBulkDelete", { count: selectedIds.length }))) return;
    try {
      const ok = await bulkDeleteDebtors(selectedIds);
      if (ok) {
        table.resetRowSelection();
        refresh();
      }
    } catch (error) {
      console.error("Error deleting debtors:", error);
    }
  }, [selectedIds, refresh, translate, table]);

  const handleDelete = React.useCallback(
    async (id: number) => {
      if (!confirm(translate("debtorsPage.confirmDelete"))) return;
      try {
        const ok = await deleteDebtorById(id);
        if (ok) refresh();
      } catch (error) {
        console.error("Error deleting debtor:", error);
      }
    },
    [refresh, translate],
  );

  const handleExcelExport = React.useCallback(async () => {
    try {
      toast.loading(translate("common.exportPreparing"));
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      const search = params.get("search") || "";
      const status = params.get("status") || "all";
      const { rowCount } = await exportDebtorsListToExcel({
        search,
        status,
        headers: [
          translate("dataExport.debtorHeaderId"),
          translate("dataExport.debtorHeaderFirstName"),
          translate("dataExport.debtorHeaderLastName"),
          translate("dataExport.debtorHeaderPhone"),
          translate("dataExport.debtorHeaderAddress"),
          translate("dataExport.debtorHeaderTotalDebt"),
          translate("dataExport.debtorHeaderTotalPayments"),
        ],
      });
      toast.dismiss();
      toast.success(translate("dataExport.exportSuccess", { count: rowCount }));
    } catch (error) {
      console.error("Export error:", error);
      toast.dismiss();
      toast.error(translate("common.exportError"));
    }
  }, [searchParams, translate]);

  const handleAddDebt = React.useCallback(
    (debtorId: number) => {
      const debtor = debtors.find((d) => d.id === debtorId);
      if (debtor) {
        setQuickDebtDialog({
          open: true,
          debtorId,
          debtorName: `${debtor.firstName} ${debtor.lastName}`,
        });
      }
    },
    [debtors],
  );

  const handleAddPayment = React.useCallback(
    (debtorId: number) => {
      const debtor = debtors.find((d) => d.id === debtorId);
      if (debtor) {
        setQuickPaymentDialog({
          open: true,
          debtorId,
          debtorName: `${debtor.firstName} ${debtor.lastName}`,
          totalDebt: debtor.totalDebt,
        });
      }
    },
    [debtors],
  );

  const statusFilter = searchParams?.get("status") || "all";

  return (
    <>
      <div className="space-y-4">
        <DebtorsTableToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          isSearching={isSearching}
          selectedCount={selectedIds.length}
          onBulkDelete={() => void handleBulkDelete()}
          onImportClick={() => setImportDialog(true)}
          onExportDialogClick={() => setExportDialog(true)}
          onExcelExport={() => void handleExcelExport()}
          table={table}
        />

        <DebtorsTableFilters isMobile={isMobile} statusValue={statusFilter} onStatusChange={handleStatusFilter} />

        <DebtorsTablePagination
          className="md:hidden"
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />

        <div className="grid gap-4 lg:hidden">
          {debtors.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">{translate("common.noData")}</div>
          ) : (
            debtors.map((debtor) => (
              <DebtorCard
                key={debtor.id}
                debtor={debtor}
                debtLimit={debtLimit}
                onAddDebt={handleAddDebt}
                onAddPayment={handleAddPayment}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        <DebtorsTableDesktop table={table} columns={columns} />

        <DebtorsTablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
      </div>

      <QuickAddDebt
        open={quickDebtDialog.open}
        onOpenChange={(open) => setQuickDebtDialog({ ...quickDebtDialog, open })}
        debtorId={quickDebtDialog.debtorId}
        debtorName={quickDebtDialog.debtorName}
        onSuccess={refresh}
      />

      <QuickAddPayment
        open={quickPaymentDialog.open}
        onOpenChange={(open) => setQuickPaymentDialog({ ...quickPaymentDialog, open })}
        debtorId={quickPaymentDialog.debtorId}
        debtorName={quickPaymentDialog.debtorName}
        totalDebt={quickPaymentDialog.totalDebt}
        onSuccess={refresh}
      />

      <ExportImportDialog open={exportDialog} onOpenChange={setExportDialog} mode="export" />
      <ExportImportDialog open={importDialog} onOpenChange={setImportDialog} mode="import" />
    </>
  );
}
