"use client";

import { TagForm } from "@admin/components/blog/tag-form";
import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { Permissions } from "@ecom/lib/permissions";
import { useTranslations } from "next-intl";

export default function NewTagPage() {
  const t = useTranslations("tags");

  return (
    <PermissionGuard permissions={[Permissions.TAGS_CREATE]}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold">{t("createTag")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("form.createSubtitle")}</p>
        </div>
        <TagForm mode="create" />
      </div>
    </PermissionGuard>
  );
}
