import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug.replace(/-/g, " ")}`,
    description: "Trang nội dung trên Ecom — nền tảng chia sẻ kiến thức.",
    openGraph: {
      title: `${slug.replace(/-/g, " ")} | Ecom`,
      type: "website",
    },
  };
}

export default function PageSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
