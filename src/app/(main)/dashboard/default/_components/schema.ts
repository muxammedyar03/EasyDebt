import { z } from "zod";

/** Form schemas (debtor, debt, payment) in @/lib/validation */

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
