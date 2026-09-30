import { Prisma, type AuditLog } from "@prisma/client";
import { serializableTransaction } from "@/lib/security/serializable";
import { prisma } from "@/lib/prisma";

export const UNDO_WINDOW_MS = 15 * 60 * 1000;

type SourceLog = Pick<AuditLog, "id" | "action" | "entity_type" | "entity_id" | "old_value" | "new_value" | "created_at">;
type DebtorFields = { first_name: string; last_name: string; phone_number: string | null; address: string | null };

function record(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function fields(value: Prisma.JsonValue | null): DebtorFields | null {
  const row = record(value);
  if (!row || typeof row.first_name !== "string" || typeof row.last_name !== "string" ||
      (row.phone_number != null && typeof row.phone_number !== "string") ||
      (row.address != null && typeof row.address !== "string")) return null;
  return { first_name: row.first_name, last_name: row.last_name,
    phone_number: row.phone_number ?? null, address: row.address ?? null } as DebtorFields;
}

function debtorId(log: SourceLog): number | null {
  const value = log.entity_id ?? record(log.new_value)?.debtor_id;
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : null;
}

/** Only actions with a complete, verifiable inverse are offered in the UI. */
export function canUndoAuditLog(log: SourceLog, now = new Date()): boolean {
  const age = now.getTime() - log.created_at.getTime();
  if (age < 0 || age > UNDO_WINDOW_MS || log.entity_type !== "DEBTOR" || debtorId(log) === null) return false;
  if (log.action === "UPDATE") return fields(log.old_value) !== null && fields(log.new_value) !== null;
  if (log.action === "CREATE") return fields(log.new_value) !== null;
  return false;
}

export async function undoableAuditIds(clientId: number, logs: SourceLog[], permitted: boolean): Promise<number[]> {
  if (!permitted) return [];
  const candidates = logs.filter((log) => canUndoAuditLog(log)).map((log) => log.id);
  if (!candidates.length) return [];
  const undone = await prisma.auditLog.findMany({
    where: { client_id: clientId, action: "UNDO", entity_type: "AUDIT_LOG", entity_id: { in: candidates } },
    select: { entity_id: true },
  });
  const excluded = new Set(undone.map((log) => log.entity_id));
  return candidates.filter((id) => !excluded.has(id));
}

export class AuditUndoError extends Error {
  constructor(message: string, readonly status = 409) { super(message); }
}

function sameFields(current: DebtorFields, expected: DebtorFields): boolean {
  return Object.keys(expected).every((key) =>
    current[key as keyof DebtorFields] === expected[key as keyof DebtorFields]);
}

/** Serializable transaction protects against two admins undoing the same action concurrently. */
export async function undoAuditAction(clientId: number, userId: number, id: number, now = new Date()) {
  return serializableTransaction(async (tx) => {
    const log = await tx.auditLog.findFirst({ where: { id, client_id: clientId } });
    if (!log) throw new AuditUndoError("Audit yozuvi topilmadi", 404);
    if (!canUndoAuditLog(log, now)) throw new AuditUndoError("Bu amalni ortga qaytarib bo‘lmaydi yoki muddat tugagan");
    const alreadyUndone = await tx.auditLog.findFirst({
      where: { client_id: clientId, action: "UNDO", entity_type: "AUDIT_LOG", entity_id: log.id },
      select: { id: true },
    });
    if (alreadyUndone) throw new AuditUndoError("Bu amal allaqachon ortga qaytarilgan");

    const targetId = debtorId(log)!;
    const locked = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      SELECT id FROM debtors WHERE id=${targetId} AND client_id=${clientId} FOR UPDATE`);
    if (locked.length !== 1) throw new AuditUndoError("Qarzdor mavjud emas");
    const current = await tx.debtor.findFirst({ where: { id: targetId, client_id: clientId } });
    const expected = fields(log.new_value)!;
    if (!current || !sameFields(current, expected))
      throw new AuditUndoError("Ma’lumot keyin o‘zgargan; ortga qaytarish mumkin emas");

    if (log.action === "UPDATE") {
      await tx.debtor.update({
        where: { id: targetId, client_id: clientId }, data: fields(log.old_value)!,
      });
    } else {
      const [debts, payments, reminders] = await Promise.all([
        tx.debt.count({ where: { debtor_id: targetId, client_id: clientId } }),
        tx.payment.count({ where: { debtor_id: targetId, client_id: clientId } }),
        tx.paymentReminder.count({ where: { debtor_id: targetId, client_id: clientId } }),
      ]);
      if (debts || payments || reminders || current.total_debt.toNumber() !== 0)
        throw new AuditUndoError("Qarzdorda qarz, to‘lov yoki eslatma bor; yaratishni bekor qilib bo‘lmaydi");
      await tx.debtor.delete({ where: { id: targetId, client_id: clientId } });
    }

    return tx.auditLog.create({ data: {
      client_id: clientId, user_id: userId, action: "UNDO", entity_type: "AUDIT_LOG", entity_id: id,
      old_value: { source_action: log.action, source_entity_type: log.entity_type, source_entity_id: targetId },
      new_value: log.action === "UPDATE" ? fields(log.old_value)! : Prisma.JsonNull,
      description: `Audit #${id} ortga qaytarildi (${log.action} DEBTOR #${targetId})`,
    } });
  });
}
