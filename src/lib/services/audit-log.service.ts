import type { Prisma } from "@prisma/client";

import {
  auditLogRepository,
  type RecentAuditLogRecord,
  type RecentAuditSubjectReferences,
} from "@/entities/audit-log/api";
import type { RecentAuditAction } from "@/entities/audit-log/model";
import { cancellableAuditIds } from "@/lib/audit-cancel";
import { undoableAuditIds } from "@/lib/audit-undo";

export interface RecentAuditActionsOptions {
  clientId: number;
  actorRole: string;
  canUndo: boolean;
  canCancel: boolean;
  limit?: number;
}

export interface AuditLogPresentation {
  subjectName: string | null;
  subjectHref: string | null;
  amount: number | null;
  displayEntityType: string;
  sourceAction: string | null;
}

function amountFromJson(value: Prisma.JsonValue | null): number | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;

  const rawAmount = value.amount;
  if (typeof rawAmount !== "number" && typeof rawAmount !== "string") return null;

  const amount = Number(rawAmount);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function auditAmount(log: RecentAuditLogRecord): number | null {
  const amountEntityTypes = new Set(["DEBT", "PAYMENT", "COMPANY_DEBT", "COMPANY_PAYMENT"]);
  if (!amountEntityTypes.has(log.entity_type) && log.entity_type !== "AUDIT_LOG") return null;

  return amountFromJson(log.new_value) ?? amountFromJson(log.old_value);
}

type JsonRecord = Record<string, Prisma.JsonValue>;
type SubjectRows = Awaited<ReturnType<typeof auditLogRepository.findSubjectRows>>;

interface AuditSubject {
  name: string;
  href: string | null;
}

interface SubjectMaps {
  debtors: Map<number, AuditSubject>;
  debts: Map<number, AuditSubject>;
  payments: Map<number, AuditSubject>;
  reminders: Map<number, AuditSubject>;
  companies: Map<number, AuditSubject>;
  companyDebts: Map<number, AuditSubject>;
  companyPayments: Map<number, AuditSubject>;
}

function jsonRecord(value: Prisma.JsonValue | null): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

function positiveId(value: Prisma.JsonValue | undefined): number | null {
  const id = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function auditFieldId(log: RecentAuditLogRecord, key: string): number | null {
  return positiveId(jsonRecord(log.new_value)?.[key]) ?? positiveId(jsonRecord(log.old_value)?.[key]);
}

function auditSource(log: RecentAuditLogRecord): { entityType: string; action: string | null } {
  if (log.entity_type !== "AUDIT_LOG") {
    return { entityType: log.entity_type, action: null };
  }

  const source = jsonRecord(log.old_value);
  const entityType = typeof source?.source_entity_type === "string" ? source.source_entity_type : log.entity_type;
  const action = typeof source?.source_action === "string" ? source.source_action : null;

  return { entityType, action };
}

function personName(value: JsonRecord | null): string | null {
  if (!value) return null;
  const firstName = typeof value.first_name === "string" ? value.first_name.trim() : "";
  const lastName = typeof value.last_name === "string" ? value.last_name.trim() : "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  if (fullName) return fullName;
  return typeof value.username === "string" && value.username.trim() ? value.username.trim() : null;
}

function deletedSubjectsName(value: Prisma.JsonValue | null): string | null {
  const subjects = jsonRecord(value)?.subjects;
  if (!Array.isArray(subjects)) return null;

  const names = subjects.flatMap((subject) => {
    const name = jsonRecord(subject)?.name;
    return typeof name === "string" && name.trim() ? [name.trim()] : [];
  });
  return names.length ? names.join(", ") : null;
}

function inlineSubjectName(log: RecentAuditLogRecord): string | null {
  const current = jsonRecord(log.new_value);
  const previous = jsonRecord(log.old_value);
  const row = current ?? previous;

  if (log.entity_type === "DEBTOR" || log.entity_type === "USER" || log.entity_type === "AUDIT_LOG") {
    return personName(row) ?? deletedSubjectsName(log.old_value);
  }
  if (log.entity_type === "COMPANY" || log.entity_type === "CLIENT") {
    const name = row?.name;
    return typeof name === "string" && name.trim() ? name.trim() : deletedSubjectsName(log.old_value);
  }
  return null;
}

function collectSubjectReferences(logs: RecentAuditLogRecord[]): RecentAuditSubjectReferences {
  const references = {
    debtorIds: new Set<number>(),
    debtIds: new Set<number>(),
    paymentIds: new Set<number>(),
    reminderIds: new Set<number>(),
    companyIds: new Set<number>(),
    companyDebtIds: new Set<number>(),
    companyPaymentIds: new Set<number>(),
  };

  for (const log of logs) {
    const debtorId = auditFieldId(log, "debtor_id");
    const companyId = auditFieldId(log, "company_id");
    if (debtorId) references.debtorIds.add(debtorId);
    if (companyId) references.companyIds.add(companyId);

    if (!log.entity_id) continue;
    if (log.entity_type === "DEBTOR") references.debtorIds.add(log.entity_id);
    if (log.entity_type === "DEBT" && !debtorId) references.debtIds.add(log.entity_id);
    if (log.entity_type === "PAYMENT" && !debtorId) references.paymentIds.add(log.entity_id);
    if (log.entity_type === "PAYMENT_REMINDER" && !debtorId) references.reminderIds.add(log.entity_id);
    if (log.entity_type === "COMPANY") references.companyIds.add(log.entity_id);
    if (log.entity_type === "COMPANY_DEBT" && !companyId) references.companyDebtIds.add(log.entity_id);
    if ((log.entity_type === "COMPANY_PAYMENT" || log.entity_type === "COMPANY_PAYMENT_RECEIPT") && !companyId) {
      references.companyPaymentIds.add(log.entity_id);
    }

    if (log.entity_type === "AUDIT_LOG") {
      const source = jsonRecord(log.old_value);
      const sourceId = positiveId(source?.source_entity_id);
      if (sourceId && source?.source_entity_type === "DEBTOR") references.debtorIds.add(sourceId);
      if (sourceId && source?.source_entity_type === "COMPANY") references.companyIds.add(sourceId);
    }
  }

  return {
    debtorIds: [...references.debtorIds],
    debtIds: [...references.debtIds],
    paymentIds: [...references.paymentIds],
    reminderIds: [...references.reminderIds],
    companyIds: [...references.companyIds],
    companyDebtIds: [...references.companyDebtIds],
    companyPaymentIds: [...references.companyPaymentIds],
  };
}

function fullName(firstName: string, lastName: string): string {
  return [firstName, lastName].filter(Boolean).join(" ");
}

function debtorSubject(firstName: string, lastName: string, externalId: string): AuditSubject {
  return {
    name: fullName(firstName, lastName),
    href: `/dashboard/default/debitor/${externalId}`,
  };
}

function companySubject(name: string, externalId: string): AuditSubject {
  return { name, href: `/dashboard/my-debts/${externalId}` };
}

function subjectMaps(rows: SubjectRows): SubjectMaps {
  return {
    debtors: new Map(
      rows.debtors.map((row) => [row.id, debtorSubject(row.first_name, row.last_name, row.external_id)]),
    ),
    debts: new Map(
      rows.debts.map((row) => [
        row.id,
        debtorSubject(row.debtor.first_name, row.debtor.last_name, row.debtor.external_id),
      ]),
    ),
    payments: new Map(
      rows.payments.map((row) => [
        row.id,
        debtorSubject(row.debtor.first_name, row.debtor.last_name, row.debtor.external_id),
      ]),
    ),
    reminders: new Map(
      rows.reminders.map((row) => [
        row.id,
        debtorSubject(row.debtor.first_name, row.debtor.last_name, row.debtor.external_id),
      ]),
    ),
    companies: new Map(rows.companies.map((row) => [row.id, companySubject(row.name, row.external_id)])),
    companyDebts: new Map(
      rows.companyDebts.map((row) => [row.id, companySubject(row.company.name, row.company.external_id)]),
    ),
    companyPayments: new Map(
      rows.companyPayments.map((row) => [row.id, companySubject(row.company.name, row.company.external_id)]),
    ),
  };
}

function resolvedSubject(log: RecentAuditLogRecord, subjects: SubjectMaps): AuditSubject | null {
  const inline = inlineSubjectName(log);
  let referenced: AuditSubject | null = null;
  const debtorId = auditFieldId(log, "debtor_id");
  const companyId = auditFieldId(log, "company_id");
  if (debtorId) referenced = subjects.debtors.get(debtorId) ?? null;
  else if (companyId) referenced = subjects.companies.get(companyId) ?? null;
  else if (log.entity_id && log.entity_type === "DEBTOR") referenced = subjects.debtors.get(log.entity_id) ?? null;
  else if (log.entity_id && log.entity_type === "DEBT") referenced = subjects.debts.get(log.entity_id) ?? null;
  else if (log.entity_id && log.entity_type === "PAYMENT") referenced = subjects.payments.get(log.entity_id) ?? null;
  else if (log.entity_id && log.entity_type === "PAYMENT_REMINDER") {
    referenced = subjects.reminders.get(log.entity_id) ?? null;
  } else if (log.entity_id && log.entity_type === "COMPANY") {
    referenced = subjects.companies.get(log.entity_id) ?? null;
  } else if (log.entity_id && log.entity_type === "COMPANY_DEBT") {
    referenced = subjects.companyDebts.get(log.entity_id) ?? null;
  } else if (
    log.entity_id &&
    (log.entity_type === "COMPANY_PAYMENT" || log.entity_type === "COMPANY_PAYMENT_RECEIPT")
  ) {
    referenced = subjects.companyPayments.get(log.entity_id) ?? null;
  } else if (log.entity_type === "AUDIT_LOG") {
    const source = jsonRecord(log.old_value);
    const sourceId = positiveId(source?.source_entity_id);
    if (source?.source_entity_type === "DEBTOR" && sourceId) referenced = subjects.debtors.get(sourceId) ?? null;
    if (source?.source_entity_type === "COMPANY" && sourceId) referenced = subjects.companies.get(sourceId) ?? null;
  }

  return inline ? { name: inline, href: referenced?.href ?? null } : referenced;
}

export class AuditLogService {
  async getLogPresentations(
    clientId: number,
    logs: RecentAuditLogRecord[],
  ): Promise<Map<number, AuditLogPresentation>> {
    if (logs.length === 0) return new Map();

    const rows = await auditLogRepository.findSubjectRows(clientId, collectSubjectReferences(logs));
    const subjects = subjectMaps(rows);

    return new Map(
      logs.map((log) => {
        const subject = resolvedSubject(log, subjects);
        const source = auditSource(log);

        return [
          log.id,
          {
            subjectName: subject?.name ?? null,
            subjectHref: subject?.href ?? null,
            amount: auditAmount(log),
            displayEntityType: source.entityType,
            sourceAction: source.action,
          },
        ];
      }),
    );
  }

  async getRecentActions({
    clientId,
    actorRole,
    canUndo,
    canCancel,
    limit = 10,
  }: RecentAuditActionsOptions): Promise<RecentAuditAction[]> {
    const logs = await auditLogRepository.findRecentByClientId(clientId, limit);
    const userIds = [...new Set(logs.flatMap((log) => (log.user_id === null ? [] : [log.user_id])))];

    const [actors, subjectRows, undoableIds, cancellableIds] = await Promise.all([
      auditLogRepository.findActorsByIds(clientId, userIds),
      auditLogRepository.findSubjectRows(clientId, collectSubjectReferences(logs)),
      undoableAuditIds(clientId, logs, canUndo, actorRole),
      cancellableAuditIds(clientId, logs, canCancel),
    ]);

    const actorsById = new Map(actors.map((actor) => [actor.id, actor]));
    const subjects = subjectMaps(subjectRows);
    const undoable = new Set(undoableIds);
    const cancellable = new Set(cancellableIds);

    return logs.map((log) => {
      const actor = log.user_id === null ? undefined : actorsById.get(log.user_id);
      const fullName = actor ? [actor.first_name, actor.last_name].filter(Boolean).join(" ") : "";
      const subject = resolvedSubject(log, subjects);

      return {
        id: log.id,
        action: log.action,
        entityType: log.entity_type,
        createdAt: log.created_at.toISOString(),
        amount: auditAmount(log),
        subjectName: subject?.name ?? null,
        subjectHref: subject?.href ?? null,
        actor: actor
          ? {
              id: actor.id,
              username: actor.username,
              displayName: fullName || actor.username,
              role: actor.role,
            }
          : null,
        canUndo: undoable.has(log.id),
        canCancel: cancellable.has(log.id),
      };
    });
  }
}

export const auditLogService = new AuditLogService();
