import { z } from "zod";

export const addDebtSchema = z.object({
  amount: z.string().min(1, "Qarz miqdorini kiriting"),
  description: z.string().optional(),
  createdAt: z.date().optional(),
});

export type AddDebtFormData = z.infer<typeof addDebtSchema>;
