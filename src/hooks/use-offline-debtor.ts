"use client";

import * as React from "react";
import { debtorOfflineRepository } from "@/entities/debtor/api/debtor-offline.repository";
import type { OfflineDebtorItem } from "@/types/offline";

export function useOfflineDebtor(identifier: string | number | undefined) {
  const [debtor, setDebtor] = React.useState<OfflineDebtorItem | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const loadDebtor = React.useCallback(async () => {
    if (!identifier) {
      setDebtor(null);
      setIsLoading(false);
      return;
    }

    try {
      let found: OfflineDebtorItem | null = null;
      if (typeof identifier === "number" || /^\d+$/.test(String(identifier))) {
        found = await debtorOfflineRepository.getDebtorById(Number(identifier));
      }
      if (!found) {
        found = await debtorOfflineRepository.getDebtorByExternalId(String(identifier));
      }
      setDebtor(found);
    } catch (err) {
      console.warn("[useOfflineDebtor] Failed to read from IndexedDB:", err);
    } finally {
      setIsLoading(false);
    }
  }, [identifier]);

  React.useEffect(() => {
    void loadDebtor();

    const handleUpdate = () => {
      void loadDebtor();
    };

    window.addEventListener("easydebt:debtors-updated", handleUpdate);
    return () => {
      window.removeEventListener("easydebt:debtors-updated", handleUpdate);
    };
  }, [loadDebtor]);

  return { debtor, isLoading, refresh: loadDebtor };
}
