/*
  Warnings:

  - The `createdBy` column on the `forms` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `uploadedBy` column on the `media_files` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "administrative_divisions" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "customer_receivers" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "customer_senders" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "forms" DROP COLUMN "createdBy",
ADD COLUMN     "createdBy" UUID;

-- AlterTable
ALTER TABLE "media_files" DROP COLUMN "uploadedBy",
ADD COLUMN     "uploadedBy" UUID;

-- AlterTable
ALTER TABLE "packing_types" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "provinces" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "wards" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "customer_packages" (
    "id" SERIAL NOT NULL,
    "customer_id" UUID NOT NULL,
    "label" TEXT,
    "package_name" TEXT NOT NULL,
    "packing_type_id" INTEGER,
    "length" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customer_packages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_packages_customer_id_idx" ON "customer_packages"("customer_id");

-- CreateIndex
CREATE INDEX "customer_packages_customer_id_is_default_idx" ON "customer_packages"("customer_id", "is_default");

-- CreateIndex
CREATE INDEX "media_files_uploadedBy_idx" ON "media_files"("uploadedBy");

-- AddForeignKey
ALTER TABLE "customer_packages" ADD CONSTRAINT "customer_packages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_packages" ADD CONSTRAINT "customer_packages_packing_type_id_fkey" FOREIGN KEY ("packing_type_id") REFERENCES "packing_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
