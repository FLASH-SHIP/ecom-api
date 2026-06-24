import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description: "Đọc bài viết mới nhất, hướng dẫn và tài nguyên hữu ích trên Ecom.",
  openGraph: {
    title: "Blog | Ecom",
    description: "Khám phá nội dung phong phú từ cộng đồng Ecom.",
    type: "website",
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
