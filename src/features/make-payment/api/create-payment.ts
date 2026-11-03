import { saveOfflineMutation } from "@/lib/offline/client-offline-sync";

export type CreatePaymentPayload = {
  debtor_id: number;
  amount: number;
  payment_type: "CASH" | "CARD" | "CLICK";
  note?: string | null;
  resets_rating?: boolean;
  created_at?: string;
  idempotencyKey?: string;
};

export async function createPayment(payload: CreatePaymentPayload): Promise<unknown> {
  if (typeof window !== "undefined" && !navigator.onLine) {
    saveOfflineMutation(
      "payment",
      payload as Record<string, unknown>,
      `To'lov: ${payload.amount.toLocaleString()} so'm (${payload.payment_type})`,
    );
    return { success: true, offline: true, message: "Offlayn saqlandi" };
  }

  try {
    const response = await fetch("/api/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(payload.idempotencyKey ? { "Idempotency-Key": payload.idempotencyKey } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as { error?: string }).error || "To'lov qo'shishda xatolik yuz berdi");
    }

    return response.json();
  } catch (err) {
    if (typeof window !== "undefined" && !navigator.onLine) {
      saveOfflineMutation(
        "payment",
        payload as Record<string, unknown>,
        `To'lov: ${payload.amount.toLocaleString()} so'm (${payload.payment_type})`,
      );
      return { success: true, offline: true, message: "Offlayn saqlandi" };
    }
    throw err;
  }
}
