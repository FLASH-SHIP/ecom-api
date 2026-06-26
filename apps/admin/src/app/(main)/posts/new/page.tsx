"use client";

import { PostForm } from "@admin/components/blog/post-form";
import { PermissionGuard } from "@admin/components/layout/PermissionGuard";
import { Permissions } from "@ecom/lib/permissions";

export default function NewPostPage() {
  return (
    <PermissionGuard permissions={[Permissions.POSTS_CREATE]}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create New Post</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Fill in the details below to create a new blog post.
          </p>
        </div>

        <PostForm mode="create" />
      </div>
    </PermissionGuard>
  );
}
