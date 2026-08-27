"use client";

/**
 * Qarzdorlar ro'yxati — container.
 * URL boshqaruvi: hooks/use-debtors-table-url.ts
 * Mutatsiya / Excel: @/lib/debtors
 * Jadval UI: debtors-table-desktop.tsx, toolbar, filters, pagination
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { DebtorCard } from "@/components/mobile/debtor-card";
import { QuickAddDebt } from "@/features/create-debt/ui";
import { QuickAddPayment } from "@/features/make-payment/ui";
import { useIsMobile } from "@/hooks/use-mobile";
import { bulkDeleteDebtors, deleteDebtorById, exportDebtorsListToExcel } from "@/lib/debtors";
import { EditDebtorDialog } from "../../default/_components/edit-debtor-dialog";
import { ExportImportDialog } from "./export-import-dialog";
import { useDebtorsTableUrl } from "./hooks/use-debtors-table-url";
import { DebtorsTableDesktop } from "./debtors-table-desktop";
import { DebtorsTableFilters } from "./debtors-table-filters";
import { DebtorsTablePagination } from "./debtors-table-pagination";
import { DebtorsTableToolbar } from "./debtors-table-toolbar";
import type { DebtorView } from "@/types/view";

interface DebtorsTableProps {
  debtors: DebtorView[];
  totalPages: number;
  currentPage: number;
  debtLimit: number;
}

export function DebtorsTable({ debtors, totalPages, currentPage, debtLimit }: DebtorsTableProps) {
  const t = useTranslations("debtorsPage");
  const tCommon = useTranslations("common");
  const tExport = useTranslations("dataExport");
  const router = useRouter();
  const isMobile = useIsMobile();
  const { searchParams, searchValue, setSearchValue, isSearching, handleSort, handleStatusFilter, handlePageChange } =
    useDebtorsTableUrl();

  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [openEditDebtDialog, setOpenEditDebtDialog] = React.useState(false);
  const [selectedDebtorId, setSelectedDebtorId] = React.useState<number | null>(null);
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

  const handleSelectAll = React.useCallback(() => {
    setSelectedIds((prev) => (prev.length === debtors.length ? [] : debtors.map((d) => d.id)));
  }, [debtors]);

  const handleSelectOne = React.useCallback((id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const handleBulkDelete = React.useCallback(async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(t("confirmBulkDelete", { count: selectedIds.length }))) return;
    try {
      const ok = await bulkDeleteDebtors(selectedIds);
      if (ok) {
        setSelectedIds([]);
        router.refresh();
      }
    } catch (error) {
      console.error("Error deleting debtors:", error);
    }
  }, [selectedIds, router, t]);

  const handleDelete = React.useCallback(
    async (id: number) => {
      if (!confirm(t("confirmDelete"))) return;
      try {
        const ok = await deleteDebtorById(id);
        if (ok) router.refresh();
      } catch (error) {
        console.error("Error deleting debtor:", error);
      }
    },
    [router, t],
  );

  const handleExcelExport = React.useCallback(async () => {
    try {
      toast.loading(tCommon("exportPreparing"));
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      const search = params.get("search") || "";
      const status = params.get("status") || "all";
      const { rowCount } = await exportDebtorsListToExcel({
        search,
        status,
        headers: [
          tExport("debtorHeaderId"),
          tExport("debtorHeaderFirstName"),
          tExport("debtorHeaderLastName"),
          tExport("debtorHeaderPhone"),
          tExport("debtorHeaderAddress"),
          tExport("debtorHeaderTotalDebt"),
          tExport("debtorHeaderTotalPayments"),
        ],
      });
      toast.dismiss();
      toast.success(t("exportSuccess", { count: rowCount }));
    } catch (error) {
      console.error("Export error:", error);
      toast.dismiss();
      toast.error(tCommon("exportError"));
    }
  }, [searchParams, t, tCommon, tExport]);

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

  const navigateToDebtor = React.useCallback(
    (externalId: string) => {
      router.push(`/dashboard/default/debitor/${externalId}`);
    },
    [router],
  );

  const sortBy = searchParams?.get("sortBy") ?? null;
  const sortOrder = searchParams?.get("sortOrder") ?? null;
  const statusFilter = searchParams?.get("status") || "all";

  return (
    <>
      <div className="space-y-4">
        <DebtorsTableToolbar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          isSearching={isSearching}
          selectedCount={selectedIds.length}
          onBulkDelete={handleBulkDelete}
          onImportClick={() => setImportDialog(true)}
          onExportDialogClick={() => setExportDialog(true)}
          onExcelExport={() => void handleExcelExport()}
        />

        <DebtorsTableFilters isMobile={isMobile} statusValue={statusFilter} onStatusChange={handleStatusFilter} />

        <DebtorsTablePagination
          className="md:hidden"
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />

        <div className="grid gap-4 md:hidden">
          {debtors.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">{tCommon("noData")}</div>
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

        <DebtorsTableDesktop
          debtors={debtors}
          debtLimit={debtLimit}
          selectedIds={selectedIds}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onToggleAll={handleSelectAll}
          onToggleOne={handleSelectOne}
          onEdit={(id) => {
            setSelectedDebtorId(id);
            setOpenEditDebtDialog(true);
          }}
          onDelete={handleDelete}
          onNavigateToDebtor={navigateToDebtor}
        />

        {selectedDebtorId ? (
          <EditDebtorDialog
            debtor={debtors.find((d) => d.id === selectedDebtorId)!}
            open={openEditDebtDialog}
            onOpenChange={(open) => {
              setOpenEditDebtDialog(open);
              if (!open) setSelectedDebtorId(null);
            }}
            onSuccess={() => {
              router.refresh();
            }}
          />
        ) : null}

        <DebtorsTablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
      </div>

      <QuickAddDebt
        open={quickDebtDialog.open}
        onOpenChange={(open) => setQuickDebtDialog({ ...quickDebtDialog, open })}
        debtorId={quickDebtDialog.debtorId}
        debtorName={quickDebtDialog.debtorName}
      />

      <QuickAddPayment
        open={quickPaymentDialog.open}
        onOpenChange={(open) => setQuickPaymentDialog({ ...quickPaymentDialog, open })}
        debtorId={quickPaymentDialog.debtorId}
        debtorName={quickPaymentDialog.debtorName}
        totalDebt={quickPaymentDialog.totalDebt}
      />

      <ExportImportDialog open={exportDialog} onOpenChange={setExportDialog} mode="export" />
      <ExportImportDialog open={importDialog} onOpenChange={setImportDialog} mode="import" />
    </>
  );
}
