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
 * Load overdue settings from database
 * Returns parsed settings or defaults if not found
 */
async function loadOverdueSettings(shopId: number | null) {
  const settings = await settingsRepository.findMany({
    key: { in: ["good_until_days", "medium_until_days", "min_paid_percent"] },
    shop_id: shopId ?? 0,
  });

  const settingsRecord = settings.reduce(
    (acc, s) => {
      acc[s.key] = s.value;
      return acc;
    },
    {} as Record<string, string>,
  );

  return Object.keys(settingsRecord).length > 0 ? parseOverdueSettings(settingsRecord) : getDefaultOverdueSettings();
}

export async function checkOverdueDebtors() {
  try {
    // Get all debtors with debt and their payment history (via entity repositories)
    const debtorsWithDebt = (await debtorRepository.findMany(
      { total_debt: { gt: 0 } },
      { include: { debts: true, creator: true } },
    )) as DebtorWithDebtsAndCreator[];

    const shopIds = [...new Set(debtorsWithDebt.map((d) => d.shop_id))];
    if (shopIds.length === 0) return 0;
    const settingsByShopId = new Map<number, Awaited<ReturnType<typeof loadOverdueSettings>>>();
    await Promise.all(
      shopIds.map(async (shopId) => {
        settingsByShopId.set(shopId, await loadOverdueSettings(shopId));
      }),
    );

    // Get all payments separately (since Debt doesn't have direct payments relation in Prisma)
    const allPayments = await paymentRepository.findMany({ shop_id: { in: shopIds } });

    const overdueDebtors = [];

    for (const debtor of debtorsWithDebt) {
      const settings = settingsByShopId.get(debtor.shop_id) ?? getDefaultOverdueSettings();
      // Get payments for this debtor
      const debtorPayments = allPayments.filter((p) => p.debtor_id === debtor.id);

      // Convert Prisma debts to calculation format
      const debtsForCalculation: DebtWithPayments[] = debtor.debts.map((debt) => ({
        amount: debt.amount.toNumber(),
        createdAt: debt.created_at,
        payments: debtorPayments.map((p) => ({
          amount: p.amount.toNumber(),
          createdAt: p.created_at,
        })),
      }));

      // Calculate overdue status
      const overdueStatus = calculateDebtorOverdueStatus(debtsForCalculation, settings);

      // Check if status changed (was not overdue, now is)
      if (overdueStatus.isOverdue && !debtor.is_overdue) {
        overdueDebtors.push({
          debtor,
          status: overdueStatus,
        });
      }
    }

    // Mark as overdue and create notifications
    for (const { debtor, status } of overdueDebtors) {
      try {
        await debtorRepository.update(debtor.id, { is_overdue: true });

        // Create notification
        await createNotification({
          userId: debtor.created_by,
          shopId: debtor.shop_id,
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
  } catch (error) {
    console.error("Failed to check overdue debtors:", error);
    return 0;
  }
}
/*
export async function updateDebtorPaymentDate(debtorId: number) {
  try {
    await prisma.debtor.update({
      where: { id: debtorId },
      data: {
        last_payment_date: new Date(),
        is_overdue: false,
      },
    });
  } catch (error) {
    console.error("Failed to update debtor payment date:", error);
  }
}

export async function getOverdueDebtors() {
  return await prisma.debtor.findMany({
    where: {
      is_overdue: true,
      total_debt: { gt: 0 },
    },
    orderBy: { last_payment_date: "asc" },
  });
}
**/
export async function reEvaluateOverdueDebtors(shopId: number | null) {
  try {
    const settings = await loadOverdueSettings(shopId ?? null);

    const debtors = (await debtorRepository.findMany(
      { total_debt: { gt: 0 }, ...(shopId ? { shop_id: shopId } : {}) },
      { include: { debts: true, creator: true } },
    )) as DebtorWithDebtsAndCreator[];

    // Get all payments separately (via entity repository)
    const allPayments = await paymentRepository.findMany(shopId ? { shop_id: shopId } : {});

    for (const d of debtors) {
      try {
        // Get payments for this debtor
        const debtorPayments = allPayments.filter((p) => p.debtor_id === d.id);

        // Convert Prisma debts to calculation format
        const debtsForCalculation: DebtWithPayments[] = d.debts.map((debt) => ({
          amount: debt.amount.toNumber(),
          createdAt: debt.created_at,
          payments: debtorPayments.map((p) => ({
            amount: p.amount.toNumber(),
            createdAt: p.created_at,
          })),
        }));

        // Calculate overdue status
        const overdueStatus = calculateDebtorOverdueStatus(debtsForCalculation, settings);

        // Mark as overdue if should be but isn't
        if (overdueStatus.isOverdue && !d.is_overdue) {
          await debtorRepository.update(d.id, { is_overdue: true });
          await createNotification({
            userId: d.created_by,
            shopId: d.shop_id,
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
  } catch (error) {
    console.error("Failed to re-evaluate overdue debtors:", error);
  }
}
