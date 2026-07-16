-- AlterTable (Safe conversion for isFeatured and isDefault in categories)
ALTER TABLE "categories" ALTER COLUMN "is_featured" DROP DEFAULT;
ALTER TABLE "categories" ALTER COLUMN "is_featured" TYPE SMALLINT USING (CASE WHEN "is_featured" THEN 1 ELSE 0 END);
ALTER TABLE "categories" ALTER COLUMN "is_featured" SET DEFAULT 0;

ALTER TABLE "categories" ALTER COLUMN "is_default" DROP DEFAULT;
ALTER TABLE "categories" ALTER COLUMN "is_default" TYPE SMALLINT USING (CASE WHEN "is_default" THEN 1 ELSE 0 END);
ALTER TABLE "categories" ALTER COLUMN "is_default" SET DEFAULT 0;

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
ALTER TABLE "tags" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "seo_meta_tagId_key" ON "seo_meta"("tagId");

-- CreateIndex
CREATE INDEX "tags_deleted_at_idx" ON "tags"("deleted_at");

-- AddForeignKey
ALTER TABLE "seo_meta" ADD CONSTRAINT "seo_meta_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
