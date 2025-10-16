"use client";

import * as React from "react";

import { Plus } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { DataTable as DataTableNew } from "../../../../../components/data-table/data-table";
import { withDndColumn } from "../../../../../components/data-table/table-utils";

import { createDashboardColumns } from "./columns";
import { debtorSchema } from "./schema";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { AddDebtorDialog } from "./add-debtor-dialog";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { DebtorCard } from "@/components/mobile/debtor-card";
import { QuickAddDebt } from "@/components/mobile/quick-add-debt";
import { QuickAddPayment } from "@/components/mobile/quick-add-payment";

export function DataTable({
  data: initialData,
  debtLimit,
}: {
  data: z.infer<typeof debtorSchema>[];
  debtLimit: number;
}) {
  const router = useRouter();
  const [data, setData] = React.useState(() => initialData);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [quickDebtDialog, setQuickDebtDialog] = React.useState<{ open: boolean; debtorId: number; debtorName: string }>(
    {
      open: false,
      debtorId: 0,
      debtorName: "",
    },
  );
  const [quickPaymentDialog, setQuickPaymentDialog] = React.useState<{
    open: boolean;
    debtorId: number;
    debtorName: string;
    totalDebt: number;
  }>({
    open: false,
    debtorId: 0,
    debtorName: "",
    totalDebt: 0,
  });

  const handleDebtorAdded = React.useCallback(async () => {
    try {
      // Fetch updated debtors list
      const response = await fetch("/api/debtors");
      if (response.ok) {
        const updatedDebtors = await response.json();
        setData(updatedDebtors);
      }
    } catch (error) {
      console.error("Error refreshing debtors:", error);
    }
  }, []);

  const handleRowClick = React.useCallback(
    (debtorId: number) => {
      router.push(`/dashboard/default/debitor/${debtorId}`);
    },
    [router],
  );

  const columns = React.useMemo(
    () =>
      withDndColumn(
        createDashboardColumns({
          onDataChange: handleDebtorAdded,
          onRowClick: handleRowClick,
          debtLimit,
        }),
      ),
    [handleDebtorAdded, handleRowClick, debtLimit],
  );

  const table = useDataTableInstance({ data, columns, getRowId: (row) => row.id.toString() });

  const handleAddDebt = (debtorId: number) => {
    const debtor = data.find((d) => d.id === debtorId);
    if (debtor) {
      setQuickDebtDialog({
        open: true,
        debtorId,
        debtorName: `${debtor.first_name} ${debtor.last_name}`,
      });
    }
  };

  const handleAddPayment = (debtorId: number) => {
    const debtor = data.find((d) => d.id === debtorId);
    if (debtor) {
      setQuickPaymentDialog({
        open: true,
        debtorId,
        debtorName: `${debtor.first_name} ${debtor.last_name}`,
        totalDebt: debtor.total_debt,
      });
    }
  };

  const handleDelete = async (debtorId: number) => {
    if (!confirm("Rostdan ham o'chirmoqchimisiz?")) return;

    try {
      const response = await fetch(`/api/debtors/${debtorId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await handleDebtorAdded();
      }
    } catch (error) {
      console.error("Error deleting debtor:", error);
    }
  };

  // Filter data for mobile view
  const filteredData = React.useMemo(() => {
    if (!globalFilter) return data;
    const lowerFilter = globalFilter.toLowerCase();
    return data.filter(
      (debtor) =>
        debtor.first_name.toLowerCase().includes(lowerFilter) ||
        debtor.last_name.toLowerCase().includes(lowerFilter) ||
        debtor.phone_number?.toLowerCase().includes(lowerFilter) ||
        debtor.address?.toLowerCase().includes(lowerFilter),
    );
  }, [data, globalFilter]);

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-center gap-2">
        <Input
          type="text"
          className="h-12 w-full xl:w-1/2"
          placeholder="Ism telefon va address boyicha qidirish"
          value={globalFilter}
          onChange={(e) => {
            setGlobalFilter(e.target.value);
            table.setGlobalFilter(e.target.value);
          }}
        />
        <DataTableViewOptions table={table} />
        <Button variant="outline" size="sm" className="h-12 w-12 lg:w-auto" onClick={() => setIsDialogOpen(true)}>
          <Plus />
          <span className="hidden lg:inline">Qarzdor qo&apos;shish</span>
        </Button>
      </div>

      {/* Mobile Card View */}
      <div className="grid gap-4 md:hidden">
        {filteredData.length === 0 ? (
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
          dndEnabled
          table={table}
          columns={columns}
          onReorder={setData}
          onRowClick={(row) => router.push(`/dashboard/default/debitor/${row.id}`)}
        />
      </div>

      <AddDebtorDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onSuccess={handleDebtorAdded} />

      {/* Quick Add Dialogs */}
      <QuickAddDebt
        open={quickDebtDialog.open}
        onOpenChange={(open) => setQuickDebtDialog({ ...quickDebtDialog, open })}
        debtorId={quickDebtDialog.debtorId}
        debtorName={quickDebtDialog.debtorName}
        onSuccess={handleDebtorAdded}
      />

      <QuickAddPayment
        open={quickPaymentDialog.open}
        onOpenChange={(open) => setQuickPaymentDialog({ ...quickPaymentDialog, open })}
        debtorId={quickPaymentDialog.debtorId}
        debtorName={quickPaymentDialog.debtorName}
        totalDebt={quickPaymentDialog.totalDebt}
        onSuccess={handleDebtorAdded}
      />
    </div>
  );
}
