import type { PrismaClient } from "@prisma/client";
export async function ensureSecurityTables(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS security_rate_limits (
    key TEXT PRIMARY KEY, window_start TIMESTAMPTZ NOT NULL, attempts INTEGER NOT NULL
  )`);
}
