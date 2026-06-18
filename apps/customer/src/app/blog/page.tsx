"use client";

import { ChevronLeft, ChevronRight, FileText, Search, X } from "lucide-react";
import Image from "next/image";
import NextLink from "next/link";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

export default function BlogPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>();
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = trpc.public.blog.listPosts.useQuery({
    page,
    perPage: 12,
    search: search || undefined,
    categoryId: selectedCategory,
  });

  const { data: categoriesData } = trpc.public.blog.categories.useQuery();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function handleCategoryFilter(categoryId: number | undefined) {
    setSelectedCategory(categoryId);
    setPage(1);
  }

  function clearSearch() {
    setSearch("");
    setSearchInput("");
    setPage(1);
  }

  const lastPage = data?.meta?.lastPage ?? 1;

  return (
    <>
      {/* Page header */}
      <div className="border-b border-border bg-muted/50 py-10 md:py-14">
        <div className="mx-auto max-w-5xl px-4">
          <h1 className="mb-1 text-3xl font-extrabold text-balance">Blog</h1>
          <p className="text-muted-foreground">
            Khám phá các bài viết, hướng dẫn và tài nguyên hữu ích.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-12">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm kiếm bài viết..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-10 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>

        {/* Category Filter Chips */}
        {categoriesData && categoriesData.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleCategoryFilter(undefined)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                !selectedCategory
                  ? "bg-primary text-primary-foreground"
                  : "border border-border hover:bg-muted"
              }`}
            >
              Tất cả
            </button>
            {categoriesData.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryFilter(cat.id)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "border border-border hover:bg-muted"
                }`}
              >
                {cat.icon ? `${cat.icon} ${cat.name}` : cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Search Result Info */}
        {search && (
          <p className="mb-6 text-sm text-muted-foreground">
            Kết quả tìm kiếm cho &ldquo;{search}&rdquo;
            {data?.meta?.total !== undefined && ` (${data.meta.total} bài viết)`}
          </p>
        )}

        {/* Posts Grid */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <span className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
          </div>
        ) : !data?.data?.length ? (
          <div className="py-16 text-center">
            <FileText className="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
            <p className="text-lg text-muted-foreground">
              {search
                ? "Không tìm thấy bài viết phù hợp."
                : "Chưa có bài viết nào. Hãy quay lại sau!"}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.data.map((post) => (
                <NextLink
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-border transition-shadow hover:shadow-lg"
                >
                  {post.featuredImage ? (
                    <div className="relative h-[200px]">
                      <Image
                        src={post.featuredImage}
                        alt={post.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                  ) : (
                    <div className="flex h-[200px] items-center justify-center bg-gradient-to-br from-blue-100 to-violet-100">
                      <FileText className="h-14 w-14 text-primary/30" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="mb-1 font-semibold leading-snug group-hover:text-primary">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {post.author?.name ?? "Admin"}
                      </span>
                      <span className="text-xs text-muted-foreground/60">
                        {new Date(post.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  </div>
                </NextLink>
              ))}
            </div>

            {/* Pagination */}
            {lastPage > 1 && (
              <div className="mt-12 flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="rounded-lg p-2 hover:bg-muted disabled:opacity-30"
                  aria-label="First page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <ChevronLeft className="-ml-3 h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg p-2 hover:bg-muted disabled:opacity-30"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: lastPage }, (_, i) => i + 1)
                  .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === lastPage)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    return (
                      <span key={p}>
                        {prev !== undefined && p - prev > 1 && (
                          <span className="px-1 text-muted-foreground">…</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setPage(p)}
                          className={`min-w-[36px] rounded-lg px-3 py-1.5 text-sm font-medium ${
                            p === page ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    );
                  })}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                  disabled={page === lastPage}
                  className="rounded-lg p-2 hover:bg-muted disabled:opacity-30"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPage(lastPage)}
                  disabled={page === lastPage}
                  className="rounded-lg p-2 hover:bg-muted disabled:opacity-30"
                  aria-label="Last page"
                >
                  <ChevronRight className="h-4 w-4" />
                  <ChevronRight className="-ml-3 h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
