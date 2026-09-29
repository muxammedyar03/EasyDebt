import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "PAYMENT_ADDED"
  | "DEBT_ADDED"
  | "DEBT_UPDATED"
  | "PAYMENT_UPDATED"
  | "IMPORT"
  | "EXPORT";

export type EntityType =
  | "DEBTOR"
  | "DEBT"
  | "PAYMENT"
  | "USER"
  | "SETTINGS"
  | "PAYMENT_REMINDER"
  | "COMPANY"
  | "COMPANY_DEBT"
  | "COMPANY_PAYMENT"
  | "COMPANY_PAYMENT_RECEIPT"
  | "CLIENT";

interface AuditLogData {
  userId?: number;
  clientId: number;
  action: AuditAction;
  entityType: EntityType;
  entityId?: number;
  oldValue?: unknown;
  newValue?: unknown;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
}

/** Use inside the same transaction as the financial mutation. Failure aborts both writes. */
export async function createRequiredAuditLog(tx: Prisma.TransactionClient, data: AuditLogData) {
  return tx.auditLog.create({
    data: {
      user_id: data.userId,
      client_id: data.clientId,
      action: data.action,
      entity_type: data.entityType,
      entity_id: data.entityId,
      old_value: data.oldValue ? (data.oldValue as Prisma.InputJsonValue) : Prisma.JsonNull,
      new_value: data.newValue ? (data.newValue as Prisma.InputJsonValue) : Prisma.JsonNull,
      description: data.description,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
    },
  });
}

export async function createAuditLog(data: AuditLogData) {
  try {
    await createRequiredAuditLog(prisma, data);
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

export async function getAuditLogs(filters?: {
  clientId: number;
  userId?: number;
  entityType?: EntityType;
  entityId?: number;
  limit?: number;
  offset?: number;
}) {
  const where: {
    client_id: number;
    user_id?: number;
    entity_type?: string;
    entity_id?: number;
  } = {
    client_id: filters!.clientId,
  };

  if (filters?.userId) where.user_id = filters.userId;
  if (filters?.entityType) where.entity_type = filters.entityType;
  if (filters?.entityId) where.entity_id = filters.entityId;

  return await prisma.auditLog.findMany({
    where,
    orderBy: { created_at: "desc" },
    take: filters?.limit || 50,
    skip: filters?.offset || 0,
  });
}
