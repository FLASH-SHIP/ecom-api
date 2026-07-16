-- Migration: Add customer senders and receivers, and order packing type relation
-- This migration renames camelCase columns in customer_senders to snake_case without losing data,
-- and creates the customer_receivers table and adds the packing_type_id relation to orders.

-- =========================================================================
-- 1. Create Customer Senders Table if it doesn't exist (for fresh/shadow DB)
-- =========================================================================
CREATE TABLE IF NOT EXISTS "customer_senders" (
    "id" SERIAL NOT NULL,
    "customer_id" UUID NOT NULL,
    "label" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "ward" TEXT,
    "zip_code" TEXT,
    "country" TEXT NOT NULL DEFAULT 'VN',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customer_senders_pkey" PRIMARY KEY ("id")
);

-- =========================================================================
-- 2. Rename Customer Sender Columns (camelCase -> snake_case for existing DB)
-- =========================================================================
DO $$
BEGIN
    -- Rename customerId to customer_id if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='customer_senders' AND column_name='customerId'
    ) THEN
        ALTER TABLE "customer_senders" RENAME COLUMN "customerId" TO "customer_id";
    END IF;

    -- Rename zipCode to zip_code
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='customer_senders' AND column_name='zipCode'
    ) THEN
        ALTER TABLE "customer_senders" RENAME COLUMN "zipCode" TO "zip_code";
    END IF;

    -- Rename isDefault to is_default
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='customer_senders' AND column_name='isDefault'
    ) THEN
        ALTER TABLE "customer_senders" RENAME COLUMN "isDefault" TO "is_default";
    END IF;

    -- Rename createdAt to created_at
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='customer_senders' AND column_name='createdAt'
    ) THEN
        ALTER TABLE "customer_senders" RENAME COLUMN "createdAt" TO "created_at";
    END IF;

    -- Rename updatedAt to updated_at
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='customer_senders' AND column_name='updatedAt'
    ) THEN
        ALTER TABLE "customer_senders" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;

    -- Rename deletedAt to deleted_at
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='customer_senders' AND column_name='deletedAt'
    ) THEN
        ALTER TABLE "customer_senders" RENAME COLUMN "deletedAt" TO "deleted_at";
    END IF;
END $$;

-- Drop old foreign key constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'customer_senders_customerId_fkey' AND table_name = 'customer_senders'
    ) THEN
        ALTER TABLE "customer_senders" DROP CONSTRAINT "customer_senders_customerId_fkey";
    END IF;

    -- Add new foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'customer_senders_customer_id_fkey' AND table_name = 'customer_senders'
    ) THEN
        ALTER TABLE "customer_senders" ADD CONSTRAINT "customer_senders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Drop old indexes if they exist
DROP INDEX IF EXISTS "customer_senders_customerId_idx";
DROP INDEX IF EXISTS "customer_senders_customerId_isDefault_idx";

-- Create new indexes if they don't exist
CREATE INDEX IF NOT EXISTS "customer_senders_customer_id_idx" ON "customer_senders"("customer_id");
CREATE INDEX IF NOT EXISTS "customer_senders_customer_id_is_default_idx" ON "customer_senders"("customer_id", "is_default");

-- =========================================================================
-- 3. Create Customer Receivers Table
-- =========================================================================
CREATE TABLE IF NOT EXISTS "customer_receivers" (
    "id" SERIAL NOT NULL,
    "customer_id" UUID NOT NULL,
    "label" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address_1" TEXT NOT NULL,
    "address_2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip_code" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "customer_receivers_pkey" PRIMARY KEY ("id")
);

-- Recreate indexes/foreign keys for customer_receivers
CREATE INDEX IF NOT EXISTS "customer_receivers_customer_id_idx" ON "customer_receivers"("customer_id");
CREATE INDEX IF NOT EXISTS "customer_receivers_customer_id_is_default_idx" ON "customer_receivers"("customer_id", "is_default");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'customer_receivers_customer_id_fkey' AND table_name = 'customer_receivers'
    ) THEN
        ALTER TABLE "customer_receivers" ADD CONSTRAINT "customer_receivers_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- =========================================================================
-- 4. Add packing_type_id to Orders Table
-- =========================================================================
DO $$
BEGIN
    -- Add packing_type_id to orders if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='orders' AND column_name='packing_type_id'
    ) THEN
        ALTER TABLE "orders" ADD COLUMN "packing_type_id" INTEGER;
    END IF;

    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'orders_packing_type_id_fkey' AND table_name = 'orders'
    ) THEN
        ALTER TABLE "orders" ADD CONSTRAINT "orders_packing_type_id_fkey" FOREIGN KEY ("packing_type_id") REFERENCES "packing_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
