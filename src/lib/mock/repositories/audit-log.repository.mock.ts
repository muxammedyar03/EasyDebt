import type { Prisma } from "@prisma/client";
import { mockCountAuditLogs, mockFindAuditLogs } from "../mock-store";

export class MockAuditLogRepository {
  async findMany(
    where: Prisma.AuditLogWhereInput,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.AuditLogOrderByWithRelationInput;
    },
  ) {
    return mockFindAuditLogs(where, options);
  }

  async count(where: Prisma.AuditLogWhereInput) {
    return mockCountAuditLogs(where);
  }
}

export const mockAuditLogRepository = new MockAuditLogRepository();
