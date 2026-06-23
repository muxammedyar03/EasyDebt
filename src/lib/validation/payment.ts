import { z } from "zod";

export const addPaymentSchema = z.object({
  amount: z.string().min(1, "Введите сумму платежа"),
  payment_type: z.enum(["CASH", "CLICK", "CARD"]),
  note: z.string().optional(),
  createdAt: z.date().optional(),
});

/** Shared schema for quick add (no date) */
export const paymentSchema = z.object({
  amount: z.string().min(1, "Введите сумму платежа"),
  payment_type: z.enum(["CASH", "CLICK", "CARD"]),
  note: z.string().optional(),
});

export type AddPaymentFormData = z.infer<typeof addPaymentSchema>;
export type PaymentFormValues = z.infer<typeof paymentSchema>;
