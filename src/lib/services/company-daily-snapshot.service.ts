/**
 * SERVICE - Company daily snapshots & day activity history
 */

import type { Prisma } from "@prisma/client";
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
} from "@/types/domain/company-daily-snapshot.domain";

type CompanyDebtWithCompany = Prisma.CompanyDebtGetPayload<{ include: { company: true } }>;
type CompanyPaymentWithCompany = Prisma.CompanyPaymentGetPayload<{ include: { company: true } }>;

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
  async refreshForDate(date: Date = new Date()): Promise<CompanyDailySnapshotDomain> {
    const snapshotDate = toSnapshotDate(date);
    const range = dayRange(date);

    const [outstanding, debtsAgg, debtsCount, paymentsAgg, paymentsCount] = await Promise.all([
      companyRepository.aggregate({}),
      companyDebtRepository.aggregate({ created_at: range }),
      companyDebtRepository.count({ created_at: range }),
      companyPaymentRepository.aggregate({ created_at: range }),
      companyPaymentRepository.count({ created_at: range }),
    ]);

    const row = await companyDailySnapshotRepository.upsertByDate(snapshotDate, {
      total_outstanding_debt: outstanding._sum.total_debt?.toNumber() ?? 0,
      debts_sum: debtsAgg._sum.amount?.toNumber() ?? 0,
      debts_count: debtsCount,
      payments_sum: paymentsAgg._sum.amount?.toNumber() ?? 0,
      payments_count: paymentsCount,
    });

    return prismaToDomainCompanyDailySnapshot(row);
  }

  async getSnapshotOn(date: Date): Promise<CompanyDailySnapshotDomain | null> {
    const snapshotDate = toSnapshotDate(date);
    const exact = await companyDailySnapshotRepository.findByDate(snapshotDate);
    if (exact) return prismaToDomainCompanyDailySnapshot(exact);

    const nearest = await companyDailySnapshotRepository.findFirstOnOrBefore(snapshotDate);
    return nearest ? prismaToDomainCompanyDailySnapshot(nearest) : null;
  }

  /** Outstanding debt as of ~1 month ago (nearest snapshot on or before). */
  async getOutstandingOneMonthAgo(from: Date = new Date()): Promise<CompanyDailySnapshotDomain | null> {
    const target = new Date(from);
    target.setMonth(target.getMonth() - 1);
    return this.getSnapshotOn(target);
  }

  /** First day of previous calendar month. */
  getFirstDayOfPreviousMonth(from: Date = new Date()): Date {
    return new Date(from.getFullYear(), from.getMonth() - 1, 1);
  }

  async getDayActivity(date: Date): Promise<CompanyDayActivityDomain> {
    const range = dayRange(date);
    const snapshot = await this.getSnapshotOn(date);

    const [debts, payments] = await Promise.all([
      companyDebtRepository.findMany(
        { created_at: range },
        { include: { company: true }, orderBy: { created_at: "desc" } },
      ) as Promise<CompanyDebtWithCompany[]>,
      companyPaymentRepository.findMany(
        { created_at: range },
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

  async getPreviousMonthFirstDayReport(from: Date = new Date()) {
    const day = this.getFirstDayOfPreviousMonth(from);
    return this.getDayActivity(day);
  }
}

export const companyDailySnapshotService = new CompanyDailySnapshotService();
