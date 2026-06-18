"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const translations = {
  vi: {
    heading: "Đã xảy ra lỗi",
    body: "Trang này gặp sự cố. Vui lòng thử lại hoặc quay về trang chủ.",
    retry: "Thử lại",
    home: "Về trang chủ",
  },
  en: {
    heading: "Something went wrong",
    body: "This page encountered an error. Please try again or go back to the home page.",
    retry: "Try again",
    home: "Go Home",
  },
} as const;

type Locale = keyof typeof translations;

function detectLocale(pathname: string): Locale {
  if (pathname.startsWith("/en/") || pathname === "/en") return "en";
  return "vi";
}

export default function GlobalErrorPage({
  error: pageError,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const t = translations[detectLocale(pathname)];

  useEffect(() => {
    console.error("[CustomerApp] Error:", pageError);
  }, [pageError]);

  return (
    <div className="mx-auto max-w-lg px-4">
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <span className="text-7xl text-muted-foreground">⚠️</span>
        <div>
          <h1 className="mb-2 text-2xl font-bold text-balance">{t.heading}</h1>
          <p className="mb-6 text-muted-foreground">{t.body}</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-primary px-6 py-2.5 font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 hover:shadow-lg"
          >
            {t.retry}
          </button>
          <Link
            href="/"
            className="rounded-lg border border-border px-6 py-2.5 font-semibold text-foreground transition-colors hover:bg-muted"
          >
            {t.home}
          </Link>
        </div>
      </div>
    </div>
  );
}
