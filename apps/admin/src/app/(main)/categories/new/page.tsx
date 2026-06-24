"use client";

import { CategoryForm } from "@admin/components/blog/category-form";
import { useTranslations } from "next-intl";

export default function NewCategoryPage() {
  const t = useTranslations("categories");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">{t("createCategory")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("createSubtitle")}</p>
      </div>
      <CategoryForm mode="create" />
    </div>
  );
}
