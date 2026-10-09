ALTER TABLE "company_debts" ADD COLUMN "reverses_company_debt_id" INTEGER;
ALTER TABLE "company_payments" ADD COLUMN "reverses_company_payment_id" INTEGER;

CREATE UNIQUE INDEX "company_debts_reverses_company_debt_id_key"
  ON "company_debts"("reverses_company_debt_id");
CREATE UNIQUE INDEX "company_payments_reverses_company_payment_id_key"
  ON "company_payments"("reverses_company_payment_id");
CREATE UNIQUE INDEX "company_debts_id_client_id_key" ON "company_debts"("id", "client_id");
CREATE UNIQUE INDEX "company_payments_id_client_id_key" ON "company_payments"("id", "client_id");

ALTER TABLE "company_debts" ADD CONSTRAINT "company_debts_reverses_company_debt_id_client_id_fkey"
  FOREIGN KEY ("reverses_company_debt_id", "client_id") REFERENCES "company_debts"("id", "client_id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "company_payments" ADD CONSTRAINT "company_payments_reverses_company_payment_id_client_id_fkey"
  FOREIGN KEY ("reverses_company_payment_id", "client_id") REFERENCES "company_payments"("id", "client_id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "company_debts" ADD CONSTRAINT "company_debts_reversal_amount_check"
  CHECK ("reverses_company_debt_id" IS NULL OR "amount" < 0);
ALTER TABLE "company_payments" ADD CONSTRAINT "company_payments_reversal_amount_check"
  CHECK ("reverses_company_payment_id" IS NULL OR "amount" < 0);
