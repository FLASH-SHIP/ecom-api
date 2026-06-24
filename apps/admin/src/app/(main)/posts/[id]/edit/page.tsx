"use client";

import { PostForm } from "@admin/components/blog/post-form";
import { useLanguageSwitcher } from "@admin/hooks/useLanguageSwitcher";
import { trpc } from "@admin/lib/trpc";
import { LanguageSwitcher } from "@ecom/ui/components/language-switcher";
import { Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: handles both default and translation mode data loading
export default function EditPostPage() {
  const params = useParams<{ id: string }>();
  const postId = Number(params.id);

  const {
    data: post,
    isLoading,
    error,
  } = trpc.viewer.posts.get.useQuery({ id: postId }, { enabled: !Number.isNaN(postId) });

  const { languageTabs, activeCode, isDefaultLanguage, onLanguageChange, isSwitcherLoading } =
    useLanguageSwitcher("post", postId);

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
        status: post.status as "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED",
        isFeatured: post.isFeatured,
        allowComments: post.allowComments,
        categoryIds: post.categories.map((pc) => pc.category.id),
        tagIds: post.tags.map((pt) => pt.tag.id),
      }
    : {
        title: getTranslationField(translation, "title") ?? "",
        slug: getTranslationField(translation, "slug") ?? post.slug,
        content: getTranslationField(translation, "content") ?? "",
        excerpt: getTranslationField(translation, "excerpt") ?? "",
        featuredImage: post.featuredImage ?? "",
        status: post.status as "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED",
        isFeatured: post.isFeatured,
        allowComments: post.allowComments,
        categoryIds: post.categories.map((pc) => pc.category.id),
        tagIds: post.tags.map((pt) => pt.tag.id),
      };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Edit Post</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Update the details of your blog post.
        </p>
      </div>

      <LanguageSwitcher
        languages={languageTabs}
        activeCode={activeCode}
        onLanguageChange={onLanguageChange}
      />

      <PostForm
        key={activeCode ?? "default"}
        mode="edit"
        postId={postId}
        initialData={formInitialData}
        translationMode={!isDefaultLanguage ? activeCode : undefined}
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
