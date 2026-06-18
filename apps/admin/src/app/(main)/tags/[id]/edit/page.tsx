"use client";

import { TagForm } from "@admin/components/blog/tag-form";
import { trpc } from "@admin/lib/trpc";
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

  if (isLoading) {
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold">{t("editTag")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{tag.name}</p>
      </div>
      <TagForm
        mode="edit"
        tagId={tagId}
        initialData={{
          name: tag.name,
          slug: tag.slug,
          description: tag.description ?? "",
          status: tag.status as "DRAFT" | "PENDING" | "PUBLISHED",
        }}
      />
    </div>
  );
}
