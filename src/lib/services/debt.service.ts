import { prisma } from "@/lib/prisma";

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
    const settings = await prisma.settings.findUnique({
      where: { key: "debt_limit" },
    });
    return settings ? parseFloat(settings.value) : 2000000;
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

  async getDebtsWithDebtorForReport(): Promise<DebtReportItem[]> {
    const debts = await prisma.debt.findMany({
      include: { debtor: true },
      orderBy: { created_at: "desc" },
    });
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
}

export const debtService = new DebtService();
