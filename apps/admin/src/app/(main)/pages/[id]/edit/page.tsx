"use client";

import { PageForm } from "@admin/components/blog/page-form";
import { useLanguageSwitcher } from "@admin/hooks/useLanguageSwitcher";
import { trpc } from "@admin/lib/trpc";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: handles default and translation mode data loading
export default function EditPagePage() {
  const params = useParams<{ id: string }>();
  const pageId = Number(params.id);
  const t = useTranslations("pages");

  const {
    data: page,
    isLoading,
    error,
  } = trpc.viewer.pages.get.useQuery({ id: pageId }, { enabled: !Number.isNaN(pageId) });

  const { activeCode, isDefaultLanguage, originLangCode, isSwitcherLoading } = useLanguageSwitcher(
    "page",
    pageId,
  );

  const { data: translation } = trpc.viewer.translations.get.useQuery(
    { entityType: "page", entityId: pageId, langCode: activeCode ?? "" },
    { enabled: !isDefaultLanguage && !!activeCode },
  );

  const hasTranslationLoaded = isDefaultLanguage || translation !== undefined;

  if (isLoading || isSwitcherLoading || !hasTranslationLoaded) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-sm text-red-600 dark:text-red-400">
          {error?.message ?? "Page not found"}
        </div>
      </div>
    );
  }

  const formInitialData = isDefaultLanguage
    ? {
        title: page.title,
        slug: page.slug,
        content: page.content ?? "",
        excerpt: page.excerpt ?? "",
        featuredImage: page.featuredImage ?? "",
        template: page.template ?? "default",
        order: page.order,
        parentId: page.parentId,
        status: page.status as "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED",
        bannerImage: page.bannerImage ?? "",
        heroBanner: page.heroBanner ?? "",
        layout: page.layout ?? "default",
        hideTitle: page.hideTitle ?? false,
        hideBreadcrumb: page.hideBreadcrumb ?? false,
        hideSidebar: page.hideSidebar ?? false,
        hideFooter: page.hideFooter ?? false,
        gallery: (page.gallery as string[]) ?? [],
        subtitle: page.subtitle ?? "",
        ctaText: page.ctaText ?? "",
        ctaLink: page.ctaLink ?? "",
      }
    : {
        title: getTranslationField(translation, "title") ?? "",
        slug: page.slug,
        content: getTranslationField(translation, "content") ?? "",
        excerpt: getTranslationField(translation, "excerpt") ?? "",
        featuredImage: page.featuredImage ?? "",
        template: page.template ?? "default",
        order: page.order,
        parentId: page.parentId,
        status: page.status as "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED",
        bannerImage: page.bannerImage ?? "",
        heroBanner: page.heroBanner ?? "",
        layout: page.layout ?? "default",
        hideTitle: page.hideTitle ?? false,
        hideBreadcrumb: page.hideBreadcrumb ?? false,
        hideSidebar: page.hideSidebar ?? false,
        hideFooter: page.hideFooter ?? false,
        gallery: (page.gallery as string[]) ?? [],
        subtitle: getTranslationField(translation, "subtitle") ?? "",
        ctaText: getTranslationField(translation, "ctaText") ?? "",
        ctaLink: getTranslationField(translation, "ctaLink") ?? "",
      };

  return (
    <div className="flex flex-col gap-6">
      <title>{page ? `${t("editPage")}: ${page.title}` : t("editPage")}</title>
      <div>
        <h1 className="text-xl font-bold">{t("editPage")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update the details of your static page.
        </p>
      </div>

      <PageForm
        key={activeCode ?? "default"}
        mode="edit"
        pageId={pageId}
        initialData={formInitialData}
        translationMode={!isDefaultLanguage ? activeCode : undefined}
        originLangCode={originLangCode ?? undefined}
      />
    </div>
  );
}

function getTranslationField(
  data: Record<string, unknown> | null | undefined,
  field: string,
): string | undefined {
  if (!data || !(field in data)) return undefined;
  const val = data[field];
  return typeof val === "string" ? val : undefined;
}
