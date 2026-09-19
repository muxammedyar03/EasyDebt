import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { refreshDebtorStatus } from "@/lib/security/refresh-debtor-status";
import { serializableTransaction } from "@/lib/security/serializable";

async function checkClient(clientId: number): Promise<number> {
  const debtors = await prisma.debtor.findMany({ where: { client_id: clientId }, select: { id: true } });
  let newlyOverdue = 0;
  for (const { id } of debtors) {
    const changed = await serializableTransaction(async (tx) => {
      const before = await tx.debtor.findFirstOrThrow({ where: { id, client_id: clientId } });
      const after = await refreshDebtorStatus(tx, clientId, id);
      return !before.is_overdue && after.is_overdue ? after : null;
    });
    if (!changed) continue;
    newlyOverdue++;
    await createNotification({
      clientId,
      userId: changed.created_by,
      debtorId: id,
      type: "OVERDUE_PAYMENT",
      title: "Muddati o'tgan to'lov",
      message: `${changed.first_name} ${changed.last_name}: muddati o'tgan qarz ${changed.total_debt.toString()} so'm`,
    });
  }
  return newlyOverdue;
}
export async function checkOverdueDebtors() {
  const clients = await prisma.client.findMany({ where: { is_active: true }, select: { id: true } });
  let count = 0;
  for (const { id } of clients) count += await checkClient(id);
  return count;
}
export async function reEvaluateOverdueDebtors(clientId?: number) {
  if (clientId) {
    await checkClient(clientId);
    return;
  }
  await checkOverdueDebtors();
}
