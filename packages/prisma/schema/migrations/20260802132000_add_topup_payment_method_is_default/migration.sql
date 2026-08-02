-- AlterTable
ALTER TABLE "topup_payment_methods" ADD COLUMN IF NOT EXISTS "is_default" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "topup_payment_methods_status_deleted_at_is_default_idx" ON "topup_payment_methods"("status", "deleted_at", "is_default");
