import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

const OVERDUE_DAYS = 45;

export async function checkOverdueDebtors() {
  try {
    const overdueDate = new Date();
    overdueDate.setDate(overdueDate.getDate() - OVERDUE_DAYS);

    // Find debtors who haven't paid in 45 days and have debt
    const overdueDebtors = await prisma.debtor.findMany({
      where: {
        total_debt: { gt: 0 },
        OR: [{ last_payment_date: { lt: overdueDate } }, { last_payment_date: null, created_at: { lt: overdueDate } }],
        is_overdue: false,
      },
      include: {
        creator: true,
      },
    });

    // Mark as overdue and create notifications
    for (const debtor of overdueDebtors) {
      await prisma.debtor.update({
        where: { id: debtor.id },
        data: { is_overdue: true },
      });

      // Create notification
      await createNotification({
        userId: debtor.created_by,
        debtorId: debtor.id,
        type: "OVERDUE_PAYMENT",
        title: "Muddati o'tgan to'lov",
        message: `${debtor.first_name} ${debtor.last_name} 45 kundan beri to'lov qilmagan. Qarz: ${debtor.total_debt.toNumber()} so'm`,
      });
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
