"use client";

import { CategoryForm } from "@admin/components/blog/category-form";
import { useLanguageSwitcher } from "@admin/hooks/useLanguageSwitcher";
import { trpc } from "@admin/lib/trpc";
import { LanguageSwitcher } from "@ecom/ui/components/language-switcher";
import { useParams } from "next/navigation";

export default function EditCategoryPage() {
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

  const { languageTabs, activeCode, isDefaultLanguage, onLanguageChange } = useLanguageSwitcher(
    "category",
    categoryId,
  );

  const { data: translation } = trpc.viewer.translations.get.useQuery(
    { entityType: "category", entityId: categoryId, langCode: activeCode ?? "" },
    { enabled: !isDefaultLanguage && !!activeCode },
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-sm text-slate-500 dark:text-slate-400">Loading category...</div>
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
        isFeatured: category.isFeatured,
        isDefault: category.isDefault,
        parentId: category.parentId,
        order: category.order,
      }
    : {
        name: getTranslationField(translation, "name") ?? "",
        slug: category.slug,
        description: getTranslationField(translation, "description") ?? "",
        icon: category.icon ?? "",
        status: category.status as "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED",
        isFeatured: category.isFeatured,
        isDefault: category.isDefault,
        parentId: category.parentId,
        order: category.order,
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Category</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Update category details.</p>
      </div>

      <LanguageSwitcher
        languages={languageTabs}
        activeCode={activeCode}
        onLanguageChange={onLanguageChange}
      />

      <CategoryForm mode="edit" categoryId={categoryId} initialData={formInitialData} />
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
