import { COMPANY_RECEIPT_MAX_BYTES, isAllowedCompanyReceiptMime } from "@/lib/validation/company-payment";

export type CreateCompanyPaymentPayload = {
  company_id: number;
  amount: number;
  payment_type: "CASH" | "CLICK" | "CARD";
  note: string;
  receipt?: File | null;
};

export function validateCompanyReceiptFile(file: File): string | null {
  if (!isAllowedCompanyReceiptMime(file.type)) {
    return "Faqat JPEG, PNG, WEBP yoki PDF yuklash mumkin";
  }
  if (file.size > COMPANY_RECEIPT_MAX_BYTES) {
    return "Fayl hajmi 2MB dan oshmasligi kerak";
  }
  return null;
}

export async function createCompanyPayment(payload: CreateCompanyPaymentPayload) {
  const form = new FormData();
  form.append("company_id", String(payload.company_id));
  form.append("amount", String(payload.amount));
  form.append("payment_type", payload.payment_type);
  form.append("note", payload.note);
  if (payload.receipt) {
    const err = validateCompanyReceiptFile(payload.receipt);
    if (err) throw new Error(err);
    form.append("receipt", payload.receipt);
  }

  const response = await fetch("/api/company-payments", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { error?: string }).error || "To'lov qo'shishda xatolik");
  }

  return response.json();
}
