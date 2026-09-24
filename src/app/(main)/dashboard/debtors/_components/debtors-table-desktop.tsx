"use client";

import type { ColumnDef, Table as TanStackTable } from "@tanstack/react-table";

import { DataTable } from "@/components/data-table/data-table";
import type { DebtorView } from "@/types/view";

type DebtorsTableDesktopProps = {
  table: TanStackTable<DebtorView>;
  columns: ColumnDef<DebtorView>[];
};

export function DebtorsTableDesktop({ table, columns }: DebtorsTableDesktopProps) {
  return (
    <div className="hidden rounded-md border lg:block">
      <DataTable dndEnabled={false} table={table} columns={columns} />
    </div>
  );
}
