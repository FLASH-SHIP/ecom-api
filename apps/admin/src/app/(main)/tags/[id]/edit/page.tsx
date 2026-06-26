"use client";

import { TagForm } from "@admin/components/blog/tag-form";
import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { useLanguageSwitcher } from "@admin/hooks/useLanguageSwitcher";
import { trpc } from "@admin/lib/trpc";
import { Permissions } from "@ecom/lib/permissions";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function EditTagPage() {
  const t = useTranslations("tags");
  const params = useParams<{ id: string }>();
  const tagId = Number(params.id);

  const {
    data: tag,
    isLoading,
    error,
  } = trpc.viewer.tags.get.useQuery({ id: tagId }, { enabled: !Number.isNaN(tagId) });

  const { activeCode, isDefaultLanguage, originLangCode, isSwitcherLoading } = useLanguageSwitcher(
    "tag",
    tagId,
  );

  const { data: translation } = trpc.viewer.translations.get.useQuery(
    { entityType: "tag", entityId: tagId, langCode: activeCode ?? "" },
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

  if (error || !tag) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-destructive">{error?.message ?? t("tagNotFound")}</p>
      </div>
    );
  }

  const formInitialData = isDefaultLanguage
    ? {
        name: tag.name,
        slug: tag.slug,
        description: tag.description ?? "",
        status: tag.status as "DRAFT" | "PENDING" | "PUBLISHED",
        createdAt: tag.createdAt,
      }
    : {
        name: getTranslationField(translation, "name") ?? "",
        slug: tag.slug,
        description: getTranslationField(translation, "description") ?? "",
        status: tag.status as "DRAFT" | "PENDING" | "PUBLISHED",
        createdAt: tag.createdAt,
      };

  return (
    <PermissionGuard permissions={[Permissions.TAGS_UPDATE]}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold">{t("editTag")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tag.name}</p>
        </div>

        <TagForm
          key={activeCode ?? "default"}
          mode="edit"
          tagId={tagId}
          initialData={formInitialData}
          translationMode={!isDefaultLanguage ? activeCode : undefined}
          originLangCode={originLangCode ?? undefined}
        />
      </div>
    </PermissionGuard>
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
