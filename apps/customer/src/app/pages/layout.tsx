import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trang",
  description: "Khám phá các trang nội dung trên Ecom.",
};

export default function PagesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
