import { ensureSecurityTables } from "./security-tables";
import { enforceTenantRelations } from "./tenant-relations";
import { PrismaClient } from "@prisma/client";
import { createPrismaAdapter } from "./adapter";
import { createMigrationBuilder } from "./builder";
import { assertClientTenantIntegrity } from "./assert-client-tenant";

/**
 * Custom Migration System for EasyDebt
 *
 * Advantages over Prisma migrations:
 * - Idempotent: Safe to run multiple times
 * - Branch-friendly: No migration conflicts
 * - Flexible: Supports code migrations
 * - Safe: All changes in transactions
 */
export async function runCustomMigrations(prisma: PrismaClient) {
  const adapter = createPrismaAdapter(prisma);

  console.log("🚀 Running custom migrations...");

  // Create migrations tracking table
  await adapter.exec(`
    CREATE TABLE IF NOT EXISTS _custom_migrations (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      name TEXT NOT NULL UNIQUE
    );
  `);

  // ===== YOUR MIGRATIONS HERE =====

  // Example: Add external_id to existing tables (idempotent)
  await createMigrationBuilder("2024-12-26-add-external-ids-fixed", adapter)
    .addColumn("debtors", "external_id", "UUID")
    .addColumn("debts", "external_id", "UUID")
    .addColumn("payments", "external_id", "UUID")
    .code(async (adapter) => {
      // Generate UUIDs for existing records
      await adapter.exec(`UPDATE debtors SET external_id = gen_random_uuid() WHERE external_id IS NULL`);
      await adapter.exec(`UPDATE debts SET external_id = gen_random_uuid() WHERE external_id IS NULL`);
      await adapter.exec(`UPDATE payments SET external_id = gen_random_uuid() WHERE external_id IS NULL`);
      return [];
    })
    .commit();

  // Example: Create ImportHistory table
  await createMigrationBuilder("2024-12-25-create-import-history", adapter)
    .createTable("ImportHistory", {
      id: "SERIAL PRIMARY KEY",
      file_hash: "TEXT NOT NULL UNIQUE",
      imported_at: "TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP",
      imported_by: "INTEGER NOT NULL",
      debtor_count: "INTEGER NOT NULL",
      debt_count: "INTEGER NOT NULL",
      payment_count: "INTEGER NOT NULL",
    })
    .run('CREATE INDEX IF NOT EXISTS "ImportHistory_imported_by_idx" ON "ImportHistory"("imported_by")')
    .commit();

  // Example: Add description to audit_log
  await createMigrationBuilder("2024-12-25-add-audit-log-description", adapter)
    .addColumn("audit_log", "description", "TEXT")
    .commit();

  // Example: Add push_subscription to users table
  await createMigrationBuilder("2026-02-14-add-push-subscription-to-users", adapter)
    .addColumn("users", "push_subscription", "JSONB")
    .commit();

  // Example: Add push_preferences to users table
  await createMigrationBuilder("2026-02-14-add-push-preferences-to-users", adapter)
    .addColumn("users", "push_preferences", "JSONB")
    .commit();

  // Example: Add PushSubscription table and UserPushPreferences table
  await createMigrationBuilder("2026-02-14-add-push-subscription-and-preferences-tables", adapter)
    .createTable("PushSubscription", {
      id: "SERIAL PRIMARY KEY",
      user_id: "INTEGER NOT NULL",
      endpoint: "TEXT NOT NULL",
      p256dh: "TEXT NOT NULL",
      auth: "TEXT NOT NULL",
    })
    .createTable("UserPushPreferences", {
      id: "SERIAL PRIMARY KEY",
      user_id: "INTEGER NOT NULL",
      enabled: "BOOLEAN NOT NULL DEFAULT false",
      notification_types: "JSONB NOT NULL DEFAULT '[]'",
    })
    .run('CREATE INDEX IF NOT EXISTS "PushSubscription_user_id_idx" ON "PushSubscription"("user_id")')
    .run(
      'CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_user_id_endpoint_key" ON "PushSubscription"("user_id", "endpoint")',
    )
    .run('CREATE INDEX IF NOT EXISTS "UserPushPreferences_user_id_idx" ON "UserPushPreferences"("user_id")')
    .run('CREATE UNIQUE INDEX IF NOT EXISTS "UserPushPreferences_user_id_key" ON "UserPushPreferences"("user_id")')
    .commit();

  console.log("PushSubscription table and UserPushPreferences table created successfully");

  // Fail migrate container if tenant backfill is incomplete (blocks app start)
  await assertClientTenantIntegrity(prisma);
  await enforceTenantRelations(prisma);
  await ensureSecurityTables(prisma);

  console.log("✅ All custom migrations completed successfully!");
}

/**
 * Helper function to create a new migration
 */
export function migration(name: string, prisma: PrismaClient) {
  const adapter = createPrismaAdapter(prisma);
  return createMigrationBuilder(name, adapter);
}
