import type { Prisma } from "@prisma/client";
import { debtRepository } from "@/entities/debt/api";
import { settingsRepository } from "@/entities/settings/api";

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
  async debtLimit(clientId: number): Promise<number> {
    return settingsRepository.getDebtLimit(clientId);
  }

  /** Task 4.2a: limit to avoid loading unbounded rows (default 2000). */
  async getDebtsWithDebtorForReport(clientId: number, limit = 2000): Promise<DebtReportItem[]> {
    const debts = (await debtRepository.findMany(
      { client_id: clientId },
      { include: { debtor: true }, orderBy: { created_at: "desc" }, take: limit },
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
}

export const debtService = new DebtService();
