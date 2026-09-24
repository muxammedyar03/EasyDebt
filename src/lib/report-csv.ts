import type { CashReportRow } from "@/lib/services/reports.service";
/** Quote delimiters/newlines and neutralize spreadsheet formulas in untrusted text. */
export function csvCell(value: string): string {
  const safe = /^[\s]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
export const REPORT_CSV_HEADER = "\uFEFFtype,id,debtor_id,debtor_name,amount,payment_type,created_at_utc,note\r\n";
export function reportCsvRows(rows: CashReportRow[]): string {
  return rows
    .map(
      (row) =>
        [
          row.kind,
          String(row.id),
          row.debtor_external_id,
          row.debtor_name,
          row.amount,
          row.payment_type ?? "",
          row.created_at,
          row.note ?? "",
        ]
          .map((value, index) => (index === 4 && /^-?\d+(?:\.\d+)?$/.test(value) ? `"${value}"` : csvCell(value)))
          .join(",") + "\r\n",
    )
    .join("");
}
