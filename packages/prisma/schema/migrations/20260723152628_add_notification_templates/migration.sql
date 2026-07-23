/*
  Warnings:

  - You are about to drop the column `userId` on the `api_keys` table. All the data in the column will be lost.
  - The primary key for the `crawl_hscode` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `message` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `referenceId` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `referenceType` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `notifications` table. All the data in the column will be lost.
  - The `shipping_origin` column on the `orders` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[idempotency_key]` on the table `notifications` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `masked_key` to the `api_keys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `owner_id` to the `api_keys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `owner_type` to the `api_keys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `message_key` to the `notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title_key` to the `notifications` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ShippingOrigin" AS ENUM ('HAN', 'SGN');

-- DropForeignKey
ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_userId_fkey";

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userId_fkey";

-- DropIndex
DROP INDEX "api_keys_userId_idx";

-- DropIndex
DROP INDEX "notifications_userId_createdAt_idx";

-- DropIndex
DROP INDEX "notifications_userId_isRead_idx";

-- AlterTable
ALTER TABLE "api_keys" DROP COLUMN "userId",
ADD COLUMN     "allowed_ips" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "masked_key" TEXT NOT NULL,
ADD COLUMN     "owner_id" TEXT NOT NULL,
ADD COLUMN     "owner_type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "crawl_hscode" DROP CONSTRAINT "crawl_hscode_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "no" DROP NOT NULL,
ADD CONSTRAINT "crawl_hscode_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "message",
DROP COLUMN "referenceId",
DROP COLUMN "referenceType",
DROP COLUMN "title",
DROP COLUMN "userId",
ADD COLUMN     "clicked_at" TIMESTAMP(3),
ADD COLUMN     "customer_id" UUID,
ADD COLUMN     "delivered_at" TIMESTAMP(3),
ADD COLUMN     "delivery_class" TEXT NOT NULL DEFAULT 'TRANSACTIONAL',
ADD COLUMN     "idempotency_key" TEXT,
ADD COLUMN     "is_sensitive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "message_key" TEXT NOT NULL,
ADD COLUMN     "reference_id" TEXT,
ADD COLUMN     "reference_type" TEXT,
ADD COLUMN     "sent_at" TIMESTAMP(3),
ADD COLUMN     "title_key" TEXT NOT NULL,
ADD COLUMN     "user_id" UUID,
ADD COLUMN     "variables" JSONB;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "total_packets" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "shipping_origin",
ADD COLUMN     "shipping_origin" "ShippingOrigin" NOT NULL DEFAULT 'HAN';

-- AlterTable
ALTER TABLE "webhooks" ADD COLUMN     "api_version" TEXT NOT NULL DEFAULT '2026-07-16',
ADD COLUMN     "failure_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "old_secret" TEXT,
ADD COLUMN     "owner_id" TEXT,
ADD COLUMN     "owner_type" TEXT,
ADD COLUMN     "secret_updated_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" UUID,
    "customer_id" UUID,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "device_info" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" SERIAL NOT NULL,
    "user_id" UUID,
    "customer_id" UUID,
    "event_type" TEXT NOT NULL,
    "channel_in_app" BOOLEAN NOT NULL DEFAULT true,
    "channel_push" BOOLEAN NOT NULL DEFAULT true,
    "channel_email" BOOLEAN NOT NULL DEFAULT true,
    "channel_webhook" BOOLEAN NOT NULL DEFAULT false,
    "dnd_config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "title_template" JSONB NOT NULL,
    "message_template" JSONB NOT NULL,
    "email_subject_template" JSONB,
    "email_body_template" JSONB,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "channel_in_app" BOOLEAN NOT NULL DEFAULT true,
    "channel_push" BOOLEAN NOT NULL DEFAULT true,
    "channel_email" BOOLEAN NOT NULL DEFAULT true,
    "layout_type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_notifications" (
    "id" SERIAL NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_ids" JSONB,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "failed_reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "template_id" INTEGER,

    CONSTRAINT "scheduled_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_blacklist" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "device_tokens_user_id_idx" ON "device_tokens"("user_id");

-- CreateIndex
CREATE INDEX "device_tokens_customer_id_idx" ON "device_tokens"("customer_id");

-- CreateIndex
CREATE INDEX "notification_settings_user_id_idx" ON "notification_settings"("user_id");

-- CreateIndex
CREATE INDEX "notification_settings_customer_id_idx" ON "notification_settings"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_user_id_event_type_key" ON "notification_settings"("user_id", "event_type");

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_customer_id_event_type_key" ON "notification_settings"("customer_id", "event_type");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_type_key" ON "notification_templates"("type");

-- CreateIndex
CREATE INDEX "scheduled_notifications_status_scheduled_at_idx" ON "scheduled_notifications"("status", "scheduled_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_blacklist_email_key" ON "email_blacklist"("email");

-- CreateIndex
CREATE INDEX "api_keys_owner_type_owner_id_idx" ON "api_keys"("owner_type", "owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_idempotency_key_key" ON "notifications"("idempotency_key");

-- CreateIndex
CREATE INDEX "notifications_user_id_isRead_idx" ON "notifications"("user_id", "isRead");

-- CreateIndex
CREATE INDEX "notifications_customer_id_isRead_idx" ON "notifications"("customer_id", "isRead");

-- CreateIndex
CREATE INDEX "notifications_user_id_createdAt_idx" ON "notifications"("user_id", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_customer_id_createdAt_idx" ON "notifications"("customer_id", "createdAt");

-- CreateIndex
CREATE INDEX "webhooks_owner_type_owner_id_idx" ON "webhooks"("owner_type", "owner_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_notifications" ADD CONSTRAINT "scheduled_notifications_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
