import { z } from "zod";

/**
 * Form validation schema for create debtor.
 * Matches API payload: first_name, last_name, phone_number, address, debt_amount, debt_description.
 */
export const addDebtorSchema = z.object({
  first_name: z.string().min(1, "Ism kiritish shart"),
  last_name: z.string().min(1, "Familiya kiritish shart"),
  phone_number: z.string().optional(),
  address: z.string().optional(),
  debt_amount: z.string().optional(),
  debt_description: z.string().optional(),
});

export type AddDebtorFormData = z.infer<typeof addDebtorSchema>;
