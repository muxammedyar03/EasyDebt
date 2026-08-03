export type CreateCompanyDebtPayload = {
  company_id: number;
  amount: number;
  note: string;
  items?: Array<{ name: string; price: number; quantity?: number }> | null;
};

export async function createCompanyDebt(payload: CreateCompanyDebtPayload) {
  const response = await fetch("/api/company-debts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { error?: string }).error || "Qarz qo'shishda xatolik");
  }

  return response.json();
}
