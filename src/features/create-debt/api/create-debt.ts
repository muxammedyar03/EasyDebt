export type CreateDebtPayload = {
  debtor_id: number;
  amount: number;
  description?: string | null;
  created_at?: string;
};

export async function createDebt(payload: CreateDebtPayload): Promise<unknown> {
  const response = await fetch("/api/debts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { error?: string }).error || "Qarz qo'shishda xatolik yuz berdi");
  }

  return response.json();
}
