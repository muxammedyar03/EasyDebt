ALTER TABLE "debts" ADD COLUMN "reverses_debt_id" INTEGER;
ALTER TABLE "payments" ADD COLUMN "reverses_payment_id" INTEGER;

CREATE UNIQUE INDEX "debts_reverses_debt_id_key" ON "debts"("reverses_debt_id");
CREATE UNIQUE INDEX "payments_reverses_payment_id_key" ON "payments"("reverses_payment_id");
CREATE UNIQUE INDEX "debts_id_client_id_key" ON "debts"("id", "client_id");
CREATE UNIQUE INDEX "payments_id_client_id_key" ON "payments"("id", "client_id");

ALTER TABLE "debts" ADD CONSTRAINT "debts_reverses_debt_id_client_id_fkey"
  FOREIGN KEY ("reverses_debt_id", "client_id") REFERENCES "debts"("id", "client_id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "payments" ADD CONSTRAINT "payments_reverses_payment_id_client_id_fkey"
  FOREIGN KEY ("reverses_payment_id", "client_id") REFERENCES "payments"("id", "client_id")
  ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "debts" ADD CONSTRAINT "debts_reversal_amount_check"
  CHECK ("reverses_debt_id" IS NULL OR "amount" < 0);
ALTER TABLE "payments" ADD CONSTRAINT "payments_reversal_amount_check"
  CHECK ("reverses_payment_id" IS NULL OR "amount" < 0);
