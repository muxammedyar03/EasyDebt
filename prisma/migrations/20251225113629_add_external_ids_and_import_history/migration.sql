/*
  Warnings:

  - A unique constraint covering the columns `[external_id]` on the table `debtors` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[external_id]` on the table `debts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[external_id]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - The required column `external_id` was added to the `debtors` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `external_id` was added to the `debts` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `external_id` was added to the `payments` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('SUCCESS', 'FAILED', 'PARTIAL');

-- Step 1: Add external_id columns as NULLABLE
ALTER TABLE "debtors" ADD COLUMN IF NOT EXISTS "external_id" TEXT;
ALTER TABLE "debts" ADD COLUMN IF NOT EXISTS "external_id" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "external_id" TEXT;

-- Step 2: Populate external_id with UUID for existing rows
UPDATE "debtors" SET "external_id" = gen_random_uuid()::text WHERE "external_id" IS NULL;
UPDATE "debts" SET "external_id" = gen_random_uuid()::text WHERE "external_id" IS NULL;
UPDATE "payments" SET "external_id" = gen_random_uuid()::text WHERE "external_id" IS NULL;

-- Step 3: Make external_id NOT NULL
ALTER TABLE "debtors" ALTER COLUMN "external_id" SET NOT NULL;
ALTER TABLE "debts" ALTER COLUMN "external_id" SET NOT NULL;
ALTER TABLE "payments" ALTER COLUMN "external_id" SET NOT NULL;

-- CreateTable
CREATE TABLE "import_history" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "file_hash" TEXT NOT NULL,
    "debtors_count" INTEGER NOT NULL,
    "debts_count" INTEGER NOT NULL,
    "payments_count" INTEGER NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'SUCCESS',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "import_history_file_hash_key" ON "import_history"("file_hash");

-- CreateIndex
CREATE INDEX "import_history_user_id_idx" ON "import_history"("user_id");

-- CreateIndex
CREATE INDEX "import_history_created_at_idx" ON "import_history"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "debtors_external_id_key" ON "debtors"("external_id");

-- CreateIndex
CREATE INDEX "debtors_external_id_idx" ON "debtors"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "debts_external_id_key" ON "debts"("external_id");

-- CreateIndex
CREATE INDEX "debts_external_id_idx" ON "debts"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_external_id_key" ON "payments"("external_id");

-- CreateIndex
CREATE INDEX "payments_external_id_idx" ON "payments"("external_id");
