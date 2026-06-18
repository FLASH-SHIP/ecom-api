"use client";

import { trpc } from "@admin/lib/trpc";
import { useEffect, useRef, useState } from "react";

interface SearchResult {
  type: "post" | "page";
  id: number;
  title: string;
  slug: string;
  status: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: postResults } = trpc.viewer.posts.list.useQuery(
    { search: query, page: 1, perPage: 5 },
    { enabled: query.length >= 2 },
  );
  const { data: pageResults } = trpc.viewer.pages.list.useQuery(
    { search: query, page: 1, perPage: 5 },
    { enabled: query.length >= 2 },
  );

  const results: SearchResult[] = [
    ...(postResults?.data ?? []).map((p) => ({
      type: "post" as const,
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: p.status,
    })),
    ...(pageResults?.data ?? []).map((p) => ({
      type: "page" as const,
      id: (p as { id: number; title: string; slug: string; status: string }).id,
      title: (p as { id: number; title: string; slug: string; status: string }).title,
      slug: (p as { id: number; title: string; slug: string; status: string }).slug,
      status: (p as { id: number; title: string; slug: string; status: string }).status,
    })),
  ];

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-400 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-4"
          aria-hidden="true"
        >
          <title>Search</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden rounded bg-slate-200 px-1.5 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400 sm:inline">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close search"
        className="fixed inset-0 z-50 w-full cursor-default bg-black/50 backdrop-blur-sm border-0"
        onClick={() => {
          setOpen(false);
          setQuery("");
        }}
        onKeyDown={() => {}}
      />
      {/* Modal */}
      <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center border-b border-slate-200 px-4 dark:border-slate-700">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-5 text-slate-400"
            aria-hidden="true"
          >
            <title>Search</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search posts, pages..."
            className="flex-1 bg-transparent px-3 py-3 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 placeholder:text-slate-400 dark:text-white"
          />
          <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-400 dark:bg-slate-800">
            ESC
          </kbd>
        </div>
        <div className="max-h-80 overflow-auto p-2">
          {query.length < 2 && (
            <p className="px-3 py-6 text-center text-sm text-slate-400">
              Type at least 2 characters to search
            </p>
          )}
          {query.length >= 2 && results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-slate-400">No results found</p>
          )}
          {results.map((r) => (
            <a
              key={`${r.type}-${r.id}`}
              href={`/${r.type === "post" ? "posts" : "pages"}/${r.id}`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={() => {
                setOpen(false);
                setQuery("");
              }}
            >
              <span className="shrink-0 text-xs">{r.type === "post" ? "📝" : "📄"}</span>
              <span className="flex-1 truncate font-medium text-slate-900 dark:text-white">
                {r.title}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  r.status === "PUBLISHED"
                    ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                }`}
              >
                {r.status.toLowerCase()}
              </span>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
