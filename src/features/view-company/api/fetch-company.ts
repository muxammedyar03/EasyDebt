import type { CompanyDomain } from "@/types/domain/company.domain";

export async function fetchCompanyById(companyId: number): Promise<CompanyDomain> {
  const res = await fetch(`/api/companies/${companyId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Kompaniyani yuklashda xatolik");
  }
  const data = await res.json();
  return normalizeCompanyFromApi(data);
}

export function normalizeCompanyFromApi(data: Record<string, unknown>): CompanyDomain {
  const company = data as CompanyDomain & {
    debts?: Array<{ createdAt: string | Date }>;
    payments?: Array<{ createdAt: string | Date }>;
  };

  return {
    ...company,
    createdAt: typeof company.createdAt === "string" ? new Date(company.createdAt) : company.createdAt,
    updatedAt: typeof company.updatedAt === "string" ? new Date(company.updatedAt) : company.updatedAt,
    lastPaymentDate: company.lastPaymentDate
      ? typeof company.lastPaymentDate === "string"
        ? new Date(company.lastPaymentDate)
        : company.lastPaymentDate
      : null,
    lastDebtDate: company.lastDebtDate
      ? typeof company.lastDebtDate === "string"
        ? new Date(company.lastDebtDate)
        : company.lastDebtDate
      : null,
    debts: (company.debts ?? []).map((d) => ({
      ...d,
      createdAt: typeof d.createdAt === "string" ? new Date(d.createdAt) : d.createdAt,
    })),
    payments: (company.payments ?? []).map((p) => ({
      ...p,
      createdAt: typeof p.createdAt === "string" ? new Date(p.createdAt) : p.createdAt,
    })),
  } as CompanyDomain;
}
