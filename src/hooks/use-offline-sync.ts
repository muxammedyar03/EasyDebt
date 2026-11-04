"use client";

import * as React from "react";
import { debtorOfflineRepository } from "@/entities/debtor/api/debtor-offline.repository";
import { offlineSyncService } from "@/lib/services/offline-sync.service";
import type { OfflineSyncMetadata } from "@/types/offline";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = React.useState(true);
  const [outboxCount, setOutboxCount] = React.useState(0);
  const [metadata, setMetadata] = React.useState<OfflineSyncMetadata | null>(null);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const refreshState = React.useCallback(async () => {
    try {
      const [count, meta] = await Promise.all([
        debtorOfflineRepository.getOutboxCount(),
        debtorOfflineRepository.getMetadata(),
      ]);
      setOutboxCount(count);
      setMetadata(meta);
    } catch {
      // transient read error
    }
  }, []);

  const syncNow = React.useCallback(async () => {
    if (!navigator.onLine || isSyncing) return { synced: 0, failed: 0 };
    setIsSyncing(true);
    try {
      const outboxRes = await offlineSyncService.flushOutboxToServer();
      await offlineSyncService.syncCloudToOffline();
      await refreshState();
      return outboxRes;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshState]);

  React.useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    void refreshState();

    // Trigger cloud hydration on mount if online
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void offlineSyncService.syncCloudToOffline().then(() => refreshState());
    }

    const onOnline = () => {
      setIsOnline(true);
      void syncNow();
    };
    const onOffline = () => {
      setIsOnline(false);
    };
    const onOutboxChanged = () => {
      void refreshState();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("easydebt:outbox-updated", onOutboxChanged);
    window.addEventListener("easydebt:debtors-updated", onOutboxChanged);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("easydebt:outbox-updated", onOutboxChanged);
      window.removeEventListener("easydebt:debtors-updated", onOutboxChanged);
    };
  }, [refreshState, syncNow]);

  return {
    isOnline,
    outboxCount,
    metadata,
    isSyncing,
    syncNow,
    refreshState,
  };
}
