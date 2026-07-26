"use client";

import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { Card, CardContent } from "@ecom/ui/components/card";
import { Select } from "@ecom/ui/components/select";
import * as React from "react";

export default function WalletCost() {
  const { languageId: currentLocale } = useI18n();

  return (
    <>
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm hover:shadow-md transition-all duration-200">
        <CardContent className="px-5 py-4 flex flex-col justify-between h-full">
          {/* Card Header: Title & Time Period Select + Donut Chart */}
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-bold text-foreground tracking-tight">
                {translate("customerWallet.fulfillmentCost", currentLocale)}
              </h2>
              <Select></Select>
            </div>

            {/* Blue Ring Donut SVG Chart */}
            <div className="relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100 dark:text-zinc-800"
                  strokeWidth="4"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#2563eb]"
                  strokeDasharray="100, 100"
                  strokeWidth="4"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
            </div>
          </div>

          {/* Bottom Row: Paid & Pending Status */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className={"text-sm 2xl:text-base font-medium"}>
                {translate("customerWallet.paid", currentLocale)}
              </span>
              <span className="text-foreground font-semibold">$368.00</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span className={"text-sm 2xl:text-base font-medium"}>
                {translate("customerWallet.pending", currentLocale)}
              </span>
              <span className="text-rose-500 font-semibold">$0.00</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
