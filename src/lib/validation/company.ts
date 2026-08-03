import { z } from "zod";

export const addCompanySchema = z.object({
  name: z.string().min(1, "Kompaniya nomi shart"),
  contact_person: z.string().optional(),
  phone_number: z.string().optional(),
  address: z.string().optional(),
});

export const updateCompanySchema = addCompanySchema.partial().extend({
  name: z.string().min(1, "Kompaniya nomi shart").optional(),
});

export type AddCompanyFormData = z.infer<typeof addCompanySchema>;
export type UpdateCompanyFormData = z.infer<typeof updateCompanySchema>;
