import { prisma } from "@/lib/prisma";
import { settingsRepository } from "@/entities/settings/api";
import { debtorRepository } from "@/entities/debtor/api";
import { paymentRepository } from "@/entities/payment/api";
import { createNotification } from "@/lib/notifications";
import type { Prisma } from "@prisma/client";
import {
  calculateDebtorOverdueStatus,
  parseOverdueSettings,
  getDefaultOverdueSettings,
  type DebtWithPayments,
} from "@/entities/debtor/model";

type DebtorWithDebtsAndCreator = Prisma.DebtorGetPayload<{
  include: { debts: true; creator: true };
}>;

/**
 * Load overdue settings for a client
 */
async function loadOverdueSettings(clientId: number) {
  const settings = await settingsRepository.findMany(clientId, {
    key: { in: ["good_until_days", "medium_until_days", "min_paid_percent"] },
  });

  const settingsRecord = settings.reduce(
    (acc: Record<string, string>, s: { key: string; value: string }) => {
      acc[s.key] = s.value;
      return acc;
    },
    {} as Record<string, string>,
  );

  return Object.keys(settingsRecord).length > 0 ? parseOverdueSettings(settingsRecord) : getDefaultOverdueSettings();
}

async function checkOverdueForClient(clientId: number): Promise<number> {
  const settings = await loadOverdueSettings(clientId);

  const debtorsWithDebt = (await debtorRepository.findMany(
    { client_id: clientId, total_debt: { gt: 0 } },
    { include: { debts: true, creator: true } },
  )) as DebtorWithDebtsAndCreator[];

  const allPayments = await paymentRepository.findMany({ client_id: clientId });

  const overdueDebtors = [];

  for (const debtor of debtorsWithDebt) {
    const debtorPayments = allPayments.filter((p) => p.debtor_id === debtor.id);

    const debtsForCalculation: DebtWithPayments[] = debtor.debts.map((debt) => ({
      amount: debt.amount.toNumber(),
      createdAt: debt.created_at,
      payments: debtorPayments.map((p) => ({
        amount: p.amount.toNumber(),
        createdAt: p.created_at,
      })),
    }));

    const overdueStatus = calculateDebtorOverdueStatus(debtsForCalculation, settings);

    if (overdueStatus.isOverdue && !debtor.is_overdue) {
      overdueDebtors.push({ debtor, status: overdueStatus });
    }
  }

  for (const { debtor, status } of overdueDebtors) {
    try {
      await debtorRepository.update(debtor.id, { is_overdue: true });

      await createNotification({
        clientId,
        userId: debtor.created_by,
        debtorId: debtor.id,
        type: "OVERDUE_PAYMENT",
        title: "Muddati o'tgan to'lov",
        message: `${debtor.first_name} ${debtor.last_name} ${status.overdueDays} kundan beri to'lov qilmagan. Qarz: ${debtor.total_debt.toNumber()} so'm`,
      });
    } catch (e) {
      console.error("[overdue-checker] failed updating debtor", debtor.id, e);
    }
  }

  return overdueDebtors.length;
}

export async function checkOverdueDebtors() {
  try {
    const clients = await prisma.client.findMany({ where: { is_active: true }, select: { id: true } });
    let total = 0;
    for (const client of clients) {
      total += await checkOverdueForClient(client.id);
    }
    return total;
  } catch (error) {
    console.error("Failed to check overdue debtors:", error);
    return 0;
  }
}

export async function reEvaluateOverdueDebtors(clientId?: number) {
  try {
    const clientIds = clientId
      ? [clientId]
      : (await prisma.client.findMany({ where: { is_active: true }, select: { id: true } })).map((c) => c.id);

    for (const cid of clientIds) {
      const settings = await loadOverdueSettings(cid);

      const debtors = (await debtorRepository.findMany(
        { client_id: cid, total_debt: { gt: 0 } },
        { include: { debts: true, creator: true } },
      )) as DebtorWithDebtsAndCreator[];

      const allPayments = await paymentRepository.findMany({ client_id: cid });

      for (const d of debtors) {
        try {
          const debtorPayments = allPayments.filter((p) => p.debtor_id === d.id);

          const debtsForCalculation: DebtWithPayments[] = d.debts.map((debt) => ({
            amount: debt.amount.toNumber(),
            createdAt: debt.created_at,
            payments: debtorPayments.map((p) => ({
              amount: p.amount.toNumber(),
              createdAt: p.created_at,
            })),
          }));

          const overdueStatus = calculateDebtorOverdueStatus(debtsForCalculation, settings);

          if (overdueStatus.isOverdue && !d.is_overdue) {
            await debtorRepository.update(d.id, { is_overdue: true });
            await createNotification({
              clientId: cid,
              userId: d.created_by,
              debtorId: d.id,
              type: "OVERDUE_PAYMENT",
              title: "Muddati o'tgan to'lov",
              message: `${d.first_name} ${d.last_name} ${overdueStatus.overdueDays} kundan beri to'lov qilmagan. Qarz: ${d.total_debt.toNumber()} so'm`,
            });
          } else if (!overdueStatus.isOverdue && d.is_overdue) {
            await debtorRepository.update(d.id, { is_overdue: false });
          }
        } catch (e) {
          console.error("[reEvaluateOverdueDebtors] failed for debtor", d.id, e);
        }
      }
    }
  } catch (error) {
    console.error("Failed to re-evaluate overdue debtors:", error);
  }
}
