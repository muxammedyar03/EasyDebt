import { z } from "zod";

export const addCompanyPaymentSchema = z.object({
  amount: z.string().min(1, "To'lov miqdorini kiriting"),
  payment_type: z.enum(["CASH", "CLICK", "CARD"]),
  note: z.string().optional(),
  createdAt: z.date().optional(),
});

export type AddCompanyPaymentFormData = z.infer<typeof addCompanyPaymentSchema>;

export const createCompanyPaymentApiSchema = z.object({
  company_id: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive("To'lov miqdori musbat bo'lishi kerak"),
  payment_type: z.enum(["CASH", "CLICK", "CARD"]),
  note: z.string().nullable().optional(),
  created_at: z.string().optional(),
});
