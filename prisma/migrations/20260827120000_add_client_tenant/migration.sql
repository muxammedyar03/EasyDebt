-- Multi-tenant Client (idempotent — safe if partially applied or optional tables missing on prod)

CREATE TABLE IF NOT EXISTS "clients" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "clients_slug_key" ON "clients"("slug");

INSERT INTO "clients" ("name", "slug", "is_active", "created_at", "updated_at")
SELECT 'Feat', 'default', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "clients" WHERE "slug" = 'default');

DO $$
DECLARE
  tbl text;
  tenant_tables text[] := ARRAY[
    'users', 'debtors', 'debts', 'payments', 'settings', 'audit_logs', 'notifications',
    'payment_reminders', 'import_history', 'companies', 'company_debts',
    'company_payments', 'company_daily_snapshots'
  ];
  default_id integer;
BEGIN
  SELECT id INTO default_id FROM "clients" WHERE "slug" = 'default' LIMIT 1;
  IF default_id IS NULL THEN
    RAISE EXCEPTION 'Default client (slug=default) not found';
  END IF;

  FOREACH tbl IN ARRAY tenant_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS client_id INTEGER', tbl);
      EXECUTE format(
        'UPDATE %I SET client_id = $1 WHERE client_id IS NULL',
        tbl
      ) USING default_id;
      EXECUTE format('ALTER TABLE %I ALTER COLUMN client_id SET NOT NULL', tbl);
    END IF;
  END LOOP;
END $$;

DROP INDEX IF EXISTS "settings_key_key";
ALTER TABLE "settings" DROP CONSTRAINT IF EXISTS "settings_key_key";
DROP INDEX IF EXISTS "company_daily_snapshots_date_key";
ALTER TABLE "company_daily_snapshots" DROP CONSTRAINT IF EXISTS "company_daily_snapshots_date_key";

DO $$
DECLARE
  tbl text;
  fk_name text;
  tenant_tables text[] := ARRAY[
    'users', 'debtors', 'debts', 'payments', 'settings', 'audit_logs', 'notifications',
    'payment_reminders', 'import_history', 'companies', 'company_debts',
    'company_payments', 'company_daily_snapshots'
  ];
BEGIN
  FOREACH tbl IN ARRAY tenant_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'client_id'
    ) THEN
      fk_name := tbl || '_client_id_fkey';
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = fk_name
      ) THEN
        EXECUTE format(
          'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT ON UPDATE CASCADE',
          tbl, fk_name
        );
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = tbl || '_client_id_idx'
      ) THEN
        EXECUTE format('CREATE INDEX %I ON %I(client_id)', tbl || '_client_id_idx', tbl);
      END IF;
    END IF;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "settings_client_id_key_key" ON "settings"("client_id", "key");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'company_daily_snapshots'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "company_daily_snapshots_client_id_date_key"
      ON "company_daily_snapshots"("client_id", "date");
  END IF;
END $$;
