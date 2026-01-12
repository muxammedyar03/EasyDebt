"use client";

import * as React from "react";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";

import { createDashboardColumns } from "./columns";
import { debtorSchema } from "./schema";
import { DataTableView } from "./data-table.view";

const debtorArraySchema = z.array(debtorSchema);

export type DebtorRow = z.infer<typeof debtorSchema>;

type DataTableContainerProps = {
  data: DebtorRow[];
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
  const [data, setData] = React.useState<DebtorRow[]>(() => initialData);

  const refreshDebtors = React.useCallback(async () => {
    try {
      const response = await fetch("/api/debtors");
      if (!response.ok) {
        throw new Error("Failed to fetch debtors");
      }
      const json = await response.json();
      const parsed = debtorArraySchema.parse(json);
      setData(parsed);
    } catch (error) {
      console.error("Error refreshing debtors:", error);
    }
  }, []);

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

  const handleReorder = React.useCallback((rows: DebtorRow[]) => {
    setData(rows);
  }, []);

  const columns = React.useMemo<ColumnDef<DebtorRow>[]>(
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
