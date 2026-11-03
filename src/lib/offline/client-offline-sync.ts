"use client";

export interface OfflineMutationItem {
  id: string;
  type: "debtor" | "debt" | "payment";
  payload: Record<string, unknown>;
  label: string;
  createdAt: string;
  retryCount: number;
}

const STORAGE_KEY = "easydebt_offline_mutations_v1";

export function getOfflineQueue(): OfflineMutationItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineMutation(
  type: "debtor" | "debt" | "payment",
  payload: Record<string, unknown>,
  label: string,
): OfflineMutationItem {
  const item: OfflineMutationItem = {
    id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type,
    payload,
    label,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  if (typeof window !== "undefined") {
    try {
      const queue = getOfflineQueue();
      queue.push(item);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      window.dispatchEvent(new CustomEvent("easydebt:offline-queue-changed", { detail: { count: queue.length } }));
    } catch (err) {
      console.error("[EasyDebt Offline] Failed to save offline mutation:", err);
    }
  }

  return item;
}

export function getOfflineQueueCount(): number {
  return getOfflineQueue().length;
}

export async function flushOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  const remaining: OfflineMutationItem[] = [];
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      let endpoint = "/api/debts";
      if (item.type === "debtor") endpoint = "/api/debtors";
      else if (item.type === "payment") endpoint = "/api/payments";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });

      if (res.ok) {
        synced++;
      } else {
        item.retryCount = (item.retryCount || 0) + 1;
        remaining.push(item);
        failed++;
      }
    } catch {
      item.retryCount = (item.retryCount || 0) + 1;
      remaining.push(item);
      failed++;
    }
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
    window.dispatchEvent(new CustomEvent("easydebt:offline-queue-changed", { detail: { count: remaining.length } }));
  } catch (err) {
    console.error("[EasyDebt Offline] Failed to persist remaining queue:", err);
  }

  return { synced, failed };
}
