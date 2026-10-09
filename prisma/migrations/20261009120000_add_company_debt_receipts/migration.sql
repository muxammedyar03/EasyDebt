ALTER TABLE "company_debts"
  ADD COLUMN "receipt_path" TEXT,
  ADD COLUMN "receipt_name" TEXT,
  ADD COLUMN "receipt_mime" TEXT,
  ADD COLUMN "receipt_size" INTEGER;

CREATE INDEX "company_debts_receipt_path_idx" ON "company_debts"("receipt_path");
