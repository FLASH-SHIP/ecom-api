import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";

const translations = {
  vi: {
    title: "404 — Không tìm thấy trang",
    description: "Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.",
    heading: "Không tìm thấy trang",
    body: "Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.",
    home: "Về trang chủ",
    blog: "Xem bài viết",
  },
  en: {
    title: "404 — Page Not Found",
    description: "The page you are looking for does not exist or has been moved.",
    heading: "Page Not Found",
    body: "The page you are looking for does not exist or has been moved.",
    home: "Go Home",
    blog: "Browse Articles",
  },
} as const;

type Locale = keyof typeof translations;

function resolveLocale(headerLocale: string | null): Locale {
  if (headerLocale && headerLocale in translations) return headerLocale as Locale;
  return "vi";
}

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const locale = resolveLocale(headerList.get("x-locale"));
  const t = translations[locale];

  return {
    title: t.title,
    description: t.description,
  };
}

export default async function NotFound() {
  const headerList = await headers();
  const locale = resolveLocale(headerList.get("x-locale"));
  const t = translations[locale];

  return (
    <div className="mx-auto max-w-lg px-4">
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <h1 className="bg-gradient-to-br from-[#2563EB] to-[#7C3AED] bg-clip-text text-[6rem] font-extrabold leading-none text-transparent md:text-[9rem]">
          404
        </h1>
        <div>
          <h2 className="mb-2 text-2xl font-bold text-balance">{t.heading}</h2>
          <p className="mb-6 text-muted-foreground">{t.body}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/"
            className="rounded-lg bg-primary px-6 py-2.5 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 hover:shadow-lg"
          >
            {t.home}
          </Link>
          <Link
            href="/blog"
            className="rounded-lg border border-border px-6 py-2.5 font-semibold text-foreground transition-colors hover:bg-muted"
          >
            {t.blog}
          </Link>
        </div>
      </div>
    </div>
  );
}
