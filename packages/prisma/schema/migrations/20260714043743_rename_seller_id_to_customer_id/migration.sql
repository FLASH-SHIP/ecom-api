/*
  Warnings:

  - The primary key for the `access_tokens` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `api_keys` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `customer_sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `hs_code` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the column `seller_id` on the `orders` table. All the data in the column will be lost.
  - The primary key for the `sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[customer_id,seller_order_id]` on the table `orders` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `id` on the `access_tokens` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `api_keys` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `customer_sessions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `customer_id` to the `orders` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `sessions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_seller_id_fkey";

-- DropIndex
DROP INDEX "orders_seller_id_idx";

-- DropIndex
DROP INDEX "orders_seller_id_order_status_created_at_idx";

-- DropIndex
DROP INDEX "orders_seller_id_seller_order_id_key";

-- AlterTable
ALTER TABLE "access_tokens" DROP CONSTRAINT "access_tokens_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "access_tokens_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "author_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "content_templates" ALTER COLUMN "createdBy" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "customer_sessions" DROP CONSTRAINT "customer_sessions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "customer_sessions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "hs_code",
DROP COLUMN "seller_id",
ADD COLUMN     "customer_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "tags" ALTER COLUMN "author_id" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "order_products" (
    "id" SERIAL NOT NULL,
    "order_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "hs_code" TEXT,
    "origin_country" TEXT,
    "weight" INTEGER,
    "sku" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_products_order_id_idx" ON "order_products"("order_id");

-- CreateIndex
CREATE INDEX "orders_customer_id_order_status_created_at_idx" ON "orders"("customer_id", "order_status", "created_at");

-- CreateIndex
CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_customer_id_seller_order_id_key" ON "orders"("customer_id", "seller_order_id");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_products" ADD CONSTRAINT "order_products_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
