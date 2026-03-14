"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import type { DebtorDomain } from "@/types/domain";
import { fetchDebtorById } from "../api";
import { useComputedViewValue } from "../model/compute-view";
import type { ViewDebtorValue } from "../model";

const DEBTOR_QUERY_KEY = "debtor";

export interface UseDebtorDetailOptions {
  debtorId: number;
  overdueDays: number;
  initialData?: DebtorDomain;
}

export function useDebtorDetail({ debtorId, overdueDays, initialData }: UseDebtorDetailOptions): ViewDebtorValue & {
  isLoading: boolean;
  error: Error | null;
} {
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
  });

  const { stats, rating, timeline, firstDebtDate, daysSinceFirstDebt } = useComputedViewValue(debtor, overdueDays);

  const refresh = useCallback(async () => {
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
