/*
  Warnings:

  - You are about to drop the column `api_config` on the `partner_services` table. All the data in the column will be lost.
  - You are about to drop the column `is_sandbox` on the `partner_services` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "partner_services" DROP COLUMN "api_config",
DROP COLUMN "is_sandbox";

-- AlterTable
ALTER TABLE "partners" ADD COLUMN     "api_config" JSONB,
ADD COLUMN     "is_sandbox" BOOLEAN NOT NULL DEFAULT true;
