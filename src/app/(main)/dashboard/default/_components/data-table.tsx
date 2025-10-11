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

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-center gap-2">
        <Input
          type="text"
          className="h-12 w-full xl:w-1/2"
          placeholder="Ism telefon va address boyicha qidirish"
          onChange={(e) => table.setGlobalFilter(e.target.value)}
        />
        <DataTableViewOptions table={table} />
        <Button variant="outline" size="sm" className="h-12 w-12 lg:w-auto" onClick={() => setIsDialogOpen(true)}>
          <Plus />
          <span className="hidden lg:inline">Qarzdor qo&apos;shish</span>
        </Button>
      </div>
      <DataTableNew
        dndEnabled
        table={table}
        columns={columns}
        onReorder={setData}
        onRowClick={(row) => router.push(`/dashboard/default/debitor/${row.id}`)}
      />
      <AddDebtorDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onSuccess={handleDebtorAdded} />
    </div>
  );
}
