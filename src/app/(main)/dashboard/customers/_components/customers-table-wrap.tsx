"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CustomersTableDumb } from "./customers-table-view";
import { PaginatedCustomerRatingsView } from "@/types/domain/customer-rating.domain";

interface CustomersTableWrapProps {
  initialCustomers: PaginatedCustomerRatingsView["data"];
  initialCurrentPage: number;
  initialTotalPages: number;
  totalDebtorsCount: number;
  goodCount: number;
  averageCount: number;
  badCount: number;
}

export function CustomersTableWrap({
  initialCustomers,
  initialCurrentPage,
  initialTotalPages,
  totalDebtorsCount,
  goodCount,
  averageCount,
  badCount,
}: CustomersTableWrapProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = React.useState(searchParams?.get("search") || "");
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);
  const currentRating = searchParams?.get("rating") || "all";
  const currentSortField = searchParams?.get("sortField") || null;
  const currentSortOrder = (searchParams?.get("sortOrder") as "asc" | "desc" | null) || null;

  const handleSearch = React.useCallback(
    (value: string) => {
      setSearchValue(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams?.toString() ?? "");
        if (value) {
          params.set("search", value);
        } else {
          params.delete("search");
        }
        params.set("page", "1");
        router.push(`/dashboard/customers?${params.toString()}`);
      }, 500);
    },
    [router, searchParams],
  );

  const handleRatingChange = (rating: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (rating === "all") {
      params.delete("rating");
    } else {
      params.set("rating", rating);
    }
    params.set("page", "1");
    router.push(`/dashboard/customers?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", page.toString());
    router.push(`/dashboard/customers?${params.toString()}`);
  };

  const handleSortToggle = (field: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    if (currentSortField !== field) {
      params.set("sortField", field);
      params.set("sortOrder", "asc");
      params.set("page", "1");
      router.push(`/dashboard/customers?${params.toString()}`);
      return;
    }

    if (currentSortOrder === "asc") {
      params.set("sortOrder", "desc");
      params.set("page", "1");
      router.push(`/dashboard/customers?${params.toString()}`);
      return;
    }

    params.delete("sortField");
    params.delete("sortOrder");
    params.set("page", "1");
    router.push(`/dashboard/customers?${params.toString()}`);
  };

  return (
    <CustomersTableDumb
      customers={initialCustomers}
      currentPage={initialCurrentPage}
      totalPages={initialTotalPages}
      totalDebtorsCount={totalDebtorsCount}
      goodCount={goodCount}
      averageCount={averageCount}
      badCount={badCount}
      searchValue={searchValue}
      onSearchChange={handleSearch}
      currentRating={currentRating}
      onRatingChange={handleRatingChange}
      currentSortField={currentSortField}
      currentSortOrder={currentSortOrder}
      onSortToggle={handleSortToggle}
      onPageChange={handlePageChange}
    />
  );
}
