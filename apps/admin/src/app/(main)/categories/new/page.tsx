"use client";

import { CategoryForm } from "@admin/components/blog/category-form";

export default function NewCategoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create New Category</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Add a new category to organize your blog posts.
        </p>
      </div>
      <CategoryForm mode="create" />
    </div>
  );
}
