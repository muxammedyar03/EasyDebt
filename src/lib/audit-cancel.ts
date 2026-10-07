import { Prisma, type AuditLog } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serializableTransaction } from "@/lib/security/serializable";
import { refreshDebtorStatus } from "@/lib/security/refresh-debtor-status";
import { AuditUndoError, UNDO_WINDOW_MS } from "@/lib/audit-undo";

type SourceLog = Pick<
  AuditLog,
  "id" | "user_id" | "action" | "entity_type" | "entity_id" | "old_value" | "new_value" | "created_at"
>;

function fields(value: Prisma.JsonValue | null): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function amount(value: unknown): Prisma.Decimal | null {
  try {
    if (typeof value !== "string" && typeof value !== "number") return null;
    const decimal = new Prisma.Decimal(value);
    return decimal.isFinite() && decimal.gt(0) ? decimal : null;
  } catch {
    return null;
  }
}

export function canCancelAuditLog(log: SourceLog, now = new Date()): boolean {
  const age = now.getTime() - log.created_at.getTime();
  if (age < 0 || age > UNDO_WINDOW_MS || !log.user_id || !log.entity_id) return false;
  const data = fields(log.new_value);
  if (!data || !Number.isSafeInteger(data.debtor_id) || Number(data.debtor_id) <= 0 || !amount(data.amount))
    return false;
  if (log.entity_type === "DEBT" && log.action === "DEBT_ADDED") return true;
  // Payment creation currently writes UPDATE with receipt balances. A later edit writes PAYMENT_UPDATED.
  return (
    log.entity_type === "PAYMENT" &&
    log.action === "UPDATE" &&
    log.old_value === null &&
    ["CASH", "CLICK", "CARD"].includes(String(data.payment_type)) &&
    typeof data.previousBalance === "number" &&
    typeof data.newBalance === "number"
  );
}

export async function cancellableAuditIds(clientId: number, logs: SourceLog[], permitted: boolean): Promise<number[]> {
  if (!permitted) return [];
  const ids = logs.filter((log) => canCancelAuditLog(log)).map((log) => log.id);
  if (!ids.length) return [];
  const [cancelled, debtReversals, paymentReversals] = await Promise.all([
    prisma.auditLog.findMany({
      where: { client_id: clientId, action: "CANCEL", entity_type: "AUDIT_LOG", entity_id: { in: ids } },
      select: { entity_id: true },
    }),
    prisma.debt.findMany({
      where: {
        client_id: clientId,
        reverses_debt_id: {
          in: logs.filter((log) => ids.includes(log.id) && log.entity_type === "DEBT").map((log) => log.entity_id!),
        },
      },
      select: { reverses_debt_id: true },
    }),
    prisma.payment.findMany({
      where: {
        client_id: clientId,
        reverses_payment_id: {
          in: logs.filter((log) => ids.includes(log.id) && log.entity_type === "PAYMENT").map((log) => log.entity_id!),
        },
      },
      select: { reverses_payment_id: true },
    }),
  ]);
  const excluded = new Set(cancelled.map((row) => row.entity_id));
  const debtIds = new Set(debtReversals.map((row) => row.reverses_debt_id));
  const paymentIds = new Set(paymentReversals.map((row) => row.reverses_payment_id));
  return logs
    .filter(
      (log) =>
        ids.includes(log.id) &&
        !excluded.has(log.id) &&
        !(log.entity_type === "DEBT" ? debtIds.has(log.entity_id) : paymentIds.has(log.entity_id)),
    )
    .map((log) => log.id);
}

export async function cancelAuditAction(
  clientId: number,
  actorId: number,
  auditId: number,
  reason: string,
  now = new Date(),
) {
  const note = reason.trim();
  if (note.length < 3 || note.length > 200) throw new AuditUndoError("Bekor qilish sababini 3–200 belgida yozing", 400);
  return serializableTransaction(async (tx) => {
    const source = await tx.auditLog.findFirst({ where: { id: auditId, client_id: clientId } });
    if (!source) throw new AuditUndoError("Audit yozuvi topilmadi", 404);
    if (!canCancelAuditLog(source, now))
      throw new AuditUndoError("Bu amalni bekor qilib bo‘lmaydi yoki muddat tugagan");
    const prior = await tx.auditLog.findFirst({
      where: { client_id: clientId, action: "CANCEL", entity_type: "AUDIT_LOG", entity_id: auditId },
      select: { id: true },
    });
    if (prior) throw new AuditUndoError("Bu amal allaqachon bekor qilingan");
    const value = fields(source.new_value)!;
    const sourceAmount = amount(value.amount)!;
    const debtorId = Number(value.debtor_id);
    const locked = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      SELECT id FROM debtors WHERE id=${debtorId} AND client_id=${clientId} FOR UPDATE`);
    if (locked.length !== 1) throw new AuditUndoError("Qarzdor topilmadi");
    const debtor = await tx.debtor.findFirstOrThrow({ where: { id: debtorId, client_id: clientId } });

    const laterEdit = await tx.auditLog.findFirst({
      where: {
        client_id: clientId,
        entity_type: source.entity_type,
        entity_id: source.entity_id,
        created_at: { gt: source.created_at },
        action: { in: ["DEBT_UPDATED", "PAYMENT_UPDATED"] },
      },
      select: { id: true },
    });
    if (laterEdit) throw new AuditUndoError("Yozuv keyin o‘zgartirilgan; bekor qilib bo‘lmaydi");

    let reversalId: number;
    if (source.entity_type === "DEBT") {
      const original = await tx.debt.findFirst({
        where: { id: source.entity_id!, client_id: clientId, debtor_id: debtorId },
      });
      if (
        !original ||
        original.created_by !== source.user_id ||
        !original.amount.equals(sourceAmount) ||
        original.reverses_debt_id
      )
        throw new AuditUndoError("Qarz yozuvi mos kelmadi");
      const reversal = await tx.debt.create({
        data: {
          client_id: clientId,
          debtor_id: debtorId,
          created_by: actorId,
          amount: original.amount.negated(),
          reverses_debt_id: original.id,
          description: `Bekor qilindi: qarz #${original.id} (audit #${auditId})`,
        },
      });
      reversalId = reversal.id;
      await tx.debtor.update({
        where: { id: debtorId, client_id: clientId },
        data: { total_debt: { decrement: original.amount } },
      });
    } else {
      const original = await tx.payment.findFirst({
        where: { id: source.entity_id!, client_id: clientId, debtor_id: debtorId },
      });
      if (
        !original ||
        original.created_by !== source.user_id ||
        !original.amount.equals(sourceAmount) ||
        original.payment_type !== value.payment_type ||
        original.reverses_payment_id
      )
        throw new AuditUndoError("To‘lov yozuvi mos kelmadi");
      const reversal = await tx.payment.create({
        data: {
          client_id: clientId,
          debtor_id: debtorId,
          created_by: actorId,
          amount: original.amount.negated(),
          payment_type: original.payment_type,
          resets_rating: false,
          reverses_payment_id: original.id,
          note: `Bekor qilindi: to‘lov #${original.id} (audit #${auditId})`,
        },
      });
      reversalId = reversal.id;
      await tx.debtor.update({
        where: { id: debtorId, client_id: clientId },
        data: { total_debt: { increment: original.amount } },
      });
    }
    await refreshDebtorStatus(tx, clientId, debtorId);
    const audit = await tx.auditLog.create({
      data: {
        client_id: clientId,
        user_id: actorId,
        action: "CANCEL",
        entity_type: "AUDIT_LOG",
        entity_id: auditId,
        old_value: {
          source_action: source.action,
          source_entity_type: source.entity_type,
          source_entity_id: source.entity_id,
          amount: sourceAmount.toString(),
        },
        new_value: { reversal_id: reversalId, debtor_id: debtorId, reason: note },
        description: `${source.entity_type} #${source.entity_id} bekor qilindi: ${note}`,
      },
    });
    return { audit, debtorExternalId: debtor.external_id };
  });
}
