import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export async function checkOverdueDebtors() {
  try {
    // Load overdue days from settings (fallback to 45)
    const overdueDaysSetting = await prisma.settings.findFirst({ where: { shop_id: null, key: "overdue_days" } });
    const OVERDUE_DAYS = (() => {
      const n = overdueDaysSetting ? parseInt(overdueDaysSetting.value, 10) : NaN;
      return Number.isFinite(n) && n > 0 ? n : 45;
    })();

    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - OVERDUE_DAYS);
    console.log("[overdue-checker] overdueDate:", overdueDate.toISOString());

    // Overdue logic:
    // - If there has been any payment: use last_payment_date and check if it's older than overdueDate
    // - If there has never been a payment: use the first debt creation date (NOT debtor.created_at)
    //   so that adding more debt does not reset the timer.
    const overdueDebtors = await prisma.debtor.findMany({
      where: {
        total_debt: { gt: 0 },
        is_overdue: false,
        OR: [
          // Has payments, and the last payment is older than the threshold
          { last_payment_date: { lt: overdueDate } },
          // Has never paid (last_payment_date is null) and the first debt was created before the threshold
          {
            AND: [{ last_payment_date: null }, { debts: { some: { created_at: { lt: overdueDate } } } }],
          },
        ],
      },
      include: {
        creator: true,
      },
    });

    console.log(
      "[overdue-checker] matched debtors:",
      overdueDebtors.length,
      overdueDebtors.map((d) => d.id),
    );

    // Mark as overdue and create notifications
    for (const debtor of overdueDebtors) {
      try {
        await prisma.debtor.update({
          where: { id: debtor.id },
          data: { is_overdue: true },
        });
        console.log("[overdue-checker] set is_overdue=true for debtor", debtor.id);

        // Create notification
        await createNotification({
          userId: debtor.created_by,
          shopId: debtor.shop_id,
          debtorId: debtor.id,
          type: "OVERDUE_PAYMENT",
          title: "Muddati o'tgan to'lov",
          message: `${debtor.first_name} ${debtor.last_name} ${OVERDUE_DAYS} kundan beri to'lov qilmagan. Qarz: ${debtor.total_debt.toNumber()} so'm`,
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

export async function reEvaluateOverdueDebtors() {
  const overdueDaysSetting = await prisma.settings.findFirst({ where: { shop_id: null, key: "overdue_days" } });
  const OVERDUE_DAYS = (() => {
    const n = overdueDaysSetting ? parseInt(overdueDaysSetting.value, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 45;
  })();

  const overdueDate = new Date();
  overdueDate.setDate(overdueDate.getDate() - OVERDUE_DAYS);

  const debtors = await prisma.debtor.findMany({
    where: { total_debt: { gt: 0 } },
    include: { debts: { select: { created_at: true } }, creator: true },
  });

  for (const d of debtors) {
    try {
      const lastPayment = d.last_payment_date;
      const firstDebtDate = d.debts.length
        ? d.debts.reduce((min, b) => (b.created_at < min ? b.created_at : min), d.debts[0].created_at)
        : null;

      const shouldBeOverdue = lastPayment
        ? lastPayment < overdueDate
        : firstDebtDate
          ? firstDebtDate < overdueDate
          : false;

      if (shouldBeOverdue && !d.is_overdue) {
        await prisma.debtor.update({ where: { id: d.id }, data: { is_overdue: true } });
        await createNotification({
          userId: d.created_by,
          shopId: d.shop_id,
          debtorId: d.id,
          type: "OVERDUE_PAYMENT",
          title: "Muddati o'tgan to'lov",
          message: `${d.first_name} ${d.last_name} ${OVERDUE_DAYS} kundan beri to'lov qilmagan. Qarz: ${d.total_debt.toNumber()} so'm`,
        });
      } else if (!shouldBeOverdue && d.is_overdue) {
        await prisma.debtor.update({ where: { id: d.id }, data: { is_overdue: false } });
      }
    } catch (e) {
      console.error("[reEvaluateOverdueDebtors] failed for debtor", d.id, e);
    }
  }
}
