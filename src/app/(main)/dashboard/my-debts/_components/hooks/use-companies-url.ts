"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

const SEARCH_DEBOUNCE_MS = 300;

function paramsFrom(searchParams: ReturnType<typeof useSearchParams>) {
  return new URLSearchParams(searchParams?.toString() ?? "");
}

export function useCompaniesUrl() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = React.useState(() => searchParams?.get("search") || "");
  const [isSearching, setIsSearching] = React.useState(false);
  const isFirstRender = React.useRef(true);

  const pushQueryString = React.useCallback(
    (params: URLSearchParams) => {
      router.push(`?${params.toString()}`);
    },
    [router],
  );

  const applySearchToUrl = React.useCallback(
    (value: string) => {
      const params = paramsFrom(searchParams);
      const currentSearch = params.get("search") || "";
      if (value) params.set("search", value);
      else params.delete("search");
      if (value !== currentSearch) params.set("page", "1");
      pushQueryString(params);
    },
    [searchParams, pushQueryString],
  );

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const urlSearch = searchParams?.get("search") || "";
    if (urlSearch === searchValue) {
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(() => {
      applySearchToUrl(searchValue);
      setIsSearching(false);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchValue, applySearchToUrl, searchParams]);

  React.useEffect(() => {
    const urlSearch = searchParams?.get("search") || "";
    setSearchValue((prev) => (prev === urlSearch ? prev : urlSearch));
  }, [searchParams]);

  const setParam = React.useCallback(
    (key: string, value: string | null, resetPage = true) => {
      const params = paramsFrom(searchParams);
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
      if (resetPage) params.set("page", "1");
      pushQueryString(params);
    },
    [searchParams, pushQueryString],
  );

  const handleSort = React.useCallback(
    (sortBy: string) => {
      const params = paramsFrom(searchParams);
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
      const params = paramsFrom(searchParams);
      params.set("page", page.toString());
      pushQueryString(params);
    },
    [searchParams, pushQueryString],
  );

  return {
    searchParams,
    searchValue,
    setSearchValue,
    isSearching,
    setParam,
    handleSort,
    handlePageChange,
  };
}
