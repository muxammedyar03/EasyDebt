/**
 * SERVICE - Company daily snapshots & day activity history
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { companyDebtRepository } from "@/entities/company-debt/api";
import { companyPaymentRepository } from "@/entities/company-payment/api";
import { prismaToDomainCompanyDailySnapshot } from "@/lib/mappers/company.mapper";
import type {
  CompanyDailySnapshotDomain,
  CompanyDayActivityDomain,
  CompanyDayDebtActivity,
  CompanyDayPaymentActivity,
  CompanyPeriodReportDomain,
  CompanyChartMetric,
  CompanyChartPoint,
} from "@/types/domain/company-daily-snapshot.domain";
import type { ChartPeriod } from "@/lib/period-date-range";
import { companyDay, companyDayRange } from "@/lib/company-report-date";
import { serializableTransaction } from "@/lib/security/serializable";
import { companySnapshotSeriesSql, rebuildCompanySnapshotHistorySql } from "./company-snapshot-history";

type CompanyDebtWithCompany = Prisma.CompanyDebtGetPayload<{ include: { company: true } }>;
type CompanyPaymentWithCompany = Prisma.CompanyPaymentGetPayload<{ include: { company: true } }>;

type PeriodReportSort = "date" | "amount" | "name";

type PeriodReportQueryOptions = {
  paymentsPage?: number;
  debtsPage?: number;
  limit?: number;
  search?: string;
  sort?: PeriodReportSort;
  sortAsc?: boolean;
};

export type CompanyPeriodReportQueryResult = CompanyPeriodReportDomain & {
  cash: number;
  card: number;
  click: number;
  paymentsPage: number;
  paymentsLimit: number;
  paymentsTotal: number;
  paymentsTotalPages: number;
  debtsPage: number;
  debtsLimit: number;
  debtsTotal: number;
  debtsTotalPages: number;
};

function buildPaymentOrder(sort: PeriodReportSort, sortAsc: boolean): Prisma.CompanyPaymentOrderByWithRelationInput {
  const dir = sortAsc ? "asc" : "desc";
  if (sort === "name") return { company: { name: dir } };
  if (sort === "amount") return { amount: dir };
  return { created_at: dir };
}

function buildDebtOrder(sort: PeriodReportSort, sortAsc: boolean): Prisma.CompanyDebtOrderByWithRelationInput {
  const dir = sortAsc ? "asc" : "desc";
  if (sort === "name") return { company: { name: dir } };
  if (sort === "amount") return { amount: dir };
  return { created_at: dir };
}

function applyCompanySearch<T extends Prisma.CompanyPaymentWhereInput | Prisma.CompanyDebtWhereInput>(
  where: T,
  search?: string,
): T {
  const term = search?.trim();
  if (!term) return where;
  return {
    ...where,
    company: { name: { contains: term, mode: "insensitive" } },
  };
}

/** A date-only label for the shop's business day. */
export const toSnapshotDate = companyDay;
const dayRange = companyDayRange;

export class CompanyDailySnapshotService {
  /**
   * Recompute and upsert today's (or given day's) snapshot from live aggregates.
   */
  async refreshForDate(
    clientId: number,
    date: Date = new Date(),
    tx?: Prisma.TransactionClient,
  ): Promise<CompanyDailySnapshotDomain> {
    if (!tx) return serializableTransaction((transaction) => this.refreshForDate(clientId, date, transaction));
    const snapshotDate = toSnapshotDate(date);
    const range = dayRange(date);
    const [debts, payments, dailyDebts, dailyPayments] = await Promise.all([
      tx.companyDebt.aggregate({
        where: { client_id: clientId, created_at: { lte: range.lte } },
        _sum: { amount: true },
      }),
      tx.companyPayment.aggregate({
        where: { client_id: clientId, created_at: { lte: range.lte } },
        _sum: { amount: true },
      }),
      tx.companyDebt.aggregate({
        where: { client_id: clientId, created_at: range },
        _sum: { amount: true },
        _count: true,
      }),
      tx.companyPayment.aggregate({
        where: { client_id: clientId, created_at: range },
        _sum: { amount: true },
        _count: true,
      }),
    ]);
    const data = {
      total_outstanding_debt: new Prisma.Decimal(debts._sum.amount ?? 0).minus(payments._sum.amount ?? 0),
      debts_sum: dailyDebts._sum.amount ?? new Prisma.Decimal(0),
      debts_count: dailyDebts._count,
      payments_sum: dailyPayments._sum.amount ?? new Prisma.Decimal(0),
      payments_count: dailyPayments._count,
    };
    const row = await tx.companyDailySnapshot.upsert({
      where: { client_id_date: { client_id: clientId, date: snapshotDate } },
      create: { client_id: clientId, date: snapshotDate, ...data },
      update: data,
    });
    return prismaToDomainCompanyDailySnapshot(row);
  }

  async refreshAffectedDates(clientId: number, from: Date, tx: Prisma.TransactionClient): Promise<void> {
    await tx.$executeRawUnsafe(
      rebuildCompanySnapshotHistorySql,
      clientId,
      companyDay(from).toISOString().slice(0, 10),
      companyDay().toISOString().slice(0, 10),
    );
  }

  async getSnapshotOn(clientId: number, date: Date): Promise<CompanyDailySnapshotDomain> {
    // Recompute exact as-of totals, including snapshots written with an older timezone policy.
    return this.refreshForDate(clientId, date);
  }

  /** Exact outstanding debt one calendar month ago, clamped at month end. */
  async getOutstandingOneMonthAgo(
    clientId: number,
    from: Date = new Date(),
  ): Promise<CompanyDailySnapshotDomain | null> {
    const target = companyDay(from);
    const day = target.getUTCDate();
    target.setUTCDate(1);
    target.setUTCMonth(target.getUTCMonth() - 1);
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(day, lastDay));
    return this.getSnapshotOn(clientId, target);
  }

  /** First day of previous calendar month. */
  getFirstDayOfPreviousMonth(from: Date = new Date()): Date {
    const day = companyDay(from);
    return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() - 1, 1));
  }

  async getDayActivity(clientId: number, date: Date): Promise<CompanyDayActivityDomain> {
    const range = dayRange(date);
    const snapshot = await this.getSnapshotOn(clientId, date);

    const [debts, payments] = await Promise.all([
      companyDebtRepository.findMany(
        { client_id: clientId, created_at: range },
        { include: { company: true }, orderBy: { created_at: "desc" } },
      ) as Promise<CompanyDebtWithCompany[]>,
      companyPaymentRepository.findMany(
        { client_id: clientId, created_at: range },
        { include: { company: true }, orderBy: { created_at: "desc" } },
      ) as Promise<CompanyPaymentWithCompany[]>,
    ]);

    const debtActivity: CompanyDayDebtActivity[] = debts.map((d) => ({
      id: d.id,
      companyId: d.company_id,
      companyName: d.company.name,
      amount: d.amount.toNumber(),
      note: d.note,
      createdAt: d.created_at,
    }));

    const paymentActivity: CompanyDayPaymentActivity[] = payments.map((p) => ({
      id: p.id,
      companyId: p.company_id,
      companyName: p.company.name,
      amount: p.amount.toNumber(),
      note: p.note,
      paymentType: p.payment_type,
      createdAt: p.created_at,
    }));

    return {
      date: toSnapshotDate(date),
      snapshot,
      debts: debtActivity,
      payments: paymentActivity,
    };
  }

  async getPreviousMonthFirstDayReport(clientId: number, from: Date = new Date()) {
    const day = this.getFirstDayOfPreviousMonth(from);
    return this.getDayActivity(clientId, day);
  }

  private periodRange(dateFrom: Date, dateTo: Date): { gte: Date; lte: Date } {
    return { gte: dayRange(dateFrom).gte, lte: dayRange(dateTo).lte };
  }

  /**
   * Period report: outstanding at start/end + debts/payments activity in range.
   */
  async getPeriodReport(clientId: number, dateFrom: Date, dateTo: Date): Promise<CompanyPeriodReportDomain> {
    const range = this.periodRange(dateFrom, dateTo);
    const dayBeforeStart = new Date(range.gte.getTime() - 1);

    const [startSnapshot, endSnapshot, debtsAgg, debtsCount, paymentsAgg, paymentsCount, debts, payments] =
      await Promise.all([
        this.getSnapshotOn(clientId, dayBeforeStart),
        this.getSnapshotOn(clientId, range.lte),
        companyDebtRepository.aggregate({ client_id: clientId, created_at: range }),
        companyDebtRepository.count({ client_id: clientId, created_at: range }),
        companyPaymentRepository.aggregate({ client_id: clientId, created_at: range }),
        companyPaymentRepository.count({ client_id: clientId, created_at: range }),
        companyDebtRepository.findMany(
          { client_id: clientId, created_at: range },
          { include: { company: true }, orderBy: { created_at: "desc" }, take: 2000 },
        ) as Promise<CompanyDebtWithCompany[]>,
        companyPaymentRepository.findMany(
          { client_id: clientId, created_at: range },
          { include: { company: true }, orderBy: { created_at: "desc" }, take: 2000 },
        ) as Promise<CompanyPaymentWithCompany[]>,
      ]);

    return {
      dateFrom: range.gte,
      dateTo: range.lte,
      outstandingAtStart: startSnapshot?.totalOutstandingDebt ?? null,
      outstandingAtEnd: endSnapshot?.totalOutstandingDebt ?? null,
      debtsSum: debtsAgg._sum.amount?.toNumber() ?? 0,
      debtsCount,
      paymentsSum: paymentsAgg._sum.amount?.toNumber() ?? 0,
      paymentsCount,
      debts: debts.map((d) => ({
        id: d.id,
        companyId: d.company_id,
        companyName: d.company.name,
        amount: d.amount.toNumber(),
        note: d.note,
        createdAt: d.created_at,
      })),
      payments: payments.map((p) => ({
        id: p.id,
        companyId: p.company_id,
        companyName: p.company.name,
        companyExternalId: p.company.external_id,
        amount: p.amount.toNumber(),
        note: p.note,
        paymentType: p.payment_type,
        createdAt: p.created_at,
      })),
    };
  }

  async getPeriodReportQuery(
    clientId: number,
    dateFrom: Date,
    dateTo: Date,
    options?: PeriodReportQueryOptions,
  ): Promise<CompanyPeriodReportQueryResult> {
    const range = this.periodRange(dateFrom, dateTo);
    const sort = options?.sort ?? "date";
    const sortAsc = options?.sortAsc ?? false;
    const limit = options?.limit ?? 20;
    const paymentsPage = options?.paymentsPage ?? 1;
    const debtsPage = options?.debtsPage ?? 1;
    const paymentsSkip = (paymentsPage - 1) * limit;
    const debtsSkip = (debtsPage - 1) * limit;

    const paymentWhere = applyCompanySearch({ client_id: clientId, created_at: range }, options?.search);
    const debtWhere = applyCompanySearch({ client_id: clientId, created_at: range }, options?.search);

    const dayBeforeStart = new Date(range.gte.getTime() - 1);

    const [
      startSnapshot,
      endSnapshot,
      debtsAgg,
      debtsCount,
      paymentsAgg,
      paymentsCount,
      debts,
      debtsTotal,
      payments,
      paymentsTotal,
      groupBy,
    ] = await Promise.all([
      this.getSnapshotOn(clientId, dayBeforeStart),
      this.getSnapshotOn(clientId, range.lte),
      companyDebtRepository.aggregate({ client_id: clientId, created_at: range }),
      companyDebtRepository.count({ client_id: clientId, created_at: range }),
      companyPaymentRepository.aggregate({ client_id: clientId, created_at: range }),
      companyPaymentRepository.count({ client_id: clientId, created_at: range }),
      companyDebtRepository.findMany(debtWhere, {
        include: { company: true },
        orderBy: buildDebtOrder(sort, sortAsc),
        skip: debtsSkip,
        take: limit,
      }) as Promise<CompanyDebtWithCompany[]>,
      companyDebtRepository.count(debtWhere),
      companyPaymentRepository.findMany(paymentWhere, {
        include: { company: true },
        orderBy: buildPaymentOrder(sort, sortAsc),
        skip: paymentsSkip,
        take: limit,
      }) as Promise<CompanyPaymentWithCompany[]>,
      companyPaymentRepository.count(paymentWhere),
      prisma.companyPayment.groupBy({
        by: ["payment_type"],
        where: { client_id: clientId, created_at: range },
        _sum: { amount: true },
      }),
    ]);

    let cash = 0;
    let card = 0;
    let click = 0;
    for (const row of groupBy) {
      const sum = row._sum.amount?.toNumber() ?? 0;
      if (row.payment_type === "CASH") cash = sum;
      else if (row.payment_type === "CARD") card = sum;
      else if (row.payment_type === "CLICK") click = sum;
    }

    return {
      dateFrom: range.gte,
      dateTo: range.lte,
      outstandingAtStart: startSnapshot?.totalOutstandingDebt ?? null,
      outstandingAtEnd: endSnapshot?.totalOutstandingDebt ?? null,
      debtsSum: debtsAgg._sum.amount?.toNumber() ?? 0,
      debtsCount,
      paymentsSum: paymentsAgg._sum.amount?.toNumber() ?? 0,
      paymentsCount,
      cash,
      card,
      click,
      debts: debts.map((d) => ({
        id: d.id,
        companyId: d.company_id,
        companyName: d.company.name,
        companyExternalId: d.company.external_id,
        amount: d.amount.toNumber(),
        note: d.note,
        createdAt: d.created_at,
      })),
      payments: payments.map((p) => ({
        id: p.id,
        companyId: p.company_id,
        companyName: p.company.name,
        companyExternalId: p.company.external_id,
        amount: p.amount.toNumber(),
        note: p.note,
        paymentType: p.payment_type,
        createdAt: p.created_at,
      })),
      paymentsPage,
      paymentsLimit: limit,
      paymentsTotal,
      paymentsTotalPages: Math.ceil(paymentsTotal / limit) || 1,
      debtsPage,
      debtsLimit: limit,
      debtsTotal,
      debtsTotalPages: Math.ceil(debtsTotal / limit) || 1,
    };
  }

  async getOverviewChartSeries(
    clientId: number,
    period: ChartPeriod,
    metric: CompanyChartMetric,
  ): Promise<CompanyChartPoint[]> {
    const dateTo = companyDay();
    const dateFrom = new Date(dateTo);
    if (period === "week") dateFrom.setUTCDate(dateFrom.getUTCDate() - 6);
    else if (period === "3months") dateFrom.setUTCMonth(dateFrom.getUTCMonth() - 3);
    else dateFrom.setUTCMonth(0, 1);
    const rangeStart = toSnapshotDate(dateFrom);
    const rangeEnd = toSnapshotDate(dateTo);
    // Read the authoritative ledger in one statement; legacy cached amounts cannot leak into the chart.
    const snapshots = await prisma.$queryRawUnsafe<
      {
        date: string;
        total_outstanding_debt: Prisma.Decimal;
        payments_sum: Prisma.Decimal;
      }[]
    >(companySnapshotSeriesSql, clientId, rangeStart.toISOString().slice(0, 10), rangeEnd.toISOString().slice(0, 10));

    const snapshotByDay = new Map<string, (typeof snapshots)[number]>();
    for (const row of snapshots) {
      snapshotByDay.set(new Date(row.date).toISOString().slice(0, 10), row);
    }

    const points: CompanyChartPoint[] = [];
    let lastDebt = 0; // The query always includes the period-start balance.
    const cursor = new Date(dateFrom);

    while (cursor <= dateTo) {
      const key = cursor.toISOString().slice(0, 10);
      const snap = snapshotByDay.get(key);

      if (metric === "debt") {
        if (snap) lastDebt = snap.total_outstanding_debt.toNumber();
        points.push({
          date: key,
          label: cursor.toLocaleDateString("uz-UZ", { month: "short", day: "numeric", timeZone: "UTC" }),
          value: lastDebt,
        });
      } else {
        points.push({
          date: key,
          label: cursor.toLocaleDateString("uz-UZ", { month: "short", day: "numeric", timeZone: "UTC" }),
          value: snap?.payments_sum?.toNumber() ?? 0,
        });
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return points;
  }
}

export const companyDailySnapshotService = new CompanyDailySnapshotService();
