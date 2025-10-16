import { z } from "zod";

export const debtorSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  phone_number: z.string().nullable(),
  address: z.string().nullable(),
  total_debt: z.number(),
  is_overdue: z.boolean(),
  created_at: z.date(),
  updated_at: z.date(),
  created_by: z.number(),
});
