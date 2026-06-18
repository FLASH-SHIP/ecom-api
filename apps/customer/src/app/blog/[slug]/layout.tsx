import type { Metadata } from "next";

// Dynamic metadata is handled per-post, but we provide a fallback
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  // Could fetch post title/excerpt here for richer SEO
  // For now provide structured fallback
  return {
    title: `Bài viết: ${slug.replace(/-/g, " ")}`,
    description: "Đọc bài viết này trên Ecom — nền tảng chia sẻ kiến thức.",
    openGraph: {
      title: `${slug.replace(/-/g, " ")} | Ecom Blog`,
      type: "article",
    },
  };
}

export default function BlogSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
