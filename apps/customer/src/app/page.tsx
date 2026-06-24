"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../lib/i18n";

export default function CustomerIndexPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useSession();

  const currentLocale =
    SUPPORTED_LOCALES.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`) ??
    DEFAULT_LOCALE;

  useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated") {
      router.replace(`/${currentLocale}/customer/dashboard`);
    } else {
      router.replace(`/${currentLocale}/auth/login`);
    }
  }, [router, currentLocale, status]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
    </div>
  );
}
