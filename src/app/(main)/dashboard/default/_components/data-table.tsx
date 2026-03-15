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

type ApiDebtorRow = {
  id: number;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  address: string | null;
  total_debt: number;
  is_overdue: boolean;
  created_at: string | Date;
  updated_at: string | Date;
  created_by: number;
};

function parseDebtorsFromApi(json: ApiDebtorRow[], debtLimit: number): DebtorView[] {
  return json.map((debtor) =>
    rowToViewDebtor(
      {
        ...debtor,
        created_at: typeof debtor.created_at === "string" ? new Date(debtor.created_at) : debtor.created_at,
        updated_at: typeof debtor.updated_at === "string" ? new Date(debtor.updated_at) : debtor.updated_at,
      },
      { debtLimit },
    ),
  );
}

/**
 * Smart container component.
 *
 * - Owns data state
 * - Handles fetching / refreshing
 * - Search: server-side (all debtors), debounced
 * - Handles delete actions
 * - Builds table columns with business callbacks
 */
export function DataTable({ data: initialData, debtLimit }: DataTableContainerProps) {
  const [data, setData] = React.useState<DebtorView[]>(() => initialData);
  const [search, setSearch] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<DebtorView[] | null>(null);

  React.useEffect(() => {
    if (!search.trim()) setData(initialData);
  }, [initialData, search]);

  // Qidiruv ketyotganda bo'sh o'rniga avvalgi ro'yxatni ko'rsatamiz (miltillash bo'lmasin)
  const displayedData = search.trim() ? (searchResults ?? data) : data;

  const fetchDebtors = React.useCallback(
    async (searchQuery?: string) => {
      const url = searchQuery?.trim()
        ? `/api/debtors?search=${encodeURIComponent(searchQuery.trim())}`
        : "/api/debtors";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch debtors");
      const json = await response.json();
      return parseDebtorsFromApi(json, debtLimit);
    },
    [debtLimit],
  );

  const refreshDebtors = React.useCallback(async () => {
    try {
      if (search.trim()) {
        const parsed = await fetchDebtors(search);
        setSearchResults(parsed);
      } else {
        const parsed = await fetchDebtors();
        setData(parsed);
        setSearchResults(null);
      }
    } catch (error) {
      console.error("Error refreshing debtors:", error);
    }
  }, [fetchDebtors, search]);

  const [searchLoading, setSearchLoading] = React.useState(false);
  React.useEffect(() => {
    if (!search.trim()) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    void fetchDebtors(search)
      .then(
        (parsed) => {
          if (!cancelled) setSearchResults(parsed);
        },
        (err) => {
          if (!cancelled) {
            console.error("Error searching debtors:", err);
            setSearchResults([]);
          }
        },
      )
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, fetchDebtors]);

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

  const handleReorder = React.useCallback(
    (rows: DebtorView[]) => {
      if (search.trim()) setSearchResults(rows);
      else setData(rows);
    },
    [search],
  );

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
      data={displayedData}
      debtLimit={debtLimit}
      columns={columns}
      onReorder={handleReorder}
      onDeleteDebtor={handleDeleteDebtor}
      onRefresh={refreshDebtors}
      search={search}
      onSearchChange={setSearch}
      searchLoading={searchLoading}
    />
  );
}
