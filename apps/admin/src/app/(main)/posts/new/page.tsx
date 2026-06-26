"use client";

import { PostForm } from "@admin/components/blog/post-form";
import { useTranslations } from "next-intl";

export default function NewPostPage() {
  const t = useTranslations("posts");

  return (
    <div className="flex flex-col gap-6">
      <title>{t("createPost")}</title>
      <div>
        <h1 className="text-xl font-bold">{t("createPost")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill in the details below to create a new blog post.
        </p>
      </div>

      <PostForm mode="create" />
    </div>
  );
}
