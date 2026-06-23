"use client";

import { trpc } from "@web/lib/trpc";

export default function PagesListPage() {
  const { data: pages, isLoading } = trpc.public.pages.list.useQuery();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Pages</h1>

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-500">Loading...</p>
      ) : !pages?.length ? (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">No pages available.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {pages.map((page) => (
            <a
              key={page.id}
              href={`/pages/${page.slug}`}
              className="block rounded-xl border border-slate-200 bg-white p-5 transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{page.title}</h2>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
