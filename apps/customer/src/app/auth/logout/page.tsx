"use client";

import { useI18n } from "@ecom/shared/@i18n";
import { signOut } from "next-auth/react";
import { useEffect } from "react";
import { env } from "../../../env";

export default function LogoutPage() {
  const { languageId: currentLocale } = useI18n();

  useEffect(() => {
    signOut({ callbackUrl: `${env.NEXT_PUBLIC_WEB_URL}/${currentLocale}` });
  }, [currentLocale]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
