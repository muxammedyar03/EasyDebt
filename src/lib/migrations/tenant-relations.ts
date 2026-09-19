import type { PrismaClient } from "@prisma/client";

// Shared by the production runner and the SQL regression fixture.
export const tenantRelationStatements = [
  `CREATE UNIQUE INDEX IF NOT EXISTS "debtors_id_client_id_key" ON "debtors" ("id", "client_id")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "companies_id_client_id_key" ON "companies" ("id", "client_id")`,
  `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'debts_debtor_id_client_id_fkey' AND conrelid = '"debts"'::regclass) THEN
    ALTER TABLE "debts" ADD CONSTRAINT "debts_debtor_id_client_id_fkey"
      FOREIGN KEY ("debtor_id", "client_id") REFERENCES "debtors" ("id", "client_id")
      ON DELETE CASCADE ON UPDATE RESTRICT NOT VALID;
  END IF;
END $$`,
  `ALTER TABLE "debts" VALIDATE CONSTRAINT "debts_debtor_id_client_id_fkey"`,
  `ALTER TABLE "debts" DROP CONSTRAINT IF EXISTS "debts_debtor_id_fkey"`,
  `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_debtor_id_client_id_fkey' AND conrelid = '"payments"'::regclass) THEN
    ALTER TABLE "payments" ADD CONSTRAINT "payments_debtor_id_client_id_fkey"
      FOREIGN KEY ("debtor_id", "client_id") REFERENCES "debtors" ("id", "client_id")
      ON DELETE CASCADE ON UPDATE RESTRICT NOT VALID;
  END IF;
END $$`,
  `ALTER TABLE "payments" VALIDATE CONSTRAINT "payments_debtor_id_client_id_fkey"`,
  `ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_debtor_id_fkey"`,
  `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_reminders_debtor_id_client_id_fkey' AND conrelid = '"payment_reminders"'::regclass) THEN
    ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_debtor_id_client_id_fkey"
      FOREIGN KEY ("debtor_id", "client_id") REFERENCES "debtors" ("id", "client_id")
      ON DELETE CASCADE ON UPDATE RESTRICT NOT VALID;
  END IF;
END $$`,
  `ALTER TABLE "payment_reminders" VALIDATE CONSTRAINT "payment_reminders_debtor_id_client_id_fkey"`,
  `ALTER TABLE "payment_reminders" DROP CONSTRAINT IF EXISTS "payment_reminders_debtor_id_fkey"`,
  `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'company_debts_company_id_client_id_fkey' AND conrelid = '"company_debts"'::regclass) THEN
    ALTER TABLE "company_debts" ADD CONSTRAINT "company_debts_company_id_client_id_fkey"
      FOREIGN KEY ("company_id", "client_id") REFERENCES "companies" ("id", "client_id")
      ON DELETE CASCADE ON UPDATE RESTRICT NOT VALID;
  END IF;
END $$`,
  `ALTER TABLE "company_debts" VALIDATE CONSTRAINT "company_debts_company_id_client_id_fkey"`,
  `ALTER TABLE "company_debts" DROP CONSTRAINT IF EXISTS "company_debts_company_id_fkey"`,
  `DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'company_payments_company_id_client_id_fkey' AND conrelid = '"company_payments"'::regclass) THEN
    ALTER TABLE "company_payments" ADD CONSTRAINT "company_payments_company_id_client_id_fkey"
      FOREIGN KEY ("company_id", "client_id") REFERENCES "companies" ("id", "client_id")
      ON DELETE CASCADE ON UPDATE RESTRICT NOT VALID;
  END IF;
END $$`,
  `ALTER TABLE "company_payments" VALIDATE CONSTRAINT "company_payments_company_id_client_id_fkey"`,
  `ALTER TABLE "company_payments" DROP CONSTRAINT IF EXISTS "company_payments_company_id_fkey"`,
];

/** Add constraints on one connection. Existing inconsistent data aborts the
 * migration; never guess which shop owns it or silently rewrite financial data.
 */
export async function enforceTenantRelations(prisma: PrismaClient) {
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(20260919, 1)`;
      for (const statement of tenantRelationStatements) {
        await tx.$executeRawUnsafe(statement);
      }
    },
    { timeout: 60000, maxWait: 10000 },
  );
}
