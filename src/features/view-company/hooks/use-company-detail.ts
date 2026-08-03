"use client";

import { useQuery } from "@tanstack/react-query";
import type { CompanyDomain } from "@/types/domain/company.domain";
import { fetchCompanyById } from "../api";

export const COMPANY_QUERY_KEY = "company";

export function useCompanyDetail(companyId: number, enabled = true, initialData?: CompanyDomain) {
  return useQuery({
    queryKey: [COMPANY_QUERY_KEY, companyId],
    queryFn: () => fetchCompanyById(companyId),
    enabled: enabled && companyId > 0,
    initialData,
    staleTime: initialData ? 60 * 1000 : 0,
    refetchOnMount: !initialData,
  });
}

export function computeCompanySummary(company: CompanyDomain | undefined) {
  if (!company) {
    return { totalDebtAdded: 0, totalPaid: 0, remaining: 0 };
  }
  const totalDebtAdded = company.debts?.reduce((s, d) => s + d.amount, 0) ?? company.totalDebt;
  const totalPaid = company.payments?.reduce((s, p) => s + p.amount, 0) ?? 0;
  return {
    totalDebtAdded,
    totalPaid,
    remaining: company.totalDebt,
  };
}
