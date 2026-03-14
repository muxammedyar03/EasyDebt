import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import {
  calculateDebtorOverdueStatus,
  parseOverdueSettings,
  getDefaultOverdueSettings,
  type DebtWithPayments,
} from "@/lib/overdue-calculator";

/**
 * Load overdue settings from database
 * Returns parsed settings or defaults if not found
 */
async function loadOverdueSettings() {
  const settings = await prisma.settings.findMany({
    where: {
      key: {
        in: ["good_until_days", "medium_until_days", "min_paid_percent"],
      },
    },
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
    const settings = await loadOverdueSettings();
    console.log("[overdue-checker] using settings:", settings);

    // Get all debtors with debt and their payment history
    const debtorsWithDebt = await prisma.debtor.findMany({
      where: {
        total_debt: { gt: 0 },
      },
      include: {
        debts: true,
        creator: true,
      },
    });

    // Get all payments separately (since Debt doesn't have direct payments relation in Prisma)
    const allPayments = await prisma.payment.findMany({
      select: { debtor_id: true, amount: true, created_at: true },
    });

    const overdueDebtors = [];

    for (const debtor of debtorsWithDebt) {
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
        await prisma.debtor.update({
          where: { id: debtor.id },
          data: { is_overdue: true },
        });
        console.log("[overdue-checker] set is_overdue=true for debtor", debtor.id);

        // Create notification
        await createNotification({
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
export async function reEvaluateOverdueDebtors() {
  try {
    const settings = await loadOverdueSettings();
    console.log("[reEvaluateOverdueDebtors] using settings:", settings);

    const debtors = await prisma.debtor.findMany({
      where: { total_debt: { gt: 0 } },
      include: {
        debts: true,
        creator: true,
      },
    });

    // Get all payments separately
    const allPayments = await prisma.payment.findMany({
      select: { debtor_id: true, amount: true, created_at: true },
    });

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
          await prisma.debtor.update({ where: { id: d.id }, data: { is_overdue: true } });
          await createNotification({
            userId: d.created_by,
            debtorId: d.id,
            type: "OVERDUE_PAYMENT",
            title: "Muddati o'tgan to'lov",
            message: `${d.first_name} ${d.last_name} ${overdueStatus.overdueDays} kundan beri to'lov qilmagan. Qarz: ${d.total_debt.toNumber()} so'm`,
          });
        } else if (!overdueStatus.isOverdue && d.is_overdue) {
          // Mark as not overdue if status changed
          await prisma.debtor.update({ where: { id: d.id }, data: { is_overdue: false } });
        }
      } catch (e) {
        console.error("[reEvaluateOverdueDebtors] failed for debtor", d.id, e);
      }
    }
  } catch (error) {
    console.error("Failed to re-evaluate overdue debtors:", error);
  }
}
