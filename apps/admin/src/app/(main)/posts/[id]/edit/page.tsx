"use client";

import { PostForm } from "@admin/components/blog/post-form";
import { useLanguageSwitcher } from "@admin/hooks/useLanguageSwitcher";
import { trpc } from "@admin/lib/trpc";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: handles both default and translation mode data loading
export default function EditPostPage() {
  const params = useParams<{ id: string }>();
  const postId = Number(params.id);
  const t = useTranslations("posts");

  const {
    data: post,
    isLoading,
    error,
  } = trpc.viewer.posts.get.useQuery({ id: postId }, { enabled: !Number.isNaN(postId) });

  const { activeCode, isDefaultLanguage, originLangCode, isSwitcherLoading } = useLanguageSwitcher(
    "post",
    postId,
  );

  const { data: translation } = trpc.viewer.translations.get.useQuery(
    { entityType: "post", entityId: postId, langCode: activeCode ?? "" },
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

  if (error || !post) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-sm text-red-600 dark:text-red-400">
          {error?.message ?? "Post not found"}
        </div>
      </div>
    );
  }

  const formInitialData = isDefaultLanguage
    ? {
        title: post.title,
        slug: post.slug,
        content: post.content ?? "",
        excerpt: post.excerpt ?? "",
        featuredImage: post.featuredImage ?? "",
        bannerImage: post.bannerImage ?? "",
        status: post.status as "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED",
        isFeatured: post.isFeatured,
        allowComments: post.allowComments,
        categoryIds: post.categories.map((pc) => pc.category.id),
        tagIds: post.tags.map((pt) => pt.tag.id),
        authorId: post.authorId ?? undefined,
        formatType: post.formatType || undefined,
        externalSource: post.externalSource ?? "",
        sponsoredBy: post.sponsoredBy ?? "",
      }
    : {
        title: getTranslationField(translation, "title") ?? "",
        slug: getTranslationField(translation, "slug") ?? post.slug,
        content: getTranslationField(translation, "content") ?? "",
        excerpt: getTranslationField(translation, "excerpt") ?? "",
        featuredImage: post.featuredImage ?? "",
        bannerImage: post.bannerImage ?? "",
        status: post.status as "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED",
        isFeatured: post.isFeatured,
        allowComments: post.allowComments,
        categoryIds: post.categories.map((pc) => pc.category.id),
        tagIds: post.tags.map((pt) => pt.tag.id),
        authorId: post.authorId ?? undefined,
        formatType: post.formatType || undefined,
        externalSource: post.externalSource ?? "",
        sponsoredBy: post.sponsoredBy ?? "",
      };

  return (
    <div className="flex flex-col gap-6">
      <title>{post ? `${t("editPost")}: ${post.title}` : t("editPost")}</title>
      <div>
        <h1 className="text-xl font-bold">{t("editPost")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update the details of your blog post.</p>
      </div>

      <PostForm
        key={activeCode ?? "default"}
        mode="edit"
        postId={postId}
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
