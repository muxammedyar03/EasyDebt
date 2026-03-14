export type CreatePaymentPayload = {
  debtor_id: number;
  amount: number;
  payment_type: "CASH" | "CARD" | "CLICK";
  note?: string | null;
  created_at?: string;
};

export async function createPayment(payload: CreatePaymentPayload): Promise<unknown> {
  const response = await fetch("/api/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { error?: string }).error || "To'lov qo'shishda xatolik yuz berdi");
  }

  return response.json();
}
