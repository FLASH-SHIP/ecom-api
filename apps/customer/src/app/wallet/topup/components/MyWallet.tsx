"use client";

import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { Button } from "@ecom/ui/components/button";
import { Card, CardContent } from "@ecom/ui/components/card";
import * as React from "react";
import { AddFundModal } from "./AddFundModal";
import { TopupModal } from "./TopupModal";

const PAYMENT_METHOD_MAP: Record<
  string,
  { name: string; logo?: React.ReactNode }
> = {
  payoneer: {
    name: "Payoneer",
    logo: (
      <svg className="w-6 h-6" viewBox="0 0 36 36" fill="none">
        <circle
          cx="18"
          cy="18"
          r="14"
          stroke="url(#payoneer-grad-modal)"
          strokeWidth="4.5"
          fill="none"
        />
        <defs>
          <linearGradient
            id="payoneer-grad-modal"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#FF3B30" />
            <stop offset="25%" stopColor="#FF9500" />
            <stop offset="50%" stopColor="#34C759" />
            <stop offset="75%" stopColor="#007AFF" />
            <stop offset="100%" stopColor="#AF52DE" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  lianlian: {
    name: "LianLian Global",
    logo: (
      <span className="text-xs font-extrabold text-[#1B64F2]">LianLian</span>
    ),
  },
  pingpong: {
    name: "pingpong",
    logo: (
      <span className="text-xs font-extrabold text-[#00A3E0]">pingpong</span>
    ),
  },
  worldfirst: {
    name: "WORLDFIRST",
    logo: (
      <span className="text-[10px] font-extrabold text-[#E4002B]">
        WORLDFIRST
      </span>
    ),
  },
  airwallex: {
    name: "Airwallex",
    logo: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 22H7L12 12L17 22H22L12 2Z" fill="#FF3B30" />
      </svg>
    ),
  },
  others: {
    name: "Others",
    logo: (
      <div className="w-6 h-6 rounded-md bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
        </svg>
      </div>
    ),
  },
};

export default function MyWallet() {
  const { languageId: currentLocale } = useI18n();

  const [openTopupModal, setOpenTopupModal] = React.useState(false);
  const [openAddFundModal, setOpenAddFundModal] = React.useState(false);
  const [selectedMethodId, setSelectedMethodId] = React.useState<string>("payoneer");

  const handleSelectPaymentMethod = (methodId: string) => {
    setSelectedMethodId(methodId);
    setOpenTopupModal(false);
    setOpenAddFundModal(true);
  };

  const handleAddFundBack = () => {
    setOpenAddFundModal(false);
    setOpenTopupModal(true);
  };

  const handleAddFundSubmit = () => {
    setOpenAddFundModal(false);
  };

  const currentMethod = PAYMENT_METHOD_MAP[selectedMethodId] || {
    name: "Payoneer",
    logo: null,
  };

  return (
    <>
      <Card className="rounded-2xl border border-border/80 bg-card shadow-sm hover:shadow-md transition-all duration-200">
        <CardContent className="!px-5 !py-4 flex flex-col justify-between h-full">
          {/* Card Header: Title */}
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
              <span className="text-sm 2xl:text-base font-medium">
                {translate("customerWallet.waitingConfirmTopup", currentLocale)}{" "}
              </span>
              <span className="text-amber-500 font-semibold">
                $261,000,077.00
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => setOpenTopupModal(true)}
              className="bg-[#0F798C] hover:bg-[#0c6070] text-white font-semibold px-6 py-2 h-9 rounded-lg shadow-sm transition-all cursor-pointer self-end sm:self-auto"
            >
              {translate("customerWallet.topupButton", currentLocale)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Step 1 Modal: Payment Method Selection */}
      <TopupModal
        open={openTopupModal}
        onOpenChange={setOpenTopupModal}
        onSelectPaymentMethod={handleSelectPaymentMethod}
      />

      {/* Step 2 Modal: Add Fund / Wire Details Submission */}
      <AddFundModal
        open={openAddFundModal}
        onOpenChange={setOpenAddFundModal}
        methodId={selectedMethodId}
        methodName={currentMethod.name}
        methodLogo={currentMethod.logo}
        onBack={handleAddFundBack}
        onSubmit={handleAddFundSubmit}
      />
    </>
  );
}
