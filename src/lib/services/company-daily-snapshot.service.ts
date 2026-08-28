/**
 * SERVICE - Company daily snapshots & day activity history
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { companyDailySnapshotRepository } from "@/entities/company-daily-snapshot/api";
import { companyRepository } from "@/entities/company/api";
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
import { getChartPeriodBounds, toInputDate, type ChartPeriod } from "@/lib/period-date-range";

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

/** Normalize to UTC date-only (midnight) for @db.Date uniqueness. */
export function toSnapshotDate(input: Date = new Date()): Date {
  return new Date(Date.UTC(input.getFullYear(), input.getMonth(), input.getDate()));
}

function dayRange(date: Date): { gte: Date; lte: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { gte: start, lte: end };
}

export class CompanyDailySnapshotService {
  /**
   * Recompute and upsert today's (or given day's) snapshot from live aggregates.
   */
  async refreshForDate(clientId: number, date: Date = new Date()): Promise<CompanyDailySnapshotDomain> {
    const snapshotDate = toSnapshotDate(date);
    const range = dayRange(date);

    const [outstanding, debtsAgg, debtsCount, paymentsAgg, paymentsCount] = await Promise.all([
      companyRepository.aggregate({ client_id: clientId }),
      companyDebtRepository.aggregate({ client_id: clientId, created_at: range }),
      companyDebtRepository.count({ client_id: clientId, created_at: range }),
      companyPaymentRepository.aggregate({ client_id: clientId, created_at: range }),
      companyPaymentRepository.count({ client_id: clientId, created_at: range }),
    ]);

    const row = await companyDailySnapshotRepository.upsertByDate(clientId, snapshotDate, {
      total_outstanding_debt: outstanding._sum.total_debt?.toNumber() ?? 0,
      debts_sum: debtsAgg._sum.amount?.toNumber() ?? 0,
      debts_count: debtsCount,
      payments_sum: paymentsAgg._sum.amount?.toNumber() ?? 0,
      payments_count: paymentsCount,
    });

    return prismaToDomainCompanyDailySnapshot(row);
  }

  async getSnapshotOn(clientId: number, date: Date): Promise<CompanyDailySnapshotDomain | null> {
    const snapshotDate = toSnapshotDate(date);
    const exact = await companyDailySnapshotRepository.findByDate(clientId, snapshotDate);
    if (exact) return prismaToDomainCompanyDailySnapshot(exact);

    const nearest = await companyDailySnapshotRepository.findFirstOnOrBefore(clientId, snapshotDate);
    return nearest ? prismaToDomainCompanyDailySnapshot(nearest) : null;
  }

  /** Outstanding debt as of ~1 month ago (nearest snapshot on or before). */
  async getOutstandingOneMonthAgo(
    clientId: number,
    from: Date = new Date(),
  ): Promise<CompanyDailySnapshotDomain | null> {
    const target = new Date(from);
    target.setMonth(target.getMonth() - 1);
    return this.getSnapshotOn(clientId, target);
  }

  /** First day of previous calendar month. */
  getFirstDayOfPreviousMonth(from: Date = new Date()): Date {
    return new Date(from.getFullYear(), from.getMonth() - 1, 1);
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
    const gte = new Date(dateFrom);
    gte.setHours(0, 0, 0, 0);
    const lte = new Date(dateTo);
    lte.setHours(23, 59, 59, 999);
    return { gte, lte };
  }

  /**
   * Period report: outstanding at start/end + debts/payments activity in range.
   */
  async getPeriodReport(clientId: number, dateFrom: Date, dateTo: Date): Promise<CompanyPeriodReportDomain> {
    const range = this.periodRange(dateFrom, dateTo);
    const dayBeforeStart = new Date(range.gte);
    dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);

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

    const dayBeforeStart = new Date(range.gte);
    dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);

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
    const { dateFrom, dateTo } = getChartPeriodBounds(period);
    const rangeStart = toSnapshotDate(dateFrom);
    const rangeEnd = toSnapshotDate(dateTo);

    const [snapshots, beforeStart] = await Promise.all([
      companyDailySnapshotRepository.findMany(
        { client_id: clientId, date: { gte: rangeStart, lte: rangeEnd } },
        { orderBy: { date: "asc" } },
      ),
      companyDailySnapshotRepository.findFirstOnOrBefore(clientId, rangeStart),
    ]);

    const snapshotByDay = new Map<string, (typeof snapshots)[number]>();
    for (const row of snapshots) {
      snapshotByDay.set(toInputDate(new Date(row.date)), row);
    }

    const points: CompanyChartPoint[] = [];
    let lastDebt = beforeStart?.total_outstanding_debt?.toNumber() ?? 0;
    const cursor = new Date(dateFrom);

    while (cursor <= dateTo) {
      const key = toInputDate(cursor);
      const snap = snapshotByDay.get(key);

      if (metric === "debt") {
        if (snap) lastDebt = snap.total_outstanding_debt.toNumber();
        points.push({
          date: key,
          label: cursor.toLocaleDateString("uz-UZ", { month: "short", day: "numeric" }),
          value: lastDebt,
        });
      } else {
        points.push({
          date: key,
          label: cursor.toLocaleDateString("uz-UZ", { month: "short", day: "numeric" }),
          value: snap?.payments_sum?.toNumber() ?? 0,
        });
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return points;
  }
}

export const companyDailySnapshotService = new CompanyDailySnapshotService();
