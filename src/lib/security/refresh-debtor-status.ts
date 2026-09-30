import type { Prisma } from "@prisma/client";
import { computeDebtorOverdueStatus } from "@/entities/debtor/model/overdue";
import { activeLedgerEntries } from "./active-ledger";

export async function refreshDebtorStatus(tx: Prisma.TransactionClient, clientId: number, debtorId: number) {
  const debtor = await tx.debtor.findFirstOrThrow({
    where: { id: debtorId, client_id: clientId },
    include: { debts: true, payments: true },
  });
  const setting = await tx.settings.findUnique({
    where: { client_id_key: { client_id: clientId, key: "overdue_days" } },
  });
  const limit = Number(setting?.value || 45);
  const debts = activeLedgerEntries(debtor.debts, (row) => row.reverses_debt_id);
  const payments = activeLedgerEntries(debtor.payments, (row) => row.reverses_payment_id);
  const status = computeDebtorOverdueStatus(
    debts.map((d) => ({ amount: d.amount.toNumber(), createdAt: d.created_at })),
    payments.map((p) => ({
      amount: p.amount.toNumber(),
      createdAt: p.created_at,
      resetsRating: p.resets_rating,
    })),
    { goodUntilDays: limit - 15, mediumUntilDays: limit, minPaidPercent: 0.5 },
  );
  const latest = payments.reduce<Date | null>(
    (date, p) => (!date || p.created_at > date ? p.created_at : date),
    null,
  );
  return tx.debtor.update({
    where: { id: debtorId, client_id: clientId },
    data: { is_overdue: status.isOverdue, last_payment_date: latest },
  });
}
