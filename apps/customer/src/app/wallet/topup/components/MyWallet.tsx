"use client";

import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { Button } from "@ecom/ui/components/button";
import { Card, CardContent } from "@ecom/ui/components/card";
import * as React from "react";

export default function MyWallet() {
  const { languageId: currentLocale } = useI18n();

  return (
    <>
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm hover:shadow-md transition-all duration-200">
        <CardContent className="!px-5 !py-4 flex flex-col justify-between h-full">
          {/* Card Header: Title + Notification Bell */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground tracking-tight">
              {translate("customerWallet.myWallet", currentLocale)}
            </h2>
          </div>

          {/* Main Balance Value */}
          <div>
            <span className="text-sm lg:text-base xl:text-lg 2xl:text-xl font-medium text-foreground tracking-tight">
              $99,955,180.61
            </span>
          </div>

          {/* Bottom Row: Waiting to confirm + Top-up Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-muted-foreground">
              <span className={"text-sm 2xl:text-base font-medium"}>
                {translate("customerWallet.waitingConfirmTopup", currentLocale)}{" "}
              </span>
              <span className="text-amber-500 font-semibold">$261,000,077.00</span>
            </div>
            <Button
              size={"sm"}
              className="bg-[#0F798C] hover:bg-[#0c6070] text-white font-semibold px-6 py-2 h-9 rounded-lg shadow-sm transition-all cursor-pointer self-end sm:self-auto"
            >
              {translate("customerWallet.topupButton", currentLocale)}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
