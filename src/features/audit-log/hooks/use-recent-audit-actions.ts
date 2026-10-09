"use client";

import { useQuery } from "@tanstack/react-query";

import { auditLogKeys, fetchRecentAuditActions } from "../api";

const RECENT_ACTIONS_STALE_TIME_MS = 30_000;
const RECENT_ACTIONS_REFETCH_INTERVAL_MS = 5_000;

export function useRecentAuditActions() {
  return useQuery({
    queryKey: auditLogKeys.recent(),
    queryFn: fetchRecentAuditActions,
    staleTime: RECENT_ACTIONS_STALE_TIME_MS,
    refetchInterval: RECENT_ACTIONS_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
}
