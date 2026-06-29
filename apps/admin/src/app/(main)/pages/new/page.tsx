"use client";

import { PageForm } from "@admin/components/blog/page-form";
import { useTranslations } from "next-intl";

export default function NewPage() {
  const t = useTranslations("pages");

  return (
    <div className="flex flex-col gap-6">
      <title>{t("newPage")}</title>
      <div>
        <h1 className="text-xl font-bold">{t("newPage")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill in the details below to create a new static page.
        </p>
      </div>

      <PageForm mode="create" />
    </div>
  );
}
