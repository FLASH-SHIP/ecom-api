"use client";

import { ArrowLeft, Send } from "lucide-react";
import Image from "next/image";
import NextLink from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { trpc } from "@web/lib/trpc";

function CommentForm({ postId }: { postId: number }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [website, setWebsite] = useState(""); // Honeypot
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = trpc.public.blog.submitComment.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setName("");
      setEmail("");
      setContent("");
    },
  });

  if (submitted) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <span>Bình luận của bạn đã được gửi và đang chờ duyệt.</span>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="font-semibold hover:underline"
        >
          Viết thêm
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submitMutation.mutate({ postId, authorName: name, authorEmail: email, content, website });
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="comment-name" className="mb-1.5 block text-sm font-medium">
            Tên *
          </label>
          <input
            id="comment-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên của bạn"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label htmlFor="comment-email" className="mb-1.5 block text-sm font-medium">
            Email *
          </label>
          <input
            id="comment-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Honeypot — hidden from humans */}
      <div className="hidden" aria-hidden="true" style={{ display: "none" }}>
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="comment-content" className="mb-1.5 block text-sm font-medium">
          Bình luận *
        </label>
        <textarea
          id="comment-content"
          required
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Viết bình luận của bạn..."
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {submitMutation.error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {submitMutation.error.message}
        </div>
      )}

      <button
        type="submit"
        disabled={submitMutation.isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {submitMutation.isPending ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Đang gửi...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Gửi bình luận
          </>
        )}
      </button>
    </form>
  );
}

function CommentsList({ postId }: { postId: number }) {
  const { data, isLoading } = trpc.public.blog.listComments.useQuery({ postId, perPage: 50 });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-border p-4">
            <div className="mb-2 flex gap-3">
              <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
              <div className="flex-1">
                <div className="mb-1 h-4 w-[120px] animate-pulse rounded bg-muted" />
                <div className="h-3 w-[80px] animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="h-4 w-[90%] animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  if (!data?.items?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {data.items.map((comment) => (
        <div key={comment.id} className="rounded-lg border border-border p-4">
          <div className="mb-2 flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {(comment.authorName ?? "A").charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold">{comment.authorName ?? "Anonymous"}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(comment.createdAt).toLocaleDateString("vi-VN")}
              </p>
            </div>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{comment.content}</p>
        </div>
      ))}
    </div>
  );
}

export default function BlogDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const {
    data: post,
    isLoading,
    error,
  } = trpc.public.blog.getBySlug.useQuery({ slug }, { enabled: !!slug });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="mb-4 h-14 w-[70%] animate-pulse rounded bg-muted" />
        <div className="mb-8 h-5 w-[200px] animate-pulse rounded bg-muted" />
        <div className="mb-8 h-[360px] animate-pulse rounded-xl bg-muted" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`mb-2 h-4 animate-pulse rounded bg-muted ${i % 3 === 0 ? "w-3/5" : "w-full"}`}
          />
        ))}
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="mb-2 text-2xl font-bold">Bài viết không tìm thấy</h1>
        <p className="mb-6 text-muted-foreground">
          Bài viết bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.
        </p>
        <NextLink
          href="/blog"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-semibold text-primary-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại Blog
        </NextLink>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-16">
      {/* Back link */}
      <NextLink
        href="/blog"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Quay lại Blog
      </NextLink>

      {/* Article Header */}
      <header className="mb-8">
        <h1 className="mb-4 text-3xl font-extrabold leading-tight md:text-4xl">{post.title}</h1>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {(post.author?.name ?? "A").charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold">{post.author?.name ?? "Admin"}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(post.createdAt).toLocaleDateString("vi-VN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>

        {post.excerpt && (
          <p className="text-lg leading-relaxed text-muted-foreground">{post.excerpt}</p>
        )}
      </header>

      {/* Featured Image */}
      {post.featuredImage && (
        <div className="relative mb-10 h-[240px] overflow-hidden rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] md:h-[480px]">
          <Image
            src={post.featuredImage}
            alt={post.title}
            fill
            style={{ objectFit: "cover" }}
            priority
            sizes="(max-width: 768px) 100vw, 896px"
          />
        </div>
      )}

      {/* Content */}
      {post.content && (
        <div
          className="prose prose-lg mb-10 max-w-none prose-headings:font-bold prose-a:text-primary prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.875em] prose-pre:rounded-lg prose-pre:bg-zinc-900 prose-pre:text-zinc-100 prose-img:rounded-lg"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: CMS content is admin-controlled
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="mb-10 flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <span
              key={t.tag.id}
              className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium"
            >
              {t.tag.name}
            </span>
          ))}
        </div>
      )}

      <hr className="mb-10 border-border" />

      {/* Comments */}
      <section>
        <h2 className="mb-4 text-xl font-bold">Bình luận</h2>

        <div className="mb-8">
          <CommentsList postId={post.id} />
        </div>

        <h3 className="mb-3 text-lg font-semibold">Để lại bình luận</h3>
        <CommentForm postId={post.id} />
      </section>
    </div>
  );
}
