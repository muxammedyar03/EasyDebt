"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DebtorView } from "@/types/view";

type UseDashboardDebtorsTableParams = {
  data: DebtorView[];
  columns: ColumnDef<DebtorView>[];
  onDeleteDebtor: (debtorId: number) => void | Promise<void>;
  /** When set, search is server-driven (no client-side filter). */
  serverSearch?: { value: string; setValue: (v: string) => void };
};

// Cache - debtor uchun searchable text bir marta yaratiladi
const searchCache = new WeakMap<DebtorView, { text: string; phone: string }>();

function getSearchableData(debtor: DebtorView) {
  let cached = searchCache.get(debtor);
  if (!cached) {
    cached = {
      text: `${debtor.firstName} ${debtor.lastName} ${debtor.address || ""} ${debtor.fullName || ""}`.toLowerCase(),
      phone: (debtor.phoneNumber || "").replace(/\D/g, ""),
    };
    searchCache.set(debtor, cached);
  }
  return cached;
}

/**
 * Optimized multi-term search filter
 * - WeakMap cache bilan tezroq ishlaydi
 * - Telefon raqamini formatdan qat'iy nazar qidiradi
 */
function filterDebtors(data: DebtorView[], searchQuery: string): DebtorView[] {
  const trimmed = searchQuery.trim();
  if (!trimmed) return data;

  const searchTerms = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  if (searchTerms.length === 0) return data;

  // Qidiruv terminlarini oldindan tayyorlash
  const preparedTerms = searchTerms.map((term) => ({
    term,
    digits: term.replace(/\D/g, ""),
  }));

  return data.filter((debtor) => {
    const { text, phone } = getSearchableData(debtor);

    return preparedTerms.every(({ term, digits }) => {
      // Telefon raqamida qidirish (raqam bo'lsa)
      if (digits && phone.includes(digits)) return true;
      // Matnda qidirish
      return text.includes(term);
    });
  });
}

export function useDashboardDebtorsTable({
  data,
  columns,
  onDeleteDebtor,
  serverSearch,
}: UseDashboardDebtorsTableParams) {
  const [internalFilter, setInternalFilter] = React.useState("");
  const globalFilter = serverSearch?.value ?? internalFilter;
  const setGlobalFilter = serverSearch?.setValue ?? setInternalFilter;

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
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

  const deferredFilter = React.useDeferredValue(globalFilter);

  // Server qidiruv bo'lsa data allaqachon filterlangan; client filter ishlatmaymiz
  const filteredData = React.useMemo(
    () => (serverSearch ? data : filterDebtors(data, deferredFilter)),
    [data, deferredFilter, serverSearch],
  );

  const isSearching = globalFilter !== deferredFilter;

  // Table filterlangan data bilan ishlaydi
  const table = useDataTableInstance({
    data: filteredData, // ✅ Filterlangan data
    columns,
    getRowId: (row) => row.id.toString(),
    defaultPageSize: 10,
    initialColumnVisibility: {
      phoneNumber: false,
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
    isSearching,
  };
}
