"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { createDashboardColumns } from "./columns";
import { DataTableView } from "./data-table.view";
import { DebtorView } from "@/types/view";
import { rowToViewDebtor } from "@/lib/mappers/debtor.mapper";

type DataTableContainerProps = {
  data: DebtorView[];
  debtLimit: number;
};

/**
 * Smart container component.
 *
 * - Owns data state
 * - Handles fetching / refreshing
 * - Handles delete actions
 * - Builds table columns with business callbacks
 */
export function DataTable({ data: initialData, debtLimit }: DataTableContainerProps) {
  const [data, setData] = React.useState<DebtorView[]>(() => initialData);

  const refreshDebtors = React.useCallback(async () => {
    try {
      const response = await fetch("/api/debtors");
      if (!response.ok) {
        throw new Error("Failed to fetch debtors");
      }
      const json = await response.json();
      // API returns array directly, not wrapped in { data: [...] }
      // API already converts Decimal to number, but we need to ensure Date objects are properly handled
      const parsed = json.map(
        (debtor: {
          id: number;
          first_name: string;
          last_name: string;
          phone_number: string | null;
          address: string | null;
          total_debt: number; // Already converted to number in API
          is_overdue: boolean;
          created_at: string | Date;
          updated_at: string | Date;
          created_by: number;
        }) =>
          rowToViewDebtor(
            {
              id: debtor.id,
              first_name: debtor.first_name,
              last_name: debtor.last_name,
              phone_number: debtor.phone_number,
              address: debtor.address,
              total_debt: debtor.total_debt,
              is_overdue: debtor.is_overdue,
              created_at: typeof debtor.created_at === "string" ? new Date(debtor.created_at) : debtor.created_at,
              updated_at: typeof debtor.updated_at === "string" ? new Date(debtor.updated_at) : debtor.updated_at,
              created_by: debtor.created_by,
            },
            { debtLimit },
          ),
      );
      setData(parsed);
    } catch (error) {
      console.error("Error refreshing debtors:", error);
    }
  }, [debtLimit]);

  const handleDeleteDebtor = React.useCallback(
    async (debtorId: number) => {
      if (!confirm("Rostdan ham o'chirmoqchimisiz?")) return;

      try {
        const response = await fetch(`/api/debtors/${debtorId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Qarzdorni o'chirishda xatolik yuz berdi");
        }

        await refreshDebtors();
      } catch (error) {
        console.error("Error deleting debtor:", error);
      }
    },
    [refreshDebtors],
  );

  const handleReorder = React.useCallback((rows: DebtorView[]) => {
    setData(rows);
  }, []);

  const columns = React.useMemo<ColumnDef<DebtorView>[]>(
    () =>
      createDashboardColumns({
        onDataChange: refreshDebtors,
        debtLimit,
      }),
    [refreshDebtors, debtLimit],
  );

  return (
    <DataTableView
      data={data}
      debtLimit={debtLimit}
      columns={columns}
      onReorder={handleReorder}
      onDeleteDebtor={handleDeleteDebtor}
      onRefresh={refreshDebtors}
    />
  );
}
