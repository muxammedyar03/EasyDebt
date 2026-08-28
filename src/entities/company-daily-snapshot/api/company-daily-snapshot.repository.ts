import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * CompanyDailySnapshot entity – API (repository).
 * Unique key is [client_id, date].
 */
export class CompanyDailySnapshotRepository {
  async findByDate(clientId: number, date: Date) {
    return prisma.companyDailySnapshot.findUnique({
      where: { client_id_date: { client_id: clientId, date } },
    });
  }

  async findFirstOnOrBefore(clientId: number, date: Date) {
    return prisma.companyDailySnapshot.findFirst({
      where: { client_id: clientId, date: { lte: date } },
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
    clientId: number,
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
      where: { client_id_date: { client_id: clientId, date } },
      create: {
        client_id: clientId,
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
