-- CreateEnum
CREATE TYPE "PaymentReminderStatus" AS ENUM ('PENDING', 'NOTIFIED', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PAYMENT_REMINDER';

-- CreateTable
CREATE TABLE "payment_reminders" (
    "id" SERIAL NOT NULL,
    "debtor_id" INTEGER NOT NULL,
    "created_by" INTEGER NOT NULL,
    "reminder_at" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "status" "PaymentReminderStatus" NOT NULL DEFAULT 'PENDING',
    "notified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_reminders_debtor_id_idx" ON "payment_reminders"("debtor_id");

-- CreateIndex
CREATE INDEX "payment_reminders_reminder_at_idx" ON "payment_reminders"("reminder_at");

-- CreateIndex
CREATE INDEX "payment_reminders_status_idx" ON "payment_reminders"("status");

-- CreateIndex
CREATE INDEX "payment_reminders_created_by_idx" ON "payment_reminders"("created_by");

-- AddForeignKey
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_debtor_id_fkey" FOREIGN KEY ("debtor_id") REFERENCES "debtors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
