-- Migration: Add administrative divisions tree structure
-- This migration creates the administrative_divisions table if it doesn't exist,
-- and renames camelCase columns to snake_case if the table was previously created via db push.

CREATE TABLE IF NOT EXISTS "administrative_divisions" (
    "id" SERIAL NOT NULL,
    "country_code" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_en" TEXT,
    "division_type" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "parent_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "administrative_divisions_pkey" PRIMARY KEY ("id")
);

-- Rename columns if they exist as camelCase in existing DB
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='administrative_divisions' AND column_name='countryCode') THEN
        ALTER TABLE "administrative_divisions" RENAME COLUMN "countryCode" TO "country_code";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='administrative_divisions' AND column_name='nameEn') THEN
        ALTER TABLE "administrative_divisions" RENAME COLUMN "nameEn" TO "name_en";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='administrative_divisions' AND column_name='divisionType') THEN
        ALTER TABLE "administrative_divisions" RENAME COLUMN "divisionType" TO "division_type";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='administrative_divisions' AND column_name='parentId') THEN
        ALTER TABLE "administrative_divisions" RENAME COLUMN "parentId" TO "parent_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='administrative_divisions' AND column_name='isActive') THEN
        ALTER TABLE "administrative_divisions" RENAME COLUMN "isActive" TO "is_active";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='administrative_divisions' AND column_name='createdAt') THEN
        ALTER TABLE "administrative_divisions" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='administrative_divisions' AND column_name='updatedAt') THEN
        ALTER TABLE "administrative_divisions" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='administrative_divisions' AND column_name='deletedAt') THEN
        ALTER TABLE "administrative_divisions" RENAME COLUMN "deletedAt" TO "deleted_at";
    END IF;
END $$;

-- Drop old indexes and constraints if they exist
DROP INDEX IF EXISTS "administrative_divisions_countryCode_idx";
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'administrative_divisions_parentId_fkey' AND table_name = 'administrative_divisions'
    ) THEN
        ALTER TABLE "administrative_divisions" DROP CONSTRAINT "administrative_divisions_parentId_fkey";
    END IF;
END $$;

-- Create new unique/indexes and constraints
CREATE UNIQUE INDEX IF NOT EXISTS "administrative_divisions_country_code_code_key" ON "administrative_divisions"("country_code", "code");
CREATE INDEX IF NOT EXISTS "administrative_divisions_country_code_idx" ON "administrative_divisions"("country_code");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'administrative_divisions_parent_id_fkey' AND table_name = 'administrative_divisions'
    ) THEN
        ALTER TABLE "administrative_divisions" ADD CONSTRAINT "administrative_divisions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "administrative_divisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
