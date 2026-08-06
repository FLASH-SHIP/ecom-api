-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "TopupContentStatus" AS ENUM ('PUBLISHED', 'UNPUBLISHED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "topup_payment_methods" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TopupContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "is_bank" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "icon" TEXT,
    "image" TEXT,
    "position" INTEGER DEFAULT NULL,
    "data_info" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "topup_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "topup_payment_method_partner_relations" (
    "id" SERIAL NOT NULL,
    "customer_id" UUID NOT NULL,
    "payment_method_id" INTEGER NOT NULL,
    "status" "TopupContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "topup_payment_method_partner_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "topup_transactions" (
    "id" SERIAL NOT NULL,
    "customer_id" UUID NOT NULL,
    "transaction_code" VARCHAR(255) NOT NULL,
    "topup_type" VARCHAR(50) NOT NULL DEFAULT 'ADDED_FUNDS',
    "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
    "submission_date" TIMESTAMP(3),
    "wire_date" TIMESTAMP(3),
    "payment_method" INTEGER,
    "wire_amount" DECIMAL(12,2) DEFAULT 0,
    "wire_amount_approve" DECIMAL(12,2) DEFAULT 0,
    "rate" DECIMAL(12,2) DEFAULT 0,
    "description" VARCHAR(500),
    "order_id" UUID,
    "order_code" VARCHAR(255),
    "account_balance_before" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amount_change" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "account_balance_after" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 1,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topup_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "topup_transaction_wire_images" (
    "id" SERIAL NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "topup_transaction_wire_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "topup_transaction_histories" (
    "id" SERIAL NOT NULL,
    "action_name" VARCHAR(255) NOT NULL,
    "topup_transaction_id" INTEGER NOT NULL,
    "wire_amount_approved" DECIMAL(12,2) DEFAULT 0,
    "status" INTEGER,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topup_transaction_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "topup_exchange_rate_management" (
    "id" SERIAL NOT NULL,
    "rate" DECIMAL(12,2) NOT NULL,
    "note" VARCHAR(500),
    "status" "TopupContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "topup_exchange_rate_management_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "topup_payment_methods" ADD COLUMN IF NOT EXISTS "is_default" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "topup_payment_methods_status_deleted_at_is_default_idx" ON "topup_payment_methods"("status", "deleted_at", "is_default");

