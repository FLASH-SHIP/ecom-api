-- AlterTable
ALTER TABLE "page_translations" ADD COLUMN     "cta_link" TEXT,
ADD COLUMN     "cta_text" TEXT,
ADD COLUMN     "subtitle" TEXT;

-- AlterTable
ALTER TABLE "pages" ADD COLUMN     "banner_image" TEXT,
ADD COLUMN     "cta_link" TEXT,
ADD COLUMN     "cta_text" TEXT,
ADD COLUMN     "gallery" JSONB,
ADD COLUMN     "hero_banner" TEXT,
ADD COLUMN     "hide_breadcrumb" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hide_footer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hide_sidebar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hide_title" BOOLEAN NOT NULL DEFAULT false,
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
ALTER TABLE "posts" ADD COLUMN     "external_source" TEXT,
ADD COLUMN     "sponsored_by" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "post_categories_post_id_category_id_key" ON "post_categories"("post_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_tags_post_id_tag_id_key" ON "post_tags"("post_id", "tag_id");
