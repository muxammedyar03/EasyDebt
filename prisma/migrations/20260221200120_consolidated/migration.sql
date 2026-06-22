-- AlterTable
ALTER TABLE "debtors" ALTER COLUMN "external_id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "debts" ALTER COLUMN "external_id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "external_id" DROP DEFAULT;
