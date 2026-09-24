import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { REPORT_PAGE_SIZE, reportPeriod, type ReportQuery } from "@/lib/report-query";
import { reportTotalsSql, reportPageSql, reportExportSql } from "@/lib/repositories/cash-report.sql";

export type CashReportRow = {
  kind: "payment" | "debt";
  id: number;
  debtor_id: number;
  debtor_external_id: string;
  debtor_name: string;
  debitor_total_debt: string;
  debitor_is_overdue: boolean;
  amount: string;
  payment_type: "CASH" | "CARD" | "CLICK" | null;
  note: string | null;
  created_at: string;
};
type DbRow = Omit<CashReportRow, "created_at"> & { created_at: Date };
export type CashReportTotals = {
  payments_count: number;
  debts_count: number;
  total_payments: string;
  total_debts: string;
  cash: string;
  card: string;
  click: string;
};
const serialize = (row: DbRow): CashReportRow => ({ ...row, created_at: row.created_at.toISOString() });

function parameters(clientId: number, query: ReportQuery) {
  if (!Number.isSafeInteger(clientId) || clientId <= 0) throw new Error("Client context required");
  const period = reportPeriod(query);
  return [clientId, period.gte, period.lt];
}

export class ReportsService {
  async getDashboardReport(clientId: number, query: ReportQuery) {
    const params = parameters(clientId, query);
    return prisma.$transaction(
      async (tx) => {
        const [totals] = await tx.$queryRawUnsafe<CashReportTotals[]>(reportTotalsSql, ...params);
        const paymentsPage = Math.min(
          query.paymentsPage,
          Math.max(1, Math.ceil(totals.payments_count / REPORT_PAGE_SIZE)),
        );
        const debtsPage = Math.min(query.debtsPage, Math.max(1, Math.ceil(totals.debts_count / REPORT_PAGE_SIZE)));
        const payments = await tx.$queryRawUnsafe<DbRow[]>(
          reportPageSql,
          ...params,
          "payment",
          REPORT_PAGE_SIZE,
          (paymentsPage - 1) * REPORT_PAGE_SIZE,
        );
        const debts = await tx.$queryRawUnsafe<DbRow[]>(
          reportPageSql,
          ...params,
          "debt",
          REPORT_PAGE_SIZE,
          (debtsPage - 1) * REPORT_PAGE_SIZE,
        );
        return {
          totals,
          payments: payments.map(serialize),
          debts: debts.map(serialize),
          query: { ...query, paymentsPage, debtsPage },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  /** Await the consumer for backpressure; cancel/failure rejects and closes the DB snapshot. */
  async exportReport(clientId: number, query: ReportQuery, consume: (rows: CashReportRow[]) => Promise<void>) {
    const params = parameters(clientId, query);
    await prisma.$transaction(
      async (tx) => {
        let kind = "",
          id = 0;
        for (;;) {
          const rows = await tx.$queryRawUnsafe<DbRow[]>(reportExportSql, ...params, kind, id, 500);
          if (!rows.length) break;
          await consume(rows.map(serialize));
          const last = rows[rows.length - 1];
          kind = last.kind;
          id = last.id;
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 60_000 },
    );
  }
}
export const reportsService = new ReportsService();
export type CashReport = Awaited<ReturnType<ReportsService["getDashboardReport"]>>;
