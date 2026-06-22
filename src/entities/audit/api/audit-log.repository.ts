import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * AuditLog entity – API (repository).
 * Data access only; no business logic.
 */
export class AuditLogRepository {
  async findMany(
    where: Prisma.AuditLogWhereInput,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.AuditLogOrderByWithRelationInput;
    },
  ) {
    return prisma.auditLog.findMany({
      where,
      ...options,
    });
  }

  async count(where: Prisma.AuditLogWhereInput) {
    return prisma.auditLog.count({ where });
  }
}

export const auditLogRepository = new AuditLogRepository();
