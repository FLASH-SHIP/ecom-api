/*
  Warnings:

  - A unique constraint covering the columns `[customer_id,payment_method_id]` on the table `topup_payment_method_partner_relations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[transaction_code]` on the table `topup_transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "GroupOrderStatus" AS ENUM ('LABEL_NOT_CREATED', 'LABEL_CREATED', 'WE_HAVE_YOUR_PACKAGE', 'ON_THE_WAY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "TopupType" AS ENUM ('ADDED_FUNDS', 'PAID', 'CANCELED', 'REFUNDED', 'ADJUST_BALANCE_INCREASE', 'ADJUST_BALANCE_DECREASE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'DELIVERY_FAILED';
ALTER TYPE "OrderStatus" ADD VALUE 'CUSTOMS_HOLD';
ALTER TYPE "OrderStatus" ADD VALUE 'RETURN_TO_SENDER';
ALTER TYPE "OrderStatus" ADD VALUE 'RETURNED';

-- DropIndex
DROP INDEX "orders_customer_id_order_status_created_at_idx";

-- AlterTable
ALTER TABLE "topup_payment_methods" ALTER COLUMN "position" SET DEFAULT NULL;

-- CreateTable
CREATE TABLE "partner_audit_logs" (
    "id" UUID NOT NULL,
    "order_id" UUID,
    "partner_id" INTEGER,
    "partner_service_id" INTEGER,
    "partner_code" TEXT NOT NULL,
    "service_type" "ServiceType",
    "action" TEXT NOT NULL DEFAULT 'TRANSACTION',
    "request_id" TEXT NOT NULL,
    "service_code" TEXT,
    "external_ref_id" TEXT,
    "quoted_fee" DECIMAL(12,2),
    "actual_fee" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "reference_code" TEXT,
    "raw_request" JSONB,
    "raw_response" JSONB,
    "metadata" JSONB,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "partner_audit_logs_order_id_idx" ON "partner_audit_logs"("order_id");

-- CreateIndex
CREATE INDEX "partner_audit_logs_partner_id_idx" ON "partner_audit_logs"("partner_id");

-- CreateIndex
CREATE INDEX "partner_audit_logs_partner_service_id_idx" ON "partner_audit_logs"("partner_service_id");

-- CreateIndex
CREATE INDEX "partner_audit_logs_partner_code_request_id_idx" ON "partner_audit_logs"("partner_code", "request_id");

-- CreateIndex
CREATE INDEX "partner_audit_logs_service_type_idx" ON "partner_audit_logs"("service_type");

-- CreateIndex
CREATE INDEX "partner_audit_logs_external_ref_id_idx" ON "partner_audit_logs"("external_ref_id");

-- CreateIndex
CREATE INDEX "partner_audit_logs_created_at_idx" ON "partner_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "orders_customer_id_created_at_idx" ON "orders"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_customer_id_order_status_created_at_idx" ON "orders"("customer_id", "order_status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_customer_id_ecom_tracking_number_idx" ON "orders"("customer_id", "ecom_tracking_number");

-- CreateIndex
CREATE INDEX "partner_services_partner_id_idx" ON "partner_services"("partner_id");

-- CreateIndex
CREATE INDEX "partner_services_service_type_idx" ON "partner_services"("service_type");

-- CreateIndex
CREATE INDEX "topup_exchange_rate_management_status_created_at_idx" ON "topup_exchange_rate_management"("status", "created_at");

-- CreateIndex
CREATE INDEX "topup_exchange_rate_management_created_at_idx" ON "topup_exchange_rate_management"("created_at");

-- CreateIndex
CREATE INDEX "topup_payment_method_partner_relations_customer_id_status_d_idx" ON "topup_payment_method_partner_relations"("customer_id", "status", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "topup_payment_method_partner_relations_customer_id_payment__key" ON "topup_payment_method_partner_relations"("customer_id", "payment_method_id");

-- CreateIndex
CREATE INDEX "topup_transaction_histories_topup_transaction_id_created_at_idx" ON "topup_transaction_histories"("topup_transaction_id", "created_at");

-- CreateIndex
CREATE INDEX "topup_transaction_wire_images_transaction_id_idx" ON "topup_transaction_wire_images"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "topup_transactions_transaction_code_key" ON "topup_transactions"("transaction_code");

-- CreateIndex
CREATE INDEX "topup_transactions_customer_id_created_at_idx" ON "topup_transactions"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "topup_transactions_status_topup_type_idx" ON "topup_transactions"("status", "topup_type");

-- CreateIndex
CREATE INDEX "topup_transactions_order_id_idx" ON "topup_transactions"("order_id");

-- AddForeignKey
ALTER TABLE "partner_audit_logs" ADD CONSTRAINT "partner_audit_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_audit_logs" ADD CONSTRAINT "partner_audit_logs_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_audit_logs" ADD CONSTRAINT "partner_audit_logs_partner_service_id_fkey" FOREIGN KEY ("partner_service_id") REFERENCES "partner_services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topup_payment_method_partner_relations" ADD CONSTRAINT "topup_payment_method_partner_relations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topup_payment_method_partner_relations" ADD CONSTRAINT "topup_payment_method_partner_relations_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "topup_payment_methods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topup_transactions" ADD CONSTRAINT "topup_transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topup_transactions" ADD CONSTRAINT "topup_transactions_payment_method_fkey" FOREIGN KEY ("payment_method") REFERENCES "topup_payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topup_transactions" ADD CONSTRAINT "topup_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topup_transaction_wire_images" ADD CONSTRAINT "topup_transaction_wire_images_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "topup_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topup_transaction_histories" ADD CONSTRAINT "topup_transaction_histories_topup_transaction_id_fkey" FOREIGN KEY ("topup_transaction_id") REFERENCES "topup_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
