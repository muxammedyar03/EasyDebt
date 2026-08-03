import { z } from "zod";

export const COMPANY_RECEIPT_MAX_BYTES = 2 * 1024 * 1024; // 2MB

export const COMPANY_RECEIPT_ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

export type CompanyReceiptMime = (typeof COMPANY_RECEIPT_ALLOWED_MIME)[number];

export const addCompanyPaymentSchema = z.object({
  amount: z.string().min(1, "To'lov miqdorini kiriting"),
  payment_type: z.enum(["CASH", "CLICK", "CARD"]),
  note: z.string().min(1, "Izoh kiritish shart"),
  createdAt: z.date().optional(),
});

export type AddCompanyPaymentFormData = z.infer<typeof addCompanyPaymentSchema>;

export const createCompanyPaymentApiSchema = z.object({
  company_id: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive("To'lov miqdori musbat bo'lishi kerak"),
  payment_type: z.enum(["CASH", "CLICK", "CARD"]),
  note: z.string().min(1, "Izoh kiritish shart"),
  created_at: z.string().optional(),
});

export function isAllowedCompanyReceiptMime(mime: string): mime is CompanyReceiptMime {
  return (COMPANY_RECEIPT_ALLOWED_MIME as readonly string[]).includes(mime);
}
