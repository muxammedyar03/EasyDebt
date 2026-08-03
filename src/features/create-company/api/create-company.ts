export type CreateCompanyPayload = {
  name: string;
  contact_person?: string | null;
  phone_number?: string | null;
  address?: string | null;
};

export type UpdateCompanyPayload = Partial<CreateCompanyPayload>;

export async function createCompany(payload: CreateCompanyPayload) {
  const response = await fetch("/api/companies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { error?: string }).error || "Kompaniya qo'shishda xatolik");
  }

  return response.json();
}

export async function updateCompany(id: number, payload: UpdateCompanyPayload) {
  const response = await fetch(`/api/companies/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { error?: string }).error || "Kompaniyani yangilashda xatolik");
  }

  return response.json();
}

export async function deleteCompany(id: number) {
  const response = await fetch(`/api/companies/${id}`, { method: "DELETE" });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { error?: string }).error || "Kompaniyani o'chirishda xatolik");
  }
  return response.json();
}
