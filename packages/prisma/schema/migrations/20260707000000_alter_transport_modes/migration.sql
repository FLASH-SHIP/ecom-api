-- Drop old transport_modes table if it lacks the code column (recreated with new columns)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_name = 'transport_modes'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_name = 'transport_modes' AND column_name = 'code'
    ) THEN
        DROP TABLE "transport_modes";
    END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "transport_modes" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR NOT NULL,
    "name" VARCHAR NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_modes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "transport_modes_code_key" ON "transport_modes"("code");

-- Rename columns if they exist as camelCase
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transport_modes' AND column_name='isActive') THEN
        ALTER TABLE "transport_modes" RENAME COLUMN "isActive" TO "is_active";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transport_modes' AND column_name='createdAt') THEN
        ALTER TABLE "transport_modes" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
END $$;
