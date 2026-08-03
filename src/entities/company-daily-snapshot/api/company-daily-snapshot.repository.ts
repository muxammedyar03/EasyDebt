import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * CompanyDailySnapshot entity – API (repository).
 */
export class CompanyDailySnapshotRepository {
  async findByDate(date: Date) {
    return prisma.companyDailySnapshot.findUnique({
      where: { date },
    });
  }

  async findFirstOnOrBefore(date: Date) {
    return prisma.companyDailySnapshot.findFirst({
      where: { date: { lte: date } },
      orderBy: { date: "desc" },
    });
  }

  async findMany(
    where: Prisma.CompanyDailySnapshotWhereInput,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.CompanyDailySnapshotOrderByWithRelationInput;
    },
  ) {
    return prisma.companyDailySnapshot.findMany({
      where,
      ...options,
    });
  }

  async upsertByDate(
    date: Date,
    data: {
      total_outstanding_debt: number | Prisma.Decimal;
      debts_sum: number | Prisma.Decimal;
      debts_count: number;
      payments_sum: number | Prisma.Decimal;
      payments_count: number;
    },
  ) {
    return prisma.companyDailySnapshot.upsert({
      where: { date },
      create: {
        date,
        total_outstanding_debt: data.total_outstanding_debt,
        debts_sum: data.debts_sum,
        debts_count: data.debts_count,
        payments_sum: data.payments_sum,
        payments_count: data.payments_count,
      },
      update: {
        total_outstanding_debt: data.total_outstanding_debt,
        debts_sum: data.debts_sum,
        debts_count: data.debts_count,
        payments_sum: data.payments_sum,
        payments_count: data.payments_count,
      },
    });
  }
}

export const companyDailySnapshotRepository = new CompanyDailySnapshotRepository();
