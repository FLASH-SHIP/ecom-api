-- Migration: Add administrative divisions (Provinces and Wards)
-- This migration creates the tables with snake_case columns,
-- and renames existing camelCase columns in dev database if they exist.

-- =========================================================================
-- 1. Create Tables (with snake_case columns) if they don't exist
-- =========================================================================
CREATE TABLE IF NOT EXISTS "provinces" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "division_type" TEXT NOT NULL,
    "code_name" TEXT NOT NULL,
    "phone_code" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "provinces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "wards" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" INTEGER NOT NULL,
    "division_type" TEXT NOT NULL,
    "code_name" TEXT NOT NULL,
    "province_code" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "wards_pkey" PRIMARY KEY ("id")
);

-- =========================================================================
-- 2. Rename columns of provinces (camelCase -> snake_case) for existing DB
-- =========================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='provinces' AND column_name='divisionType') THEN
        ALTER TABLE "provinces" RENAME COLUMN "divisionType" TO "division_type";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='provinces' AND column_name='codeName') THEN
        ALTER TABLE "provinces" RENAME COLUMN "codeName" TO "code_name";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='provinces' AND column_name='phoneCode') THEN
        ALTER TABLE "provinces" RENAME COLUMN "phoneCode" TO "phone_code";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='provinces' AND column_name='createdAt') THEN
        ALTER TABLE "provinces" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='provinces' AND column_name='updatedAt') THEN
        ALTER TABLE "provinces" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='provinces' AND column_name='deletedAt') THEN
        ALTER TABLE "provinces" RENAME COLUMN "deletedAt" TO "deleted_at";
    END IF;
END $$;

-- =========================================================================
-- 3. Rename columns of wards (camelCase -> snake_case) for existing DB
-- =========================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wards' AND column_name='divisionType') THEN
        ALTER TABLE "wards" RENAME COLUMN "divisionType" TO "division_type";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wards' AND column_name='codeName') THEN
        ALTER TABLE "wards" RENAME COLUMN "codeName" TO "code_name";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wards' AND column_name='provinceCode') THEN
        ALTER TABLE "wards" RENAME COLUMN "provinceCode" TO "province_code";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wards' AND column_name='createdAt') THEN
        ALTER TABLE "wards" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wards' AND column_name='updatedAt') THEN
        ALTER TABLE "wards" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wards' AND column_name='deletedAt') THEN
        ALTER TABLE "wards" RENAME COLUMN "deletedAt" TO "deleted_at";
    END IF;
END $$;

-- =========================================================================
-- 4. Recreate Constraints and Indexes
-- =========================================================================
CREATE UNIQUE INDEX IF NOT EXISTS "provinces_code_key" ON "provinces"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "wards_code_key" ON "wards"("code");

-- Drop old indexes/foreign key if they exist
DROP INDEX IF EXISTS "wards_provinceCode_idx";
DROP INDEX IF EXISTS "wards_codeName_idx";
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'wards_provinceCode_fkey' AND table_name = 'wards'
    ) THEN
        ALTER TABLE "wards" DROP CONSTRAINT "wards_provinceCode_fkey";
    END IF;
END $$;

-- Create new indexes/foreign key if they don't exist
CREATE INDEX IF NOT EXISTS "wards_province_code_idx" ON "wards"("province_code");
CREATE INDEX IF NOT EXISTS "wards_code_name_idx" ON "wards"("code_name");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'wards_province_code_fkey' AND table_name = 'wards'
    ) THEN
        ALTER TABLE "wards" ADD CONSTRAINT "wards_province_code_fkey" FOREIGN KEY ("province_code") REFERENCES "provinces"("code") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
