import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { shouldUseMockData } from "@/lib/mock/is-mock-mode";

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

export type EntityType = "DEBTOR" | "DEBT" | "PAYMENT" | "USER" | "SETTINGS" | "PAYMENT_REMINDER";

interface AuditLogData {
  userId?: number;
  action: AuditAction;
  entityType: EntityType;
  entityId?: number;
  oldValue?: unknown;
  newValue?: unknown;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(data: AuditLogData) {
  if (await shouldUseMockData()) return;
  try {
    await prisma.auditLog.create({
      data: {
        user_id: data.userId,
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
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

export async function getAuditLogs(filters?: {
  userId?: number;
  entityType?: EntityType;
  entityId?: number;
  limit?: number;
  offset?: number;
}) {
  const where: {
    user_id?: number;
    entity_type?: string;
    entity_id?: number;
  } = {};

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
