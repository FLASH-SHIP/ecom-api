"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect } from "react";
import { env } from "../../../env";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../../../lib/i18n";

export default function LogoutPage() {
  const pathname = usePathname();
  const currentLocale =
    SUPPORTED_LOCALES.find((l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`) ??
    DEFAULT_LOCALE;

  useEffect(() => {
    signOut({ callbackUrl: `${env.NEXT_PUBLIC_WEB_URL}/${currentLocale}` });
  }, [currentLocale]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
    </div>
  );
}
