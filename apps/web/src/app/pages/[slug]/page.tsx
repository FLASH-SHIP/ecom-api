"use client";

import { trpc } from "@web/lib/trpc";
import { useParams } from "next/navigation";

export default function PageDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const {
    data: page,
    isLoading,
    error,
  } = trpc.public.pages.getBySlug.useQuery({ slug }, { enabled: !!slug });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-center text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Page not found</h1>
        <a href="/pages" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          ← Back to Pages
        </a>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
        {page.title}
      </h1>
      {page.excerpt && (
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">{page.excerpt}</p>
      )}
      {page.content && (
        <div
          className="prose prose-slate mt-8 max-w-none dark:prose-invert"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: CMS content is admin-controlled
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      )}
    </article>
  );
}
