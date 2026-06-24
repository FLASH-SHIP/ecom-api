"use client";

import { CategoryForm } from "@admin/components/blog/category-form";
import { useLanguageSwitcher } from "@admin/hooks/useLanguageSwitcher";
import { trpc } from "@admin/lib/trpc";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: page component with multiple conditional data mappings for categories and translations
export default function EditCategoryPage() {
  const t = useTranslations("categories");
  const params = useParams<{ id: string }>();
  const categoryId = Number(params.id);

  const {
    data: category,
    isLoading,
    error,
  } = trpc.viewer.categories.get.useQuery(
    { id: categoryId },
    { enabled: !Number.isNaN(categoryId) },
  );

  const { activeCode, isDefaultLanguage, isSwitcherLoading, originLangCode } = useLanguageSwitcher(
    "category",
    categoryId,
  );

  const { data: translation } = trpc.viewer.translations.get.useQuery(
    { entityType: "category", entityId: categoryId, langCode: activeCode ?? "" },
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

  if (error || !category) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-sm text-red-600 dark:text-red-400">
          {error?.message ?? "Category not found"}
        </div>
      </div>
    );
  }

  const formInitialData = isDefaultLanguage
    ? {
        name: category.name,
        slug: category.slug,
        description: category.description ?? "",
        icon: category.icon ?? "",
        status: category.status as "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED",
        isFeatured: category.isFeatured === 1,
        isDefault: category.isDefault === 1,
        parentId: category.parentId,
        order: category.order,
        createdAt: category.createdAt,
      }
    : {
        name: getTranslationField(translation, "name") ?? "",
        slug: category.slug,
        description: getTranslationField(translation, "description") ?? "",
        icon: category.icon ?? "",
        status: category.status as "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED",
        isFeatured: category.isFeatured === 1,
        isDefault: category.isDefault === 1,
        parentId: category.parentId,
        order: category.order,
        createdAt: category.createdAt,
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">{t("editCategory")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{category.name}</p>
      </div>

      <CategoryForm
        key={activeCode ?? "default"}
        mode="edit"
        categoryId={categoryId}
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
