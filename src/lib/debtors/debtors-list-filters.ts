import type { DebtorDomainFilters, PaginationOptions } from "@/types/domain/debtor.domain";

export type DebtorListStatus = "qarzdor" | "muddati_otgan" | "limitdan_oshgan" | "tolangan";

export type DebtorListOptions = {
  statuses: DebtorListStatus[];
  debtLimit: number;
};

const VALID_STATUSES = new Set<DebtorListStatus>(["qarzdor", "muddati_otgan", "limitdan_oshgan", "tolangan"]);

function getParam(params: Record<string, string | string[] | undefined>, key: string): string {
  const value = params[key];
  return Array.isArray(value) ? value[0] || "" : (value as string) || "";
}

function parseAmount(value: string): number | undefined {
  const digits = value.replace(/\s/g, "");
  if (!digits) return undefined;
  const num = Number(digits);
  return Number.isFinite(num) ? num : undefined;
}

export function matchesDebtorListStatus(
  debtor: { totalDebt: number; isOverdue: boolean },
  status: DebtorListStatus,
  debtLimit: number,
): boolean {
  switch (status) {
    case "tolangan":
      return debtor.totalDebt <= 0;
    case "limitdan_oshgan":
      return debtor.totalDebt >= debtLimit;
    case "muddati_otgan":
      return debtor.isOverdue && debtor.totalDebt > 0;
    case "qarzdor":
      return debtor.totalDebt > 0 && debtor.totalDebt < debtLimit;
    default:
      return false;
  }
}

export function parseDebtorsSearchParams(
  params: Record<string, string | string[] | undefined>,
  debtLimit: number,
): {
  pagination: PaginationOptions;
  filters: DebtorDomainFilters;
  listOptions: DebtorListOptions;
} {
  const page = Number(getParam(params, "page")) || 1;
  const limit = Number(getParam(params, "limit")) || 10;
  const search = getParam(params, "search");
  const sortBy = getParam(params, "sortBy") || "created_at";
  const sortOrder = (getParam(params, "sortOrder") === "asc" ? "asc" : "desc") as "asc" | "desc";

  const statusesParam = getParam(params, "statuses");
  const singleStatus = getParam(params, "status") || "all";

  let statuses: DebtorListStatus[] = [];
  if (statusesParam) {
    statuses = statusesParam.split(",").filter((s): s is DebtorListStatus => VALID_STATUSES.has(s as DebtorListStatus));
  } else if (singleStatus !== "all" && VALID_STATUSES.has(singleStatus as DebtorListStatus)) {
    statuses = [singleStatus as DebtorListStatus];
  }

  const dateFrom = getParam(params, "dateFrom");
  const dateTo = getParam(params, "dateTo");
  const minDebt = parseAmount(getParam(params, "minDebt"));
  const maxDebt = parseAmount(getParam(params, "maxDebt"));

  const filters: DebtorDomainFilters = {
    search: search || undefined,
    minDebt,
    maxDebt,
    createdBy: undefined,
  };

  if (dateFrom) {
    filters.dateFrom = new Date(dateFrom);
  }
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    filters.dateTo = end;
  }

  return {
    pagination: { page, limit, sortBy, sortOrder },
    filters,
    listOptions: { statuses, debtLimit },
  };
}

export function hasActiveDebtorsFilters(searchParams: { get: (key: string) => string | null } | null): boolean {
  if (!searchParams) return false;
  if (searchParams.get("search")) return true;
  if (searchParams.get("statuses")) return true;
  const status = searchParams.get("status");
  if (status && status !== "all") return true;
  if (searchParams.get("dateFrom")) return true;
  if (searchParams.get("dateTo")) return true;
  if (searchParams.get("minDebt")) return true;
  if (searchParams.get("maxDebt")) return true;
  return false;
}

export const DEBTORS_FILTER_PARAM_KEYS = [
  "search",
  "status",
  "statuses",
  "dateFrom",
  "dateTo",
  "minDebt",
  "maxDebt",
] as const;

export function hasActiveListFilters(filters: DebtorDomainFilters, listOptions: DebtorListOptions): boolean {
  return (
    listOptions.statuses.length > 0 ||
    !!filters.search ||
    filters.dateFrom != null ||
    filters.dateTo != null ||
    filters.minDebt != null ||
    filters.maxDebt != null
  );
}

export function buildDebtorsExportQuery(params: Record<string, string | string[] | undefined>): string {
  const keys = ["search", "status", "statuses", "dateFrom", "dateTo", "minDebt", "maxDebt"] as const;
  const qs = new URLSearchParams();
  for (const key of keys) {
    const value = getParam(params, key);
    if (value) qs.set(key, value);
  }
  return qs.toString();
}
