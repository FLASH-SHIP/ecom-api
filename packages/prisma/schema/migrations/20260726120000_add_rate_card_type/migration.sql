-- CreateEnum IF NOT EXISTS
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RateItemType') THEN
    CREATE TYPE "RateItemType" AS ENUM ('STEP_FIXED', 'RANGE_FIXED', 'RANGE_PER_KG');
  END IF;
END $$;

-- Update rate_card_items to use RateItemType
ALTER TABLE "rate_card_items" ALTER COLUMN "rateType" DROP DEFAULT;
ALTER TABLE "rate_card_items" ALTER COLUMN "rateType" TYPE "RateItemType" USING ("rateType"::text::"RateItemType");
ALTER TABLE "rate_card_items" ALTER COLUMN "rateType" SET DEFAULT 'STEP_FIXED';

-- Add column type to rate_cards if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rate_cards' AND column_name = 'type') THEN
    ALTER TABLE "rate_cards" ADD COLUMN "type" VARCHAR(50) NOT NULL DEFAULT 'DEFAULT';
  END IF;
END $$;

-- Recreate RateCardType enum with DEFAULT, CUSTOM
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RateCardType') THEN
    ALTER TABLE "rate_cards" ALTER COLUMN "type" DROP DEFAULT;
    ALTER TABLE "rate_cards" ALTER COLUMN "type" TYPE text USING ("type"::text);
    ALTER TYPE "RateCardType" RENAME TO "RateCardType_old";
    CREATE TYPE "RateCardType" AS ENUM ('DEFAULT', 'CUSTOM');
    ALTER TABLE "rate_cards" ALTER COLUMN "type" TYPE "RateCardType" USING ("type"::text::"RateCardType");
    ALTER TABLE "rate_cards" ALTER COLUMN "type" SET DEFAULT 'DEFAULT';
    DROP TYPE "RateCardType_old";
  ELSE
    CREATE TYPE "RateCardType" AS ENUM ('DEFAULT', 'CUSTOM');
    ALTER TABLE "rate_cards" ALTER COLUMN "type" TYPE "RateCardType" USING ("type"::text::"RateCardType");
    ALTER TABLE "rate_cards" ALTER COLUMN "type" SET DEFAULT 'DEFAULT';
  END IF;
END $$;

-- Update index on rate_cards
DROP INDEX IF EXISTS "rate_cards_shippingMethod_country_origin_status_idx";
CREATE INDEX IF NOT EXISTS "rate_cards_shippingMethod_country_origin_status_type_idx" ON "rate_cards"("shippingMethod", "country", "origin", "status", "type");
