-- Add is_active column for databases migrated from legacy multi-tenant schema
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;

-- Backfill from legacy UserStatus enum when present (no-op on fresh installs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'status'
  ) THEN
    UPDATE "users"
    SET "is_active" = ("status"::text = 'ACTIVE')
    WHERE "status" IS NOT NULL;
  END IF;
END $$;
