-- CreateTable
CREATE TABLE IF NOT EXISTS "packing_types" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "description" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "packing_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "packing_types_name_key" ON "packing_types"("name");

-- Rename columns if they exist as camelCase
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packing_types' AND column_name='createdAt') THEN
        ALTER TABLE "packing_types" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packing_types' AND column_name='updatedAt') THEN
        ALTER TABLE "packing_types" RENAME COLUMN "updatedAt" TO "updated_at";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='packing_types' AND column_name='deletedAt') THEN
        ALTER TABLE "packing_types" RENAME COLUMN "deletedAt" TO "deleted_at";
    END IF;
END $$;
