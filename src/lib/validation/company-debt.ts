import { z } from "zod";

export const addCompanyDebtSchema = z.object({
  amount: z.string().min(1, "Qarz miqdorini kiriting"),
  note: z.string().optional(),
  createdAt: z.date().optional(),
});

export type AddCompanyDebtFormData = z.infer<typeof addCompanyDebtSchema>;

export const createCompanyDebtApiSchema = z.object({
  company_id: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive("Qarz miqdori musbat bo'lishi kerak"),
  note: z.string().nullable().optional(),
  items: z
    .array(
      z.object({
        name: z.string(),
        price: z.number(),
        quantity: z.number().optional(),
      }),
    )
    .nullable()
    .optional(),
  created_at: z.string().optional(),
});
