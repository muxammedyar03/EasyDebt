import type { QueryClient } from "@tanstack/react-query";

import type { RecentAuditActionsResponse } from "@/entities/audit-log/model";

export const auditLogKeys = {
  all: ["audit-logs"] as const,
  recent: () => [...auditLogKeys.all, "recent", 3] as const,
};

export async function fetchRecentAuditActions(): Promise<RecentAuditActionsResponse> {
  const response = await fetch("/api/audit-logs/recent", { cache: "no-store" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "So‘nggi amallarni yuklab bo‘lmadi");
  }

  return (await response.json()) as RecentAuditActionsResponse;
}

export function invalidateRecentAuditActions(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: auditLogKeys.recent() });
}
