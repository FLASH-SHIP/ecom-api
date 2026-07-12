/*
  Warnings:

  - You are about to drop the `admin_menu_item_translations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `admin_menu_items` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'LABEL_NOT_CREATED', 'WAITING_FOR_PICKUP', 'PICKED_UP', 'RECEIVED_AT_ORIGIN_WAREHOUSE', 'EXPORT_CUSTOMS_CLEARANCE', 'DEPARTED_ORIGIN_COUNTRY', 'INTERNATIONAL_TRANSIT', 'ARRIVED_AT_DESTINATION_COUNTRY', 'IMPORT_CUSTOMS_CLEARANCE', 'RECEIVED_BY_LAST_MILE_CARRIER', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "LabelStatus" AS ENUM ('PENDING_LABEL', 'PROCESSING', 'SUCCESS', 'FAILED', 'REQUEST_CANCEL', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CustomsStatus" AS ENUM ('PENDING', 'CLEARING', 'CLEARED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INIT', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'DEBT');

-- DropForeignKey
ALTER TABLE "admin_menu_item_translations" DROP CONSTRAINT "admin_menu_item_translations_menuItemId_fkey";

-- DropForeignKey
ALTER TABLE "admin_menu_items" DROP CONSTRAINT "admin_menu_items_parentId_fkey";

-- DropTable
DROP TABLE "admin_menu_item_translations";

-- DropTable
DROP TABLE "admin_menu_items";

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_code" TEXT NOT NULL,
    "seller_id" INTEGER NOT NULL,
    "import_id" TEXT,
    "order_status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "label_status" "LabelStatus" NOT NULL DEFAULT 'PENDING_LABEL',
    "export_customs_status" "CustomsStatus" NOT NULL DEFAULT 'PENDING',
    "import_customs_status" "CustomsStatus" NOT NULL DEFAULT 'PENDING',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'INIT',
    "shipping_method" "ShippingMethod" NOT NULL,
    "shipping_origin" TEXT NOT NULL DEFAULT 'HAN',
    "seller_order_id" TEXT,
    "tracking_number" TEXT,
    "sender_name" TEXT,
    "sender_address" TEXT,
    "sender_phone" TEXT,
    "sender_email" TEXT,
    "sender_country" TEXT,
    "sender_state" TEXT,
    "sender_city" TEXT,
    "sender_zip_code" TEXT,
    "receiver_name" TEXT NOT NULL,
    "receiver_phone" TEXT,
    "receiver_email" TEXT,
    "receiver_city" TEXT NOT NULL,
    "receiver_state" TEXT NOT NULL,
    "receiver_address_1" TEXT NOT NULL,
    "receiver_address_2" TEXT,
    "receiver_country" TEXT NOT NULL,
    "receiver_zip_code" TEXT NOT NULL,
    "detail_description" TEXT NOT NULL,
    "declared_weight" INTEGER NOT NULL,
    "dimension_text" TEXT,
    "dimension_length" DECIMAL(10,2),
    "dimension_width" DECIMAL(10,2),
    "dimension_height" DECIMAL(10,2),
    "declared_value" DECIMAL(12,2) NOT NULL,
    "hs_code" TEXT,
    "packaging_code" TEXT,
    "actual_weight" DECIMAL(10,3),
    "volume_weight" DECIMAL(10,3),
    "chargeable_weight" DECIMAL(10,3),
    "mawb" TEXT,
    "flight_number" TEXT,
    "ecom_tracking_number" TEXT,
    "rate_card_id" TEXT,
    "base_shipping_fee" DECIMAL(12,2) NOT NULL,
    "surcharge_fee" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "total_fee" DECIMAL(12,2) NOT NULL,
    "box_id" TEXT,
    "port" TEXT,
    "is_get_label" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_partners" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "partner_service_id" TEXT NOT NULL,
    "partner_id" INTEGER NOT NULL,
    "order_service" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_activity_logs" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status_from" TEXT,
    "status_to" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_tracking_checkpoints" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "checkpoint_date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "description" TEXT NOT NULL,
    "carrier_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_tracking_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_code_key" ON "orders"("order_code");

-- CreateIndex
CREATE INDEX "orders_seller_id_order_status_created_at_idx" ON "orders"("seller_id", "order_status", "created_at");

-- CreateIndex
CREATE INDEX "orders_seller_id_idx" ON "orders"("seller_id");

-- CreateIndex
CREATE INDEX "orders_order_status_idx" ON "orders"("order_status");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_seller_id_seller_order_id_key" ON "orders"("seller_id", "seller_order_id");

-- CreateIndex
CREATE INDEX "order_partners_order_id_idx" ON "order_partners"("order_id");

-- CreateIndex
CREATE INDEX "order_partners_partner_service_id_idx" ON "order_partners"("partner_service_id");

-- CreateIndex
CREATE INDEX "order_partners_partner_id_idx" ON "order_partners"("partner_id");

-- CreateIndex
CREATE INDEX "order_activity_logs_order_id_idx" ON "order_activity_logs"("order_id");

-- CreateIndex
CREATE INDEX "order_activity_logs_action_idx" ON "order_activity_logs"("action");

-- CreateIndex
CREATE INDEX "order_activity_logs_created_at_idx" ON "order_activity_logs"("created_at");

-- CreateIndex
CREATE INDEX "order_tracking_checkpoints_order_id_idx" ON "order_tracking_checkpoints"("order_id");

-- CreateIndex
CREATE INDEX "order_tracking_checkpoints_checkpoint_date_idx" ON "order_tracking_checkpoints"("checkpoint_date");

-- CreateIndex
CREATE UNIQUE INDEX "order_tracking_checkpoints_order_id_checkpoint_date_descrip_key" ON "order_tracking_checkpoints"("order_id", "checkpoint_date", "description");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_partners" ADD CONSTRAINT "order_partners_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_partners" ADD CONSTRAINT "order_partners_partner_service_id_fkey" FOREIGN KEY ("partner_service_id") REFERENCES "partner_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_partners" ADD CONSTRAINT "order_partners_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_activity_logs" ADD CONSTRAINT "order_activity_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_tracking_checkpoints" ADD CONSTRAINT "order_tracking_checkpoints_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
