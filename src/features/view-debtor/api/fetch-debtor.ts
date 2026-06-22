import type { DebtorDomain } from "@/types/domain";

/**
 * Fetches a single debtor by numeric id (used by React Query).
 * API returns camelCase domain-like shape; dates may be ISO strings.
 */
export async function fetchDebtorById(debtorId: number): Promise<DebtorDomain> {
  const res = await fetch(`/api/debtors/${debtorId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Qarzdorni yuklashda xatolik");
  }
  const data = await res.json();
  return normalizeDebtorFromApi(data);
}

/** Normalize API response (dates as strings) to DebtorDomain (Date objects where needed). Exported for tests. */
export function normalizeDebtorFromApi(data: Record<string, unknown>): DebtorDomain {
  const debtor = data as DebtorDomain & {
    debts?: Array<{ createdAt: string | Date }>;
    payments?: Array<{ createdAt: string | Date }>;
  };
  const debts = (debtor.debts ?? []).map((d) => ({
    ...d,
    createdAt: typeof d.createdAt === "string" ? new Date(d.createdAt) : d.createdAt,
  }));
  const payments = (debtor.payments ?? []).map((p) => {
    const raw = p as unknown as { createdAt: string | Date };
    return {
      ...p,
      createdAt: typeof raw.createdAt === "string" ? new Date(raw.createdAt) : raw.createdAt,
    };
  });
  return {
    ...debtor,
    createdAt: typeof debtor.createdAt === "string" ? new Date(debtor.createdAt) : debtor.createdAt,
    updatedAt: typeof debtor.updatedAt === "string" ? new Date(debtor.updatedAt) : debtor.updatedAt,
    lastPaymentDate: debtor.lastPaymentDate
      ? typeof debtor.lastPaymentDate === "string"
        ? new Date(debtor.lastPaymentDate)
        : debtor.lastPaymentDate
      : null,
    debts,
    payments,
  } as DebtorDomain;
}
