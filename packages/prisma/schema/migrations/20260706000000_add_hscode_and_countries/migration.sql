-- CreateTable
CREATE TABLE IF NOT EXISTS "crawl_hscode" (
    "no" INTEGER NOT NULL,
    "port_of_clearance" VARCHAR,
    "hs_code" VARCHAR,
    "article_description" TEXT,
    "general_rate_of_duty" VARCHAR,
    "section_301_tariffs_rate" VARCHAR,
    "additional_tariffs_rate" VARCHAR,
    "antidumping_duty_rate" VARCHAR,
    "countervailing_duty_rate" VARCHAR,
    "notes" TEXT,

    CONSTRAINT "crawl_hscode_pkey" PRIMARY KEY ("no")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "hscode_flexport" (
    "code" VARCHAR NOT NULL,
    "description" TEXT,
    "general_rate" TEXT,
    "column2_rate" TEXT,
    "special_rate" TEXT,
    "unitsof_quantity" VARCHAR,

    CONSTRAINT "hscode_flexport_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "countries" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR NOT NULL,
    "code" VARCHAR NOT NULL,
    "flag" VARCHAR,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "countries_code_key" ON "countries"("code");

-- Rename column if it exists as camelCase
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='countries' AND column_name='createdAt') THEN
        ALTER TABLE "countries" RENAME COLUMN "createdAt" TO "created_at";
    END IF;
END $$;
