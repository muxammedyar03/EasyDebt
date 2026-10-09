import { validateCompanyReceiptFile } from "@/lib/validation/company-receipt";

export type CreateCompanyDebtPayload = {
  company_id: number;
  amount: number;
  note?: string | null;
  items?: Array<{ name: string; price: number; quantity?: number }> | null;
  receipt?: File | null;
};

export { validateCompanyReceiptFile };

export async function createCompanyDebt(payload: CreateCompanyDebtPayload) {
  const form = new FormData();
  form.append("company_id", String(payload.company_id));
  form.append("amount", String(payload.amount));
  if (payload.note) form.append("note", payload.note);
  if (payload.items) form.append("items", JSON.stringify(payload.items));
  if (payload.receipt) {
    const error = validateCompanyReceiptFile(payload.receipt);
    if (error) throw new Error(error);
    form.append("receipt", payload.receipt);
  }

  const response = await fetch("/api/company-debts", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { error?: string }).error || "Qarz qo'shishda xatolik");
  }

  return response.json();
}
