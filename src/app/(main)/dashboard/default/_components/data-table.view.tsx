"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable as DataTableNew } from "../../../../../components/data-table/data-table";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { AddDebtorDialog } from "@/features/create-debtor/ui";
import { Input } from "@/components/ui/input";
import { DebtorCard } from "@/components/mobile/debtor-card";
import { QuickAddDebt } from "@/features/create-debt/ui";
import { QuickAddPayment } from "@/features/make-payment/ui";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDashboardDebtorsTable } from "./use-dashboard-debtors-table";
import { DebtorView } from "@/types/view";

type DataTableViewProps = {
  data: DebtorView[];
  debtLimit: number;
  columns: ColumnDef<DebtorView>[];
  onReorder: (rows: DebtorView[]) => void;
  onDeleteDebtor: (debtorId: number) => void | Promise<void>;
  onRefresh: () => void | Promise<void>;
};

/**
 * Dumb/presentational component.
 *
 * - Renders UI only
 * - Owns local UI state (filters, dialogs)
 * - Receives data and callbacks from the container
 * - Does NOT perform any data fetching or global mutations
 */
export function DataTableView({ data, debtLimit, columns, onReorder, onDeleteDebtor, onRefresh }: DataTableViewProps) {
  const isMobile = useIsMobile();
  const { table, state, handlers, filteredData, isSearching } = useDashboardDebtorsTable({
    data,
    columns,
    onDeleteDebtor,
  });

  const {
    isDialogOpen,
    setIsDialogOpen,
    globalFilter,
    setGlobalFilter,
    quickDebtDialog,
    setQuickDebtDialog,
    quickPaymentDialog,
    setQuickPaymentDialog,
  } = state;

  const { handleAddDebt, handleAddPayment, handleDelete } = handlers;

  return (
    <div
      className={`bg-card flex flex-col gap-y-4 rounded-xl p-4 shadow-sm ${isMobile ? "bg-card dark:bg-card rounded-xl border px-2 pb-4" : ""}`}
    >
      <div className="mt-6 mb-3 flex items-center gap-2 md:m-0">
        <div className="relative w-full xl:w-1/2">
          <Input
            type="text"
            className="border-border h-14 w-full bg-white pr-10 text-base font-medium"
            placeholder="Ism, telefon va manzil bo'yicha qidirish..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />
          {isSearching && (
            <div className="absolute top-1/2 right-3 -translate-y-1/2">
              <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          )}
        </div>
        <DataTableViewOptions table={table} />
        <Button variant="outline" size="sm" className="h-14 w-14 lg:w-auto" onClick={() => setIsDialogOpen(true)}>
          <Plus />
          <span className="hidden lg:inline">Qarzdor qo&apos;shish</span>
        </Button>
      </div>

      {/* Mobile Card View */}
      <div className="grid gap-4 md:hidden">
        {!globalFilter ? (
          <div className="text-muted-foreground py-5 text-center"></div>
        ) : filteredData.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">Ma&apos;lumot topilmadi</div>
        ) : (
          filteredData.map((debtor) => (
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

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <DataTableNew
          dndEnabled={false}
          table={table}
          columns={columns}
          onReorder={(rows) => {
            onReorder(rows);
          }}
        />
        <div className="mt-2">
          <DataTablePagination table={table} />
        </div>
      </div>

      <AddDebtorDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={() => {
          void onRefresh();
        }}
      />

      {/* Quick Add Dialogs */}
      <QuickAddDebt
        open={quickDebtDialog.open}
        onOpenChange={(open) => setQuickDebtDialog({ ...quickDebtDialog, open })}
        debtorId={quickDebtDialog.debtorId}
        debtorName={quickDebtDialog.debtorName}
        onSuccess={() => {
          void onRefresh();
        }}
      />

      <QuickAddPayment
        open={quickPaymentDialog.open}
        onOpenChange={(open) => setQuickPaymentDialog({ ...quickPaymentDialog, open })}
        debtorId={quickPaymentDialog.debtorId}
        debtorName={quickPaymentDialog.debtorName}
        totalDebt={quickPaymentDialog.totalDebt}
        onSuccess={() => {
          void onRefresh();
        }}
      />
    </div>
  );
}
