-- CreateTable
CREATE TABLE "clients" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clients_slug_key" ON "clients"("slug");

-- Default tenant for existing production data (display name Feat; slug stays default for lookups)
INSERT INTO "clients" ("name", "slug", "is_active", "created_at", "updated_at")
VALUES ('Feat', 'default', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Add nullable client_id columns
ALTER TABLE "users" ADD COLUMN "client_id" INTEGER;
ALTER TABLE "debtors" ADD COLUMN "client_id" INTEGER;
ALTER TABLE "debts" ADD COLUMN "client_id" INTEGER;
ALTER TABLE "payments" ADD COLUMN "client_id" INTEGER;
ALTER TABLE "settings" ADD COLUMN "client_id" INTEGER;
ALTER TABLE "audit_logs" ADD COLUMN "client_id" INTEGER;
ALTER TABLE "notifications" ADD COLUMN "client_id" INTEGER;
ALTER TABLE "payment_reminders" ADD COLUMN "client_id" INTEGER;
ALTER TABLE "import_history" ADD COLUMN "client_id" INTEGER;
ALTER TABLE "companies" ADD COLUMN "client_id" INTEGER;
ALTER TABLE "company_debts" ADD COLUMN "client_id" INTEGER;
ALTER TABLE "company_payments" ADD COLUMN "client_id" INTEGER;
ALTER TABLE "company_daily_snapshots" ADD COLUMN "client_id" INTEGER;

-- Backfill all existing rows to default client
UPDATE "users" SET "client_id" = (SELECT "id" FROM "clients" WHERE "slug" = 'default' LIMIT 1);
UPDATE "debtors" SET "client_id" = (SELECT "id" FROM "clients" WHERE "slug" = 'default' LIMIT 1);
UPDATE "debts" SET "client_id" = (SELECT "id" FROM "clients" WHERE "slug" = 'default' LIMIT 1);
UPDATE "payments" SET "client_id" = (SELECT "id" FROM "clients" WHERE "slug" = 'default' LIMIT 1);
UPDATE "settings" SET "client_id" = (SELECT "id" FROM "clients" WHERE "slug" = 'default' LIMIT 1);
UPDATE "audit_logs" SET "client_id" = (SELECT "id" FROM "clients" WHERE "slug" = 'default' LIMIT 1);
UPDATE "notifications" SET "client_id" = (SELECT "id" FROM "clients" WHERE "slug" = 'default' LIMIT 1);
UPDATE "payment_reminders" SET "client_id" = (SELECT "id" FROM "clients" WHERE "slug" = 'default' LIMIT 1);
UPDATE "import_history" SET "client_id" = (SELECT "id" FROM "clients" WHERE "slug" = 'default' LIMIT 1);
UPDATE "companies" SET "client_id" = (SELECT "id" FROM "clients" WHERE "slug" = 'default' LIMIT 1);
UPDATE "company_debts" SET "client_id" = (SELECT "id" FROM "clients" WHERE "slug" = 'default' LIMIT 1);
UPDATE "company_payments" SET "client_id" = (SELECT "id" FROM "clients" WHERE "slug" = 'default' LIMIT 1);
UPDATE "company_daily_snapshots" SET "client_id" = (SELECT "id" FROM "clients" WHERE "slug" = 'default' LIMIT 1);

-- Drop old unique constraints before making NOT NULL
DROP INDEX IF EXISTS "settings_key_key";
ALTER TABLE "settings" DROP CONSTRAINT IF EXISTS "settings_key_key";
DROP INDEX IF EXISTS "company_daily_snapshots_date_key";
ALTER TABLE "company_daily_snapshots" DROP CONSTRAINT IF EXISTS "company_daily_snapshots_date_key";

-- Set NOT NULL
ALTER TABLE "users" ALTER COLUMN "client_id" SET NOT NULL;
ALTER TABLE "debtors" ALTER COLUMN "client_id" SET NOT NULL;
ALTER TABLE "debts" ALTER COLUMN "client_id" SET NOT NULL;
ALTER TABLE "payments" ALTER COLUMN "client_id" SET NOT NULL;
ALTER TABLE "settings" ALTER COLUMN "client_id" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "client_id" SET NOT NULL;
ALTER TABLE "notifications" ALTER COLUMN "client_id" SET NOT NULL;
ALTER TABLE "payment_reminders" ALTER COLUMN "client_id" SET NOT NULL;
ALTER TABLE "import_history" ALTER COLUMN "client_id" SET NOT NULL;
ALTER TABLE "companies" ALTER COLUMN "client_id" SET NOT NULL;
ALTER TABLE "company_debts" ALTER COLUMN "client_id" SET NOT NULL;
ALTER TABLE "company_payments" ALTER COLUMN "client_id" SET NOT NULL;
ALTER TABLE "company_daily_snapshots" ALTER COLUMN "client_id" SET NOT NULL;

-- Foreign keys
ALTER TABLE "users" ADD CONSTRAINT "users_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "debtors" ADD CONSTRAINT "debtors_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "debts" ADD CONSTRAINT "debts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "settings" ADD CONSTRAINT "settings_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "import_history" ADD CONSTRAINT "import_history_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "companies" ADD CONSTRAINT "companies_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "company_debts" ADD CONSTRAINT "company_debts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "company_payments" ADD CONSTRAINT "company_payments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "company_daily_snapshots" ADD CONSTRAINT "company_daily_snapshots_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "users_client_id_idx" ON "users"("client_id");
CREATE INDEX "debtors_client_id_idx" ON "debtors"("client_id");
CREATE INDEX "debts_client_id_idx" ON "debts"("client_id");
CREATE INDEX "payments_client_id_idx" ON "payments"("client_id");
CREATE INDEX "settings_client_id_idx" ON "settings"("client_id");
CREATE INDEX "audit_logs_client_id_idx" ON "audit_logs"("client_id");
CREATE INDEX "notifications_client_id_idx" ON "notifications"("client_id");
CREATE INDEX "payment_reminders_client_id_idx" ON "payment_reminders"("client_id");
CREATE INDEX "import_history_client_id_idx" ON "import_history"("client_id");
CREATE INDEX "companies_client_id_idx" ON "companies"("client_id");
CREATE INDEX "company_debts_client_id_idx" ON "company_debts"("client_id");
CREATE INDEX "company_payments_client_id_idx" ON "company_payments"("client_id");
CREATE INDEX "company_daily_snapshots_client_id_idx" ON "company_daily_snapshots"("client_id");

-- New unique constraints
CREATE UNIQUE INDEX "settings_client_id_key_key" ON "settings"("client_id", "key");
CREATE UNIQUE INDEX "company_daily_snapshots_client_id_date_key" ON "company_daily_snapshots"("client_id", "date");
