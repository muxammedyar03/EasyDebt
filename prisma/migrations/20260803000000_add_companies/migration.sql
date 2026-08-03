-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "external_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact_person" TEXT,
    "phone_number" TEXT,
    "address" TEXT,
    "total_debt" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "last_payment_date" TIMESTAMP(3),
    "last_debt_date" TIMESTAMP(3),
    "is_overdue" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_debts" (
    "id" SERIAL NOT NULL,
    "external_id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "note" TEXT NOT NULL,
    "items" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER NOT NULL,

    CONSTRAINT "company_debts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_payments" (
    "id" SERIAL NOT NULL,
    "external_id" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_type" "PaymentType" NOT NULL DEFAULT 'CASH',
    "note" TEXT NOT NULL,
    "receipt_path" TEXT,
    "receipt_mime" TEXT,
    "receipt_size" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER NOT NULL,

    CONSTRAINT "company_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_daily_snapshots" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "total_outstanding_debt" DECIMAL(12,2) NOT NULL,
    "debts_sum" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "debts_count" INTEGER NOT NULL DEFAULT 0,
    "payments_sum" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payments_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_daily_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_external_id_key" ON "companies"("external_id");

-- CreateIndex
CREATE INDEX "companies_total_debt_idx" ON "companies"("total_debt");

-- CreateIndex
CREATE INDEX "companies_created_by_idx" ON "companies"("created_by");

-- CreateIndex
CREATE INDEX "companies_created_at_idx" ON "companies"("created_at");

-- CreateIndex
CREATE INDEX "companies_is_overdue_idx" ON "companies"("is_overdue");

-- CreateIndex
CREATE INDEX "companies_last_payment_date_idx" ON "companies"("last_payment_date");

-- CreateIndex
CREATE INDEX "companies_last_debt_date_idx" ON "companies"("last_debt_date");

-- CreateIndex
CREATE INDEX "companies_external_id_idx" ON "companies"("external_id");

-- CreateIndex
CREATE INDEX "companies_name_idx" ON "companies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "company_debts_external_id_key" ON "company_debts"("external_id");

-- CreateIndex
CREATE INDEX "company_debts_company_id_idx" ON "company_debts"("company_id");

-- CreateIndex
CREATE INDEX "company_debts_created_at_idx" ON "company_debts"("created_at");

-- CreateIndex
CREATE INDEX "company_debts_external_id_idx" ON "company_debts"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_payments_external_id_key" ON "company_payments"("external_id");

-- CreateIndex
CREATE INDEX "company_payments_company_id_idx" ON "company_payments"("company_id");

-- CreateIndex
CREATE INDEX "company_payments_created_at_idx" ON "company_payments"("created_at");

-- CreateIndex
CREATE INDEX "company_payments_external_id_idx" ON "company_payments"("external_id");

-- CreateIndex
CREATE INDEX "company_payments_receipt_path_idx" ON "company_payments"("receipt_path");

-- CreateIndex
CREATE UNIQUE INDEX "company_daily_snapshots_date_key" ON "company_daily_snapshots"("date");

-- CreateIndex
CREATE INDEX "company_daily_snapshots_date_idx" ON "company_daily_snapshots"("date");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_debts" ADD CONSTRAINT "company_debts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_debts" ADD CONSTRAINT "company_debts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_payments" ADD CONSTRAINT "company_payments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_payments" ADD CONSTRAINT "company_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
