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
}
