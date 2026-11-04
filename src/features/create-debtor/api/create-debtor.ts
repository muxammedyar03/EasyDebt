import { saveOfflineMutation } from "@/lib/offline/client-offline-sync";
import { offlineSyncService } from "@/lib/services/offline-sync.service";
import { debtorOfflineRepository } from "@/entities/debtor/api/debtor-offline.repository";

/**
 * Client-side API: create debtor (and optional initial debt) via POST /api/debtors.
 */
export type CreateDebtorPayload = {
  first_name: string;
  last_name: string;
  phone_number?: string | null;
  address?: string | null;
  debt_amount?: number | null;
  debt_description?: string | null;
};

export type CreateDebtorResult = { id: number; external_id: string; first_name: string; last_name: string /* ... */ };

export async function createDebtor(payload: CreateDebtorPayload): Promise<CreateDebtorResult> {
  const label = `Qarzdor: ${payload.first_name} ${payload.last_name}`;

  if (typeof window !== "undefined" && !navigator.onLine) {
    saveOfflineMutation("debtor", payload as Record<string, unknown>, label);
    void offlineSyncService.recordOfflineAction("debtor", payload as Record<string, unknown>, label);
    const offlineId = Date.now();
    const externalId = `offline-${offlineId}`;
    void debtorOfflineRepository.upsertDebtor({
      id: offlineId,
      external_id: externalId,
      first_name: payload.first_name,
      last_name: payload.last_name,
      phone_number: payload.phone_number || null,
      address: payload.address || null,
      total_debt: payload.debt_amount || 0,
      is_overdue: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      debts: payload.debt_amount
        ? [
            {
              id: offlineId + 1,
              debtor_id: offlineId,
              amount: payload.debt_amount,
              description: payload.debt_description || null,
              created_at: new Date().toISOString(),
            },
          ]
        : [],
      payments: [],
    });

    return {
      id: offlineId,
      external_id: externalId,
      first_name: payload.first_name,
      last_name: payload.last_name,
    };
  }

  try {
    const response = await fetch("/api/debtors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as { error?: string }).error || "Qarzdor qo'shishda xatolik yuz berdi");
    }

    return response.json();
  } catch (err) {
    if (typeof window !== "undefined" && !navigator.onLine) {
      saveOfflineMutation("debtor", payload as Record<string, unknown>, label);
      void offlineSyncService.recordOfflineAction("debtor", payload as Record<string, unknown>, label);
      const offlineId = Date.now();
      const externalId = `offline-${offlineId}`;
      return {
        id: offlineId,
        external_id: externalId,
        first_name: payload.first_name,
        last_name: payload.last_name,
      };
    }
    throw err;
  }
}
