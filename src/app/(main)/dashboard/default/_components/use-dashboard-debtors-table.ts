"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DebtorView } from "@/types/view";

type UseDashboardDebtorsTableParams = {
  data: DebtorView[];
  columns: ColumnDef<DebtorView>[];
  onDeleteDebtor: (debtorId: number) => void | Promise<void>;
};

export function useDashboardDebtorsTable({ data, columns, onDeleteDebtor }: UseDashboardDebtorsTableParams) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [quickDebtDialog, setQuickDebtDialog] = React.useState<{
    open: boolean;
    debtorId: number;
    debtorName: string;
  }>({
    open: false,
    debtorId: 0,
    debtorName: "",
  });
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

  const table = useDataTableInstance({
    data,
    columns,
    getRowId: (row) => row.id.toString(),
    defaultPageSize: 10,
    initialColumnVisibility: {
      phone_number: false,
      address: false,
    },
  });

  const handleAddDebt = (debtorId: number) => {
    const debtor = data.find((d) => d.id === debtorId);
    if (debtor) {
      setQuickDebtDialog({
        open: true,
        debtorId,
        debtorName: `${debtor.firstName} ${debtor.lastName}`,
      });
    }
  };

  const handleAddPayment = (debtorId: number) => {
    const debtor = data.find((d) => d.id === debtorId);
    if (debtor) {
      setQuickPaymentDialog({
        open: true,
        debtorId,
        debtorName: `${debtor.firstName} ${debtor.lastName}`,
        totalDebt: debtor.totalDebt,
      });
    }
  };

  const handleDelete = (debtorId: number) => {
    void onDeleteDebtor(debtorId);
  };

  const filteredData = React.useMemo(() => {
    if (!globalFilter) return data;
    const lowerFilter = globalFilter.toLowerCase();
    return data.filter(
      (debtor) =>
        debtor.firstName.toLowerCase().includes(lowerFilter) ||
        debtor.lastName.toLowerCase().includes(lowerFilter) ||
        debtor.phoneNumber?.toLowerCase().includes(lowerFilter) ||
        debtor.address?.toLowerCase().includes(lowerFilter),
    );
  }, [data, globalFilter]);

  return {
    table,
    state: {
      isDialogOpen,
      setIsDialogOpen,
      globalFilter,
      setGlobalFilter,
      quickDebtDialog,
      setQuickDebtDialog,
      quickPaymentDialog,
      setQuickPaymentDialog,
    },
    handlers: {
      handleAddDebt,
      handleAddPayment,
      handleDelete,
    },
    filteredData,
  };
}
