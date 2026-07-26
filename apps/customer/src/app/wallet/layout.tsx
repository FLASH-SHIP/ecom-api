"use client";

import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { Key, Webhook } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";

export default function LayoutWallet({ children }: { children: React.ReactNode }) {
  const { languageId: currentLocale } = useI18n();
  const pathname = usePathname();

  // Determine active tab based on pathname
  const activeTab = pathname.includes("/topup")
    ? "topup"
    : pathname.includes("/transaction")
      ? "transaction"
      : "ending-balance";

  return (
    <>
      <div className="flex flex-col gap-6 w-full pb-10">
        {/* Tabs Layout using Link */}
        <div className="bg-[#CCF2EB] dark:bg-teal-950/40 p-1 rounded-xl inline-flex gap-1 self-start border border-transparent dark:border-teal-800/20">
          <Link
            href="/wallet/topup"
            className={`px-6 py-2 font-bold text-sm transition-all rounded-lg flex items-center gap-2 cursor-pointer ${
              activeTab === "topup"
                ? "bg-white dark:bg-teal-900 text-[#0c6070] dark:text-teal-200 shadow-sm"
                : "text-[#0c6070] dark:text-teal-300 hover:bg-white/40 dark:hover:bg-teal-900/40"
            }`}
          >
            {translate("customerWallet.topup", currentLocale)}
          </Link>
          <Link
            href="/wallet/transaction"
            className={`px-6 py-2 font-bold text-sm transition-all rounded-lg flex items-center gap-2 cursor-pointer ${
              activeTab === "transaction"
                ? "bg-white dark:bg-teal-900 text-[#0c6070] dark:text-teal-200 shadow-sm"
                : "text-[#0c6070] dark:text-teal-300 hover:bg-white/40 dark:hover:bg-teal-900/40"
            }`}
          >
            {translate("customerWallet.transaction", currentLocale)}
          </Link>
          <Link
            href="/wallet/ending-balance"
            className={`px-6 py-2 font-bold text-sm transition-all rounded-lg flex items-center gap-2 cursor-pointer ${
              activeTab === "ending-balance"
                ? "bg-white dark:bg-teal-900 text-[#0c6070] dark:text-teal-200 shadow-sm"
                : "text-[#0c6070] dark:text-teal-300 hover:bg-white/40 dark:hover:bg-teal-900/40"
            }`}
          >
            {translate("customerWallet.endingBalance", currentLocale)}
          </Link>
        </div>

        {/* Tab content area */}
        {children}
      </div>
    </>
  );
}
