"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

function paramsFrom(searchParams: ReturnType<typeof useSearchParams>) {
  return new URLSearchParams(searchParams?.toString() ?? "");
}

function withPendingSearch(params: URLSearchParams, search: string) {
  if (search) params.set("search", search);
  else params.delete("search");
  return params;
}

export function useCompaniesUrl() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isNavigating, startNavigation] = React.useTransition();

  const [searchValue, setSearchValueState] = React.useState(() => searchParams?.get("search") || "");
  const searchValueRef = React.useRef(searchValue);
  searchValueRef.current = searchValue;
  const searchParamsRef = React.useRef(searchParams);
  searchParamsRef.current = searchParams;
  const awaitingUrl = React.useRef(false);
  const isFirstSearchPush = React.useRef(true);

  const pushQueryString = React.useCallback(
    (params: URLSearchParams) => {
      startNavigation(() => {
        router.push(`?${params.toString()}`);
      });
    },
    [router],
  );

  const setSearchValue = React.useCallback((value: string) => {
    const urlSearch = searchParamsRef.current?.get("search") || "";
    awaitingUrl.current = value !== urlSearch;
    setSearchValueState(value);
  }, []);

  React.useEffect(() => {
    if (isFirstSearchPush.current) {
      isFirstSearchPush.current = false;
      return;
    }
    const params = withPendingSearch(paramsFrom(searchParamsRef.current), searchValue);
    const currentSearch = searchParamsRef.current?.get("search") || "";
    if (searchValue === currentSearch) return;
    params.set("page", "1");
    pushQueryString(params);
  }, [searchValue, pushQueryString]);

  const urlSearch = searchParams?.get("search") || "";
  React.useEffect(() => {
    if (awaitingUrl.current) {
      if (urlSearch === searchValueRef.current) awaitingUrl.current = false;
      return;
    }
    setSearchValueState((prev) => (prev === urlSearch ? prev : urlSearch));
  }, [urlSearch]);

  const setParam = React.useCallback(
    (key: string, value: string | null, resetPage = true) => {
      const params = withPendingSearch(paramsFrom(searchParams), searchValueRef.current);
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
      if (resetPage) params.set("page", "1");
      pushQueryString(params);
    },
    [searchParams, pushQueryString],
  );

  const handleSort = React.useCallback(
    (sortBy: string) => {
      const params = withPendingSearch(paramsFrom(searchParams), searchValueRef.current);
      const currentSortBy = params.get("sortBy");
      const currentSortOrder = params.get("sortOrder") || "desc";
      if (currentSortBy === sortBy) {
        params.set("sortOrder", currentSortOrder === "asc" ? "desc" : "asc");
      } else {
        params.set("sortBy", sortBy);
        params.set("sortOrder", "asc");
      }
      pushQueryString(params);
    },
    [searchParams, pushQueryString],
  );

  const handlePageChange = React.useCallback(
    (page: number) => {
      const params = withPendingSearch(paramsFrom(searchParams), searchValueRef.current);
      params.set("page", page.toString());
      pushQueryString(params);
    },
    [searchParams, pushQueryString],
  );

  return {
    searchParams,
    searchValue,
    setSearchValue,
    isSearching: isNavigating || (searchParams?.get("search") || "") !== searchValue,
    setParam,
    handleSort,
    handlePageChange,
  };
}
