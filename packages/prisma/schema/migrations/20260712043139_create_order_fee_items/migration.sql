/*
  Warnings:

  - The `rate_card_id` column on the `orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "orders" DROP COLUMN "rate_card_id",
ADD COLUMN     "rate_card_id" INTEGER;

-- CreateTable
CREATE TABLE "order_fee_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "fee_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "rate_card_item_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_fee_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_fee_items_order_id_idx" ON "order_fee_items"("order_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_rate_card_id_fkey" FOREIGN KEY ("rate_card_id") REFERENCES "rate_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_fee_items" ADD CONSTRAINT "order_fee_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_fee_items" ADD CONSTRAINT "order_fee_items_rate_card_item_id_fkey" FOREIGN KEY ("rate_card_item_id") REFERENCES "rate_card_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
