-- AlterTable
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "carrier_code" TEXT,
ADD COLUMN IF NOT EXISTS "label_url" TEXT;
