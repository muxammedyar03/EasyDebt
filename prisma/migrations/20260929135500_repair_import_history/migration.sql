-- The table is present in the original migration, but an older production
-- database may have a recorded migration with the table subsequently removed.
-- Recreate only missing schema; do not touch existing import history rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'ImportStatus'
  ) THEN
    CREATE TYPE "ImportStatus" AS ENUM ('SUCCESS', 'FAILED', 'PARTIAL');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "import_history" (
  "id" SERIAL NOT NULL,
  "user_id" INTEGER NOT NULL,
  "file_hash" TEXT NOT NULL,
  "debtors_count" INTEGER NOT NULL,
  "debts_count" INTEGER NOT NULL,
  "payments_count" INTEGER NOT NULL,
  "status" "ImportStatus" NOT NULL DEFAULT 'SUCCESS',
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "client_id" INTEGER NOT NULL,
  CONSTRAINT "import_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "import_history_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "import_history_file_hash_key" ON "import_history"("file_hash");
CREATE INDEX IF NOT EXISTS "import_history_user_id_idx" ON "import_history"("user_id");
CREATE INDEX IF NOT EXISTS "import_history_created_at_idx" ON "import_history"("created_at");
CREATE INDEX IF NOT EXISTS "import_history_client_id_idx" ON "import_history"("client_id");
