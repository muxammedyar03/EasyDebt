import { Prisma } from "@prisma/client";
import { serializableTransaction } from "./serializable";

export class RecordDeletionError extends Error {
  readonly status = 409;
}
export async function deleteEmptyRecords(kind: "debtor" | "company", clientId: number, ids: number[], actorId: number) {
  return serializableTransaction(async (tx) => {
    const table = kind === "debtor" ? "debtors" : "companies";
    const locked = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      SELECT id FROM ${Prisma.raw(table)} WHERE client_id=${clientId} AND id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`);
    if (locked.length !== ids.length) throw new RecordDeletionError("Records not found in current shop");
    const where =
      kind === "debtor"
        ? { debtor_id: { in: ids }, client_id: clientId }
        : { company_id: { in: ids }, client_id: clientId };
    const count =
      kind === "debtor"
        ? (await tx.debt.count({ where })) +
          (await tx.payment.count({ where })) +
          (await tx.paymentReminder.count({ where }))
        : (await tx.companyDebt.count({ where })) + (await tx.companyPayment.count({ where }));
    if (count) throw new RecordDeletionError("Records with financial history or reminders cannot be deleted");
    const subjects =
      kind === "debtor"
        ? (
            await tx.debtor.findMany({
              where: { id: { in: ids }, client_id: clientId },
              select: { id: true, first_name: true, last_name: true },
            })
          ).map((row) => ({ id: row.id, name: `${row.first_name} ${row.last_name}`.trim() }))
        : await tx.company.findMany({
            where: { id: { in: ids }, client_id: clientId },
            select: { id: true, name: true },
          });
    if (kind === "debtor") await tx.debtor.deleteMany({ where: { id: { in: ids }, client_id: clientId } });
    else await tx.company.deleteMany({ where: { id: { in: ids }, client_id: clientId } });
    await tx.auditLog.create({
      data: {
        client_id: clientId,
        user_id: actorId,
        action: "DELETE",
        entity_type: kind.toUpperCase(),
        old_value: { ids, subjects },
      },
    });
  });
}
