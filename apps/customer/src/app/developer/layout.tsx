"use client";

import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { Key, Webhook } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  const { languageId: currentLocale } = useI18n();
  const pathname = usePathname();

  // Determine active tab based on pathname
  const activeTab = pathname.includes("/webhooks") ? "webhooks" : "apikeys";

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {translate("developer.title", currentLocale)}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {translate("developer.subtitle", currentLocale)}
        </p>
      </div>

      {/* Tabs Layout using Link */}
      <div className="bg-[#CCF2EB] dark:bg-teal-950/40 p-1 rounded-xl inline-flex gap-1 self-start border border-transparent dark:border-teal-800/20">
        <Link
          href="/developer/api-keys"
          className={`px-6 py-2 font-bold text-sm transition-all rounded-lg flex items-center gap-2 cursor-pointer ${
            activeTab === "apikeys"
              ? "bg-white dark:bg-teal-900 text-[#0c6070] dark:text-teal-200 shadow-sm"
              : "text-[#0c6070] dark:text-teal-300 hover:bg-white/40 dark:hover:bg-teal-900/40"
          }`}
        >
          <Key className="size-4" />
          {translate("developer.apiKeysTab", currentLocale)}
        </Link>
        <Link
          href="/developer/webhooks"
          className={`px-6 py-2 font-bold text-sm transition-all rounded-lg flex items-center gap-2 cursor-pointer ${
            activeTab === "webhooks"
              ? "bg-white dark:bg-teal-900 text-[#0c6070] dark:text-teal-200 shadow-sm"
              : "text-[#0c6070] dark:text-teal-300 hover:bg-white/40 dark:hover:bg-teal-900/40"
          }`}
        >
          <Webhook className="size-4" />
          {translate("developer.webhooksTab", currentLocale)}
        </Link>
      </div>

      {/* Tab content area */}
      {children}
    </div>
  );
}
