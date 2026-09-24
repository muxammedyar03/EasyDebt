import * as React from "react";

import {
  ColumnDef,
  ColumnFiltersState,
  FilterFn,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

// Custom global filter function that supports multiple search terms
const multiTermFilter: FilterFn<unknown> = (row, _columnId, filterValue: string) => {
  if (!filterValue || typeof filterValue !== "string") return true;

  const searchTerms = filterValue.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (searchTerms.length === 0) return true;

  // Get row data directly from row.original
  const rowData = row.original as Record<string, unknown>;

  // Build searchable string from all values in row data
  const searchableValues: string[] = [];
  for (const value of Object.values(rowData)) {
    if (value == null) continue;
    if (typeof value === "string") {
      searchableValues.push(value.toLowerCase());
    } else if (typeof value === "number") {
      searchableValues.push(String(value));
    }
  }

  const rowText = searchableValues.join(" ");

  // ALL terms must match somewhere (AND logic)
  return searchTerms.every((term) => rowText.includes(term));
};

type UseDataTableInstanceProps<TData extends { id: number | string }, TValue> = {
  data: TData[];
  columns: ColumnDef<TData, TValue>[];
  enableRowSelection?: boolean;
  defaultPageIndex?: number;
  defaultPageSize?: number;
  /** When true, show all rows (server/page-level pagination). */
  manualPagination?: boolean;
  getRowId?: (row: TData, index: number) => string;
  initialColumnVisibility?: VisibilityState;
};

export function useDataTableInstance<TData extends { id: number | string }, TValue>({
  data,
  columns,
  enableRowSelection = true,
  defaultPageIndex,
  defaultPageSize,
  manualPagination = false,
  getRowId,
  initialColumnVisibility = {},
}: UseDataTableInstanceProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(initialColumnVisibility);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [pagination, setPagination] = React.useState({
    pageIndex: defaultPageIndex ?? 0,
    pageSize: defaultPageSize ?? 10,
  });

  const table = useReactTable({
    data,
    columns: columns as ColumnDef<TData, TValue>[],
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      globalFilter,
      ...(manualPagination ? {} : { pagination }),
    },
    enableRowSelection,
    manualPagination,
    globalFilterFn: multiTermFilter as FilterFn<TData>,
    getRowId: getRowId ?? ((row: TData) => row.id.toString()),
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: manualPagination ? undefined : setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return table;
}
