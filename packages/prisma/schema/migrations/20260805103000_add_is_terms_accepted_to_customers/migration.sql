-- AlterTable
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "is_terms_accepted" BOOLEAN NOT NULL DEFAULT false;
