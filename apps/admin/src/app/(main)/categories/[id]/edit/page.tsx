"use client";

import { CategoryForm } from "@admin/components/blog/category-form";
import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { useLanguageSwitcher } from "@admin/hooks/useLanguageSwitcher";
import { trpc } from "@admin/lib/trpc";
import { Permissions } from "@ecom/lib/permissions";
import { LanguageSwitcher } from "@ecom/ui/components/language-switcher";
import { useParams } from "next/navigation";

export default function EditCategoryPage() {
  return (
    <PermissionGuard permissions={[Permissions.CATEGORIES_UPDATE]}>
      <EditCategoryContent />
    </PermissionGuard>
  );
}

function EditCategoryContent() {
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

  const formInitialData = getFormInitialData(category, translation, isDefaultLanguage);

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

interface CategoryQueryData {
  name?: string;
  slug?: string;
  description?: string | null;
  icon?: string | null;
  status?: string;
  isFeatured?: boolean;
  isDefault?: boolean;
  parentId?: number | null;
  order?: number;
}

function getFormInitialData(
  category: CategoryQueryData,
  translation: Record<string, unknown> | null | undefined,
  isDefaultLanguage: boolean,
) {
  const status = (category.status as "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED") ?? "DRAFT";
  const baseData = {
    slug: category.slug ?? "",
    icon: category.icon ?? "",
    status,
    isFeatured: category.isFeatured ?? false,
    isDefault: category.isDefault ?? false,
    parentId: category.parentId ?? null,
    order: category.order ?? 0,
  };

  if (isDefaultLanguage) {
    return {
      ...baseData,
      name: category.name ?? "",
      description: category.description ?? "",
    };
  }

  return {
    ...baseData,
    name: getTranslationField(translation, "name") ?? "",
    description: getTranslationField(translation, "description") ?? "",
  };
}

function getTranslationField(
  data: Record<string, unknown> | null | undefined,
  field: string,
): string | undefined {
  if (!data || !(field in data)) return undefined;
  const val = data[field];
  return typeof val === "string" ? val : undefined;
}
