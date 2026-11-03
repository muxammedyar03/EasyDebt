import { saveOfflineMutation } from "@/lib/offline/client-offline-sync";

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
  if (typeof window !== "undefined" && !navigator.onLine) {
    saveOfflineMutation(
      "debtor",
      payload as Record<string, unknown>,
      `Qarzdor: ${payload.first_name} ${payload.last_name}`,
    );
    return {
      id: Date.now(),
      external_id: `offline-${Date.now()}`,
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
      saveOfflineMutation(
        "debtor",
        payload as Record<string, unknown>,
        `Qarzdor: ${payload.first_name} ${payload.last_name}`,
      );
      return {
        id: Date.now(),
        external_id: `offline-${Date.now()}`,
        first_name: payload.first_name,
        last_name: payload.last_name,
      };
    }
    throw err;
  }
}
