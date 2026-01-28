import { z } from "zod";

export const paymentSchema = z.object({
  amount: z.string().min(1, "Summani kiriting"),
  payment_type: z.enum(["CASH", "CLICK", "CARD"]),
  note: z.string().optional(),
});

export const debtorSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  phone_number: z.string().nullable(),
  address: z.string().nullable(),
  total_debt: z.number(),
  is_overdue: z.boolean(),
  created_at: z.coerce.date(), // Accept string or Date and convert to Date
  updated_at: z.coerce.date(), // Accept string or Date and convert to Date
  created_by: z.number(),
});
