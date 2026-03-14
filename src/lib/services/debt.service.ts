import type { Prisma } from "@prisma/client";
import { debtRepository } from "@/entities/debt/api";
import { settingsRepository } from "@/entities/settings/api";
import { getSession } from "../auth";
import { getEffectiveShopId } from "../shop-context";

/** Debt with debtor for report */
type DebtWithDebtor = Prisma.DebtGetPayload<{ include: { debtor: true } }>;

export type DebtReportItem = {
  id: number;
  debtor_id: number;
  debtor_external_id: string;
  debtor_name: string;
  debitor_total_debt: number;
  debitor_is_overdue: boolean;
  amount: number;
  description: string | null;
  created_at: string;
};

class DebtService {
  async debtLimit(): Promise<number> {
    const session = await getSession();
    const shopId = getEffectiveShopId(session);

    return settingsRepository.getDebtLimit(shopId ?? null);
  }

  private async getShopId(): Promise<number> {
    const session = await getSession();
    const shopId = getEffectiveShopId(session);
    if (!shopId) {
      throw new Error("Shop context not found");
    }
    return shopId;
  }

  // async getTotalCount(): Promise<number> {
  //   return prisma.debt.count();
  // }

  // async getDebtsInDateRange(from: Date, to: Date): Promise<{ sum: number; count: number }> {
  //   const [debts, agg] = await Promise.all([
  //     prisma.debt.findMany({
  //       where: { created_at: { gte: from, lte: to } },
  //     }),
  //     prisma.debt.aggregate({
  //       _sum: { amount: true },
  //       where: { created_at: { gte: from, lte: to } },
  //     }),
  //   ]);
  //   return {
  //     sum: agg._sum.amount?.toNumber() ?? 0,
  //     count: debts.length,
  //   };
  // }

  /** Task 4.2a: limit to avoid loading unbounded rows (default 2000). */
  async getDebtsWithDebtorForReport(limit = 2000): Promise<DebtReportItem[]> {
    const debts = (await debtRepository.findMany(
      { shop_id: await this.getShopId() },
      { include: { debtor: true }, orderBy: { created_at: "desc" }, take: limit as number },
    )) as DebtWithDebtor[];
    return debts.map((d) => ({
      id: d.id,
      debtor_id: d.debtor_id,
      debtor_external_id: d.debtor.external_id,
      debtor_name: `${d.debtor.first_name} ${d.debtor.last_name}`,
      debitor_total_debt: d.debtor.total_debt.toNumber(),
      debitor_is_overdue: d.debtor.is_overdue,
      amount: d.amount.toNumber(),
      description: d.description,
      created_at: d.created_at.toISOString(),
    }));
  }

  // async getTotalCount(): Promise<number> {
  //   return prisma.debt.count();
  // }

  // async getDebtsInDateRange(from: Date, to: Date): Promise<{ sum: number; count: number }> {
  //   const [debts, agg] = await Promise.all([
  //     prisma.debt.findMany({
  //       where: { created_at: { gte: from, lte: to } },
  //     }),
  //     prisma.debt.aggregate({
  //       _sum: { amount: true },
  //       where: { created_at: { gte: from, lte: to } },
  //     }),
  //   ]);
  //   return {
  //     sum: agg._sum.amount?.toNumber() ?? 0,
  //     count: debts.length,
  //   };
  // }
}

export const debtService = new DebtService();
