"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import type { DebtorDomain } from "@/types/domain";
import { fetchDebtorById } from "../api";
import { useComputedViewValue } from "../model/compute-view";
import type { ViewDebtorComputed, ViewDebtorValue } from "../model";

/** Query key for debtor detail; use with queryClient.invalidateQueries({ queryKey: [DEBTOR_QUERY_KEY, debtorId] }) */
export const DEBTOR_QUERY_KEY = "debtor";

export interface UseDebtorDetailOptions {
  debtorId: number;
  overdueDays: number;
  initialData?: DebtorDomain;
  /** Server-computed stats/rating/timeline (Task 1.3); used until refetch to avoid client calculation on initial load */
  initialViewValue?: ViewDebtorComputed;
}

export function useDebtorDetail({
  debtorId,
  overdueDays,
  initialData,
  initialViewValue,
}: UseDebtorDetailOptions): ViewDebtorValue & {
  isLoading: boolean;
  error: Error | null;
} {
  const hasRefetchedRef = useRef(false);
  const {
    data: debtor,
    refetch,
    isLoading,
    error,
  } = useQuery({
    queryKey: [DEBTOR_QUERY_KEY, debtorId],
    queryFn: () => fetchDebtorById(debtorId),
    initialData: initialData ?? undefined,
    enabled: debtorId > 0,
    // Avoid double request: server already passed data; no refetch on mount when we have initialData
    staleTime: initialData ? 60 * 1000 : 0,
    refetchOnMount: !initialData,
  });

  const computed = useComputedViewValue(debtor, overdueDays);
  const useServerComputed = Boolean(initialViewValue && !hasRefetchedRef.current);
  const { stats, rating, timeline, firstDebtDate, daysSinceFirstDebt } = useServerComputed
    ? initialViewValue!
    : computed;

  const refresh = useCallback(async () => {
    hasRefetchedRef.current = true;
    await refetch();
  }, [refetch]);

  const value: ViewDebtorValue = {
    debtor: debtor!,
    stats,
    rating,
    timeline,
    firstDebtDate,
    daysSinceFirstDebt,
    refresh,
  };

  return {
    ...value,
    isLoading,
    error: error as Error | null,
  };
}
