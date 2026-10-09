import { Prisma, type AuditLog } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serializableTransaction } from "@/lib/security/serializable";
import { refreshDebtorStatus } from "@/lib/security/refresh-debtor-status";
import { AuditUndoError, UNDO_WINDOW_MS } from "@/lib/audit-undo";
import { companyDailySnapshotService } from "@/lib/services/company-daily-snapshot.service";

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
  if (!data || !amount(data.amount)) return false;
  if (log.entity_type === "COMPANY_DEBT" && log.action === "CREATE") {
    return Number.isSafeInteger(data.company_id) && Number(data.company_id) > 0;
  }
  if (log.entity_type === "COMPANY_PAYMENT" && log.action === "CREATE") {
    return (
      Number.isSafeInteger(data.company_id) &&
      Number(data.company_id) > 0 &&
      ["CASH", "CLICK", "CARD"].includes(String(data.payment_type))
    );
  }
  if (!Number.isSafeInteger(data.debtor_id) || Number(data.debtor_id) <= 0) return false;
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
  const [cancelled, debtReversals, paymentReversals, companyDebtReversals, companyPaymentReversals] = await Promise.all(
    [
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
            in: logs
              .filter((log) => ids.includes(log.id) && log.entity_type === "PAYMENT")
              .map((log) => log.entity_id!),
          },
        },
        select: { reverses_payment_id: true },
      }),
      prisma.companyDebt.findMany({
        where: {
          client_id: clientId,
          reverses_company_debt_id: {
            in: logs
              .filter((log) => ids.includes(log.id) && log.entity_type === "COMPANY_DEBT")
              .map((log) => log.entity_id!),
          },
        },
        select: { reverses_company_debt_id: true },
      }),
      prisma.companyPayment.findMany({
        where: {
          client_id: clientId,
          reverses_company_payment_id: {
            in: logs
              .filter((log) => ids.includes(log.id) && log.entity_type === "COMPANY_PAYMENT")
              .map((log) => log.entity_id!),
          },
        },
        select: { reverses_company_payment_id: true },
      }),
    ],
  );
  const excluded = new Set(cancelled.map((row) => row.entity_id));
  const debtIds = new Set(debtReversals.map((row) => row.reverses_debt_id));
  const paymentIds = new Set(paymentReversals.map((row) => row.reverses_payment_id));
  const companyDebtIds = new Set(companyDebtReversals.map((row) => row.reverses_company_debt_id));
  const companyPaymentIds = new Set(companyPaymentReversals.map((row) => row.reverses_company_payment_id));
  return logs
    .filter((log) => {
      if (!ids.includes(log.id) || excluded.has(log.id)) return false;
      if (log.entity_type === "DEBT") return !debtIds.has(log.entity_id);
      if (log.entity_type === "PAYMENT") return !paymentIds.has(log.entity_id);
      if (log.entity_type === "COMPANY_DEBT") return !companyDebtIds.has(log.entity_id);
      if (log.entity_type === "COMPANY_PAYMENT") return !companyPaymentIds.has(log.entity_id);
      return true;
    })
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

    const laterEdit = await tx.auditLog.findFirst({
      where: {
        client_id: clientId,
        entity_type: source.entity_type,
        entity_id: source.entity_id,
        created_at: { gt: source.created_at },
        action: { in: ["DEBT_UPDATED", "PAYMENT_UPDATED", "UPDATE"] },
      },
      select: { id: true },
    });
    if (laterEdit) throw new AuditUndoError("Yozuv keyin o‘zgartirilgan; bekor qilib bo‘lmaydi");

    if (source.entity_type === "COMPANY_DEBT" || source.entity_type === "COMPANY_PAYMENT") {
      const companyId = Number(value.company_id);
      const lockedCompany = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
        SELECT id FROM companies WHERE id=${companyId} AND client_id=${clientId} FOR UPDATE`);
      if (lockedCompany.length !== 1) throw new AuditUndoError("Kompaniya topilmadi");
      const company = await tx.company.findFirstOrThrow({ where: { id: companyId, client_id: clientId } });

      let reversalId: number;
      let reversalCreatedAt: Date;
      if (source.entity_type === "COMPANY_DEBT") {
        const original = await tx.companyDebt.findFirst({
          where: { id: source.entity_id!, client_id: clientId, company_id: companyId },
        });
        if (
          !original ||
          original.created_by !== source.user_id ||
          !original.amount.equals(sourceAmount) ||
          original.reverses_company_debt_id
        )
          throw new AuditUndoError("Kompaniya qarzi yozuvi mos kelmadi");
        const reversal = await tx.companyDebt.create({
          data: {
            client_id: clientId,
            company_id: companyId,
            created_by: actorId,
            amount: original.amount.negated(),
            reverses_company_debt_id: original.id,
            note: `Bekor qilindi: kompaniya qarzi #${original.id} (audit #${auditId})`,
          },
        });
        reversalId = reversal.id;
        reversalCreatedAt = reversal.created_at;
        await tx.company.update({
          where: { id: companyId, client_id: clientId },
          data: { total_debt: { decrement: original.amount } },
        });
      } else {
        const original = await tx.companyPayment.findFirst({
          where: { id: source.entity_id!, client_id: clientId, company_id: companyId },
        });
        if (
          !original ||
          original.created_by !== source.user_id ||
          !original.amount.equals(sourceAmount) ||
          original.payment_type !== value.payment_type ||
          original.reverses_company_payment_id
        )
          throw new AuditUndoError("Kompaniya to‘lovi yozuvi mos kelmadi");
        const reversal = await tx.companyPayment.create({
          data: {
            client_id: clientId,
            company_id: companyId,
            created_by: actorId,
            amount: original.amount.negated(),
            payment_type: original.payment_type,
            reverses_company_payment_id: original.id,
            note: `Bekor qilindi: kompaniya to‘lovi #${original.id} (audit #${auditId})`,
          },
        });
        reversalId = reversal.id;
        reversalCreatedAt = reversal.created_at;
        await tx.company.update({
          where: { id: companyId, client_id: clientId },
          data: { total_debt: { increment: original.amount } },
        });
      }

      await companyDailySnapshotService.refreshAffectedDates(clientId, reversalCreatedAt, tx);
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
          new_value: { reversal_id: reversalId, company_id: companyId, reason: note },
          description: `${source.entity_type} #${source.entity_id} bekor qilindi: ${note}`,
        },
      });
      return { audit, companyExternalId: company.external_id };
    }

    const debtorId = Number(value.debtor_id);
    const locked = await tx.$queryRaw<Array<{ id: number }>>(Prisma.sql`
      SELECT id FROM debtors WHERE id=${debtorId} AND client_id=${clientId} FOR UPDATE`);
    if (locked.length !== 1) throw new AuditUndoError("Qarzdor topilmadi");
    const debtor = await tx.debtor.findFirstOrThrow({ where: { id: debtorId, client_id: clientId } });

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
