/*
  Warnings:

  - The primary key for the `post_categories` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `post_tags` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[postId,categoryId]` on the table `post_categories` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[postId,tagId]` on the table `post_tags` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "page_translations" ADD COLUMN     "ctaLink" TEXT,
ADD COLUMN     "ctaText" TEXT,
ADD COLUMN     "subtitle" TEXT;

-- AlterTable
ALTER TABLE "pages" ADD COLUMN     "bannerImage" TEXT,
ADD COLUMN     "ctaLink" TEXT,
ADD COLUMN     "ctaText" TEXT,
ADD COLUMN     "gallery" JSONB,
ADD COLUMN     "heroBanner" TEXT,
ADD COLUMN     "hideBreadcrumb" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hideFooter" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hideSidebar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hideTitle" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "layout" TEXT DEFAULT 'default',
ADD COLUMN     "subtitle" TEXT;

-- AlterTable
ALTER TABLE "post_categories" DROP CONSTRAINT "post_categories_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "post_categories_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "post_tags" DROP CONSTRAINT "post_tags_pkey",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "post_tags_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "externalSource" TEXT,
ADD COLUMN     "sponsoredBy" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "post_categories_postId_categoryId_key" ON "post_categories"("postId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "post_tags_postId_tagId_key" ON "post_tags"("postId", "tagId");
