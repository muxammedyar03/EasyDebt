-- AlterTable
ALTER TABLE "client_permissions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "platform_permissions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "user_permissions" ALTER COLUMN "updated_at" DROP DEFAULT;
