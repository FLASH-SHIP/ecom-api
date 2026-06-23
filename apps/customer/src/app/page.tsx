"use client";

import { ArrowRight, FileText } from "lucide-react";
import Image from "next/image";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../lib/i18n";
import { trpc } from "../lib/trpc";

function PostCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border">
      <div className="h-[180px] animate-pulse bg-muted" />
      <div className="flex-1 p-4">
        <div className="mb-2 h-6 w-4/5 animate-pulse rounded bg-muted" />
        <div className="mb-1 h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const pathname = usePathname();
  const { data: posts, isLoading } = trpc.public.blog.listPosts.useQuery({ page: 1, perPage: 6 });

  const currentLocale =
    SUPPORTED_LOCALES.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`) ??
    DEFAULT_LOCALE;

  const getLocalizedHref = (href: string) => {
    return `/${currentLocale}${href === "/" ? "" : href}`;
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-green-50/50 to-purple-50 py-16 text-center md:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(37,99,235,0.08)_0%,transparent_50%),radial-gradient(circle_at_80%_20%,rgba(124,58,237,0.08)_0%,transparent_50%)]" />
        <div className="relative mx-auto max-w-2xl px-4">
          <span className="mb-6 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Nền tảng nội dung số
          </span>
          <h1 className="mb-6 bg-gradient-to-r from-blue-800 to-violet-600 bg-clip-text text-4xl font-extrabold leading-tight text-transparent text-balance md:text-6xl">
            Welcome to Ecom
          </h1>
          <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
            Khám phá các bài viết, hướng dẫn và tài nguyên để giúp bạn phát triển.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <NextLink
              href={getLocalizedHref("/blog")}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 hover:shadow-lg"
            >
              Đọc Blog <ArrowRight className="h-4 w-4" />
            </NextLink>
            <NextLink
              href={getLocalizedHref("/contact")}
              className="inline-flex items-center rounded-lg border border-border px-6 py-3 font-semibold transition-colors hover:bg-muted"
            >
              Liên hệ
            </NextLink>
          </div>
        </div>
      </section>

      {/* Latest Posts */}
      <section className="py-12 md:py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="mb-1 text-2xl font-bold text-balance">Bài viết mới nhất</h2>
              <p className="text-muted-foreground">
                Cập nhật kiến thức với những bài viết hữu ích nhất
              </p>
            </div>
            <NextLink
              href={getLocalizedHref("/blog")}
              className="hidden shrink-0 items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted sm:inline-flex"
            >
              Xem tất cả <ArrowRight className="h-4 w-4" />
            </NextLink>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton list
                <PostCardSkeleton key={i} />
              ))
            ) : !posts?.data?.length ? (
              <div className="col-span-full py-16 text-center">
                <FileText className="mx-auto mb-4 h-16 w-16 text-muted-foreground/50" />
                <p className="text-lg text-muted-foreground">
                  Chưa có bài viết nào. Hãy quay lại sau!
                </p>
              </div>
            ) : (
              posts.data.map((post) => (
                <NextLink
                  key={post.id}
                  href={getLocalizedHref(`/blog/${post.slug}`)}
                  className="group flex h-full flex-col overflow-hidden rounded-xl border border-border transition-shadow hover:shadow-lg"
                >
                  {post.featuredImage ? (
                    <div className="relative h-[180px]">
                      <Image
                        src={post.featuredImage}
                        alt={post.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                  ) : (
                    <div className="flex h-[180px] items-center justify-center bg-gradient-to-br from-blue-100 to-violet-100">
                      <FileText className="h-12 w-12 text-primary/40" />
                    </div>
                  )}
                  <div className="flex-1 p-4">
                    <h3 className="mb-1 font-semibold leading-snug group-hover:text-primary">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                        {post.excerpt}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/60">
                      {new Date(post.createdAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </NextLink>
              ))
            )}
          </div>

          <div className="mt-8 flex justify-center sm:hidden">
            <NextLink
              href={getLocalizedHref("/blog")}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
            >
              Xem tất cả bài viết <ArrowRight className="h-4 w-4" />
            </NextLink>
          </div>
        </div>
      </section>
    </>
  );
}
