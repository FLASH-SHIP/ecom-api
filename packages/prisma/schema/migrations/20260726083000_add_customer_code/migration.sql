-- AlterTable
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "customer_code" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "customers_customer_code_key" ON "customers"("customer_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "customers_customer_code_idx" ON "customers"("customer_code");
