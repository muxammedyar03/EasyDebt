import type { PrismaClient } from "@prisma/client";

const TENANT_TABLES = [
  "users",
  "debtors",
  "debts",
  "payments",
  "settings",
  "audit_logs",
  "notifications",
  "payment_reminders",
  "import_history",
  "companies",
  "company_debts",
  "company_payments",
  "company_daily_snapshots",
] as const;

async function tableExists(prisma: PrismaClient, table: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '${table}'
    ) AS exists`,
  );
  return Boolean(rows[0]?.exists);
}

async function columnExists(prisma: PrismaClient, table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = '${column}'
    ) AS exists`,
  );
  return Boolean(rows[0]?.exists);
}

/**
 * Post-migrate safety checks for multi-tenant Client.
 * Runs after `prisma migrate deploy` via scripts/migrate.ts.
 * Fails the migrate container so the app does not start on a bad tenant state.
 */
export async function assertClientTenantIntegrity(prisma: PrismaClient): Promise<void> {
  console.log("🔍 Asserting client tenant integrity...");

  await prisma.$executeRawUnsafe(`
    UPDATE clients
    SET name = 'Feat'
    WHERE slug = 'default' AND name IS DISTINCT FROM 'Feat'
  `);

  const defaultClient = await prisma.client.findFirst({
    where: { slug: "default" },
    select: { id: true, name: true, slug: true, is_active: true },
  });

  if (!defaultClient) {
    throw new Error('Client tenant check failed: no client with slug "default" (expected name Feat)');
  }

  if (defaultClient.name !== "Feat") {
    throw new Error(`Client tenant check failed: default client name is "${defaultClient.name}", expected "Feat"`);
  }

  const nullCounts: { table: string; nulls: number }[] = [];

  for (const table of TENANT_TABLES) {
    if (!(await tableExists(prisma, table))) {
      continue;
    }
    if (!(await columnExists(prisma, table, "client_id"))) {
      throw new Error(`Client tenant check failed: table "${table}" exists but client_id column is missing`);
    }

    const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM "${table}" WHERE client_id IS NULL`,
    );
    const count = Number(rows[0]?.count ?? 0);
    if (count > 0) {
      nullCounts.push({ table, nulls: count });
    }
  }

  if (nullCounts.length > 0) {
    const detail = nullCounts.map((r) => `${r.table}=${r.nulls}`).join(", ");
    throw new Error(`Client tenant check failed: NULL client_id rows found (${detail})`);
  }

  console.log(`✅ Client tenant OK: id=${defaultClient.id} name="${defaultClient.name}" slug="${defaultClient.slug}"`);
}
