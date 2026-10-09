import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const recentAuditLogSelect = Prisma.validator<Prisma.AuditLogSelect>()({
  id: true,
  user_id: true,
  action: true,
  entity_type: true,
  entity_id: true,
  old_value: true,
  new_value: true,
  created_at: true,
});

const recentAuditActorSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  username: true,
  first_name: true,
  last_name: true,
  role: true,
});

export type RecentAuditLogRecord = Prisma.AuditLogGetPayload<{ select: typeof recentAuditLogSelect }>;
export type RecentAuditActorRecord = Prisma.UserGetPayload<{ select: typeof recentAuditActorSelect }>;

export interface RecentAuditSubjectReferences {
  debtorIds: number[];
  debtIds: number[];
  paymentIds: number[];
  reminderIds: number[];
  companyIds: number[];
  companyDebtIds: number[];
  companyPaymentIds: number[];
}

/** Data access for the recent audit-actions read model. */
export class AuditLogRepository {
  async findRecentByClientId(clientId: number, limit: number): Promise<RecentAuditLogRecord[]> {
    return prisma.auditLog.findMany({
      where: { client_id: clientId },
      orderBy: { created_at: "desc" },
      take: limit,
      select: recentAuditLogSelect,
    });
  }

  async findActorsByIds(clientId: number, userIds: number[]): Promise<RecentAuditActorRecord[]> {
    if (userIds.length === 0) return [];

    return prisma.user.findMany({
      where: { client_id: clientId, id: { in: userIds } },
      select: recentAuditActorSelect,
    });
  }

  async findSubjectRows(clientId: number, references: RecentAuditSubjectReferences) {
    const [debtors, debts, payments, reminders, companies, companyDebts, companyPayments] = await Promise.all([
      references.debtorIds.length
        ? prisma.debtor.findMany({
            where: { client_id: clientId, id: { in: references.debtorIds } },
            select: { id: true, external_id: true, first_name: true, last_name: true },
          })
        : [],
      references.debtIds.length
        ? prisma.debt.findMany({
            where: { client_id: clientId, id: { in: references.debtIds } },
            select: {
              id: true,
              debtor: { select: { external_id: true, first_name: true, last_name: true } },
            },
          })
        : [],
      references.paymentIds.length
        ? prisma.payment.findMany({
            where: { client_id: clientId, id: { in: references.paymentIds } },
            select: {
              id: true,
              debtor: { select: { external_id: true, first_name: true, last_name: true } },
            },
          })
        : [],
      references.reminderIds.length
        ? prisma.paymentReminder.findMany({
            where: { client_id: clientId, id: { in: references.reminderIds } },
            select: {
              id: true,
              debtor: { select: { external_id: true, first_name: true, last_name: true } },
            },
          })
        : [],
      references.companyIds.length
        ? prisma.company.findMany({
            where: { client_id: clientId, id: { in: references.companyIds } },
            select: { id: true, external_id: true, name: true },
          })
        : [],
      references.companyDebtIds.length
        ? prisma.companyDebt.findMany({
            where: { client_id: clientId, id: { in: references.companyDebtIds } },
            select: { id: true, company: { select: { external_id: true, name: true } } },
          })
        : [],
      references.companyPaymentIds.length
        ? prisma.companyPayment.findMany({
            where: { client_id: clientId, id: { in: references.companyPaymentIds } },
            select: { id: true, company: { select: { external_id: true, name: true } } },
          })
        : [],
    ]);

    return { debtors, debts, payments, reminders, companies, companyDebts, companyPayments };
  }
}

export const auditLogRepository = new AuditLogRepository();
