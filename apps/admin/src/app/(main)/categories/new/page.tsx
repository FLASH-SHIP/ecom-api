"use client";

import { CategoryForm } from "@admin/components/blog/category-form";
import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { Permissions } from "@ecom/lib/permissions";
import { useTranslations } from "next-intl";

export default function NewCategoryPage() {
  const t = useTranslations("categories");

  return (
    <PermissionGuard permissions={[Permissions.CATEGORIES_CREATE]}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold">{t("createCategory")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("createSubtitle")}</p>
        </div>
        <CategoryForm mode="create" />
      </div>
    </PermissionGuard>
  );
}
