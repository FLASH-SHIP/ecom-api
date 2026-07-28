import { getPageService } from "@ecom/features/di/containers/PageService";
import {
  overlayPageTranslation,
  overlayPageTranslations,
} from "@ecom/features/translation/services/TranslationOverlay";
import { publicProcedure } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

export const list = publicProcedure.query(async ({ ctx }) => {
  const pageService = getPageService();
  const result = await pageService.listPages({ status: "PUBLISHED" });
  const locale = ctx.locale ?? null;
  const pages = await overlayPageTranslations(result.data, locale);
  return pages;
});

export const getBySlug = publicProcedure
  .input(z.object({ slug: z.string().min(1) }))
  .query(async ({ input, ctx }) => {
    const pageService = getPageService();
    const page = await pageService.getPageBySlug(input.slug);
    if (!page) return null;
    const locale = ctx.locale ?? null;
    return overlayPageTranslation(page, locale);
  });
