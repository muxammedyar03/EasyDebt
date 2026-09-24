import { companyDay, companyDayRange, parseCompanyDay } from "@/lib/company-report-date";

export type ReportRange = "daily" | "week" | "month";
export type ReportQuery = { date: string; range: ReportRange; paymentsPage: number; debtsPage: number };
export const REPORT_PAGE_SIZE = 50;

export function parseReportQuery(params: Record<string, string | string[] | undefined>): ReportQuery {
  const date = params.date ?? companyDay().toISOString().slice(0, 10);
  const range = params.range ?? "daily";
  if (
    typeof date !== "string" ||
    !parseCompanyDay(date) ||
    !["daily", "week", "month"].includes(String(range)) ||
    Array.isArray(range)
  ) {
    throw new Error("Invalid report period");
  }
  const page = (value: string | string[] | undefined) => {
    if (value === undefined) return 1;
    if (typeof value !== "string" || !/^[1-9]\d{0,6}$/.test(value)) throw new Error("Invalid report page");
    return Number(value);
  };
  return {
    date,
    range: range as ReportRange,
    paymentsPage: page(params.paymentsPage),
    debtsPage: page(params.debtsPage),
  };
}

export function reportPeriod(query: Pick<ReportQuery, "date" | "range">) {
  const from = parseCompanyDay(query.date);
  if (!from) throw new Error("Invalid report date");
  const to = new Date(from);
  if (query.range === "week") from.setUTCDate(from.getUTCDate() - 6);
  if (query.range === "month") {
    from.setUTCDate(1);
    to.setUTCMonth(to.getUTCMonth() + 1, 0);
  }
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    gte: companyDayRange(from).gte,
    lt: new Date(companyDayRange(to).lte.getTime() + 1),
  };
}
