-- AlterTable (Safe conversion for isFeatured and isDefault in categories)
ALTER TABLE "categories" ALTER COLUMN "isFeatured" DROP DEFAULT;
ALTER TABLE "categories" ALTER COLUMN "isFeatured" TYPE SMALLINT USING (CASE WHEN "isFeatured" THEN 1 ELSE 0 END);
ALTER TABLE "categories" ALTER COLUMN "isFeatured" SET DEFAULT 0;

ALTER TABLE "categories" ALTER COLUMN "isDefault" DROP DEFAULT;
ALTER TABLE "categories" ALTER COLUMN "isDefault" TYPE SMALLINT USING (CASE WHEN "isDefault" THEN 1 ELSE 0 END);
ALTER TABLE "categories" ALTER COLUMN "isDefault" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "media_files" ADD COLUMN     "accessMode" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visibility" TEXT NOT NULL DEFAULT 'public';

-- AlterTable
ALTER TABLE "media_folders" ADD COLUMN     "color" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "seo_meta" ADD COLUMN     "tagId" INTEGER;

-- AlterTable
ALTER TABLE "tags" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "seo_meta_tagId_key" ON "seo_meta"("tagId");

-- CreateIndex
CREATE INDEX "tags_deletedAt_idx" ON "tags"("deletedAt");

-- AddForeignKey
ALTER TABLE "seo_meta" ADD CONSTRAINT "seo_meta_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
