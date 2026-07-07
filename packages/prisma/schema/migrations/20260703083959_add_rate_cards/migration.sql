-- CreateEnum
CREATE TYPE "ShippingMethod" AS ENUM ('EXPRESS', 'EPACKET');

-- CreateEnum
CREATE TYPE "RateCardType" AS ENUM ('STEP_FIXED', 'RANGE_FIXED', 'RANGE_PER_KG');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "group_id" INTEGER;

-- CreateTable
CREATE TABLE "rate_cards" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "shippingMethod" "ShippingMethod" NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "origin" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "weightStep" DECIMAL(10,3) NOT NULL,
    "minWeight" DECIMAL(10,3) NOT NULL,
    "maxWeight" DECIMAL(10,3) NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_groups" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_card_groups" (
    "id" SERIAL NOT NULL,
    "rate_card_id" INTEGER NOT NULL,
    "customer_group_id" INTEGER NOT NULL,

    CONSTRAINT "rate_card_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_card_items" (
    "id" SERIAL NOT NULL,
    "rate_card_id" INTEGER NOT NULL,
    "startWeight" DECIMAL(10,3) NOT NULL,
    "endWeight" DECIMAL(10,3) NOT NULL,
    "rateType" "RateCardType" NOT NULL DEFAULT 'STEP_FIXED',
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_card_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rate_cards_code_key" ON "rate_cards"("code");

-- CreateIndex
CREATE INDEX "rate_cards_shippingMethod_country_origin_status_idx" ON "rate_cards"("shippingMethod", "country", "origin", "status");

-- CreateIndex
CREATE UNIQUE INDEX "customer_groups_code_key" ON "customer_groups"("code");

-- CreateIndex
CREATE INDEX "rate_card_groups_customer_group_id_idx" ON "rate_card_groups"("customer_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "rate_card_groups_rate_card_id_customer_group_id_key" ON "rate_card_groups"("rate_card_id", "customer_group_id");

-- CreateIndex
CREATE INDEX "rate_card_items_rate_card_id_idx" ON "rate_card_items"("rate_card_id");

-- CreateIndex
CREATE INDEX "customers_group_id_idx" ON "customers"("group_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "customer_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_card_groups" ADD CONSTRAINT "rate_card_groups_rate_card_id_fkey" FOREIGN KEY ("rate_card_id") REFERENCES "rate_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_card_groups" ADD CONSTRAINT "rate_card_groups_customer_group_id_fkey" FOREIGN KEY ("customer_group_id") REFERENCES "customer_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rate_card_items" ADD CONSTRAINT "rate_card_items_rate_card_id_fkey" FOREIGN KEY ("rate_card_id") REFERENCES "rate_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;
