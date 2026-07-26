"use client";

import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import {
  BaseModal,
  BaseModalContent,
} from "@ecom/ui/components/modals/base-modal";
import React from "react";

export interface TopupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPaymentMethod?: (methodId: string) => void;
}

export function TopupModal({
  open,
  onOpenChange,
  onSelectPaymentMethod,
}: TopupModalProps) {
  const { languageId: currentLocale } = useI18n();

  const handleSelect = (methodId: string) => {
    onSelectPaymentMethod?.(methodId);
    onOpenChange(false);
  };

  const modalTitle = (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-[#00B4D8]/15 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full bg-[#00B4D8] text-white flex items-center justify-center font-bold text-xs shadow-xs">
          $
        </div>
      </div>
      <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
        {translate("customerWallet.topupModal.title", currentLocale) || "Top-up"}
      </span>
    </div>
  );

  return (
    <BaseModal open={open} onOpenChange={onOpenChange}>
      <BaseModalContent
        title={modalTitle}
        hideSearch={true}
        className="max-w-[620px] rounded-2xl [&>div:first-child]:px-6 [&>div:first-child]:py-4"
      >
        <div className="flex flex-col py-2">
          {/* Subheading */}
          <p className="text-sm font-normal text-slate-500 dark:text-slate-400 mb-5">
            {translate(
              "customerWallet.topupModal.pleaseSelectPaymentMethod",
              currentLocale,
            ) || "Please select payment method:"}
          </p>

          {/* Payment Methods Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* 1. Payoneer */}
            <button
              type="button"
              onClick={() => handleSelect("payoneer")}
              className="flex flex-col items-center justify-center p-4 h-[104px] border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 hover:border-[#0F798C] hover:shadow-md cursor-pointer transition-all duration-200 group outline-none"
            >
              <div className="flex flex-col items-center justify-center gap-1.5">
                <svg className="w-7 h-7" viewBox="0 0 36 36" fill="none">
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    stroke="url(#payoneer-grad)"
                    strokeWidth="4.5"
                    fill="none"
                  />
                  <defs>
                    <linearGradient
                      id="payoneer-grad"
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
                <span className="text-[13px] font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-[#0F798C] transition-colors">
                  Payoneer
                </span>
              </div>
            </button>

            {/* 2. LianLian Global */}
            <button
              type="button"
              onClick={() => handleSelect("lianlian")}
              className="flex flex-col items-center justify-center p-4 h-[104px] border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 hover:border-[#0F798C] hover:shadow-md cursor-pointer transition-all duration-200 group outline-none"
            >
              <div className="flex flex-col items-center justify-center">
                <span className="text-sm font-extrabold text-[#1B64F2] tracking-tighter group-hover:opacity-90 transition-opacity">
                  LianLian Global
                </span>
              </div>
            </button>

            {/* 3. pingpong */}
            <button
              type="button"
              onClick={() => handleSelect("pingpong")}
              className="flex flex-col items-center justify-center p-4 h-[104px] border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 hover:border-[#0F798C] hover:shadow-md cursor-pointer transition-all duration-200 group outline-none"
            >
              <div className="flex flex-col items-center justify-center">
                <span className="text-base font-extrabold text-[#00A3E0] tracking-tight group-hover:opacity-90 transition-opacity">
                  pingpong
                </span>
              </div>
            </button>

            {/* 4. WORLDFIRST */}
            <button
              type="button"
              onClick={() => handleSelect("worldfirst")}
              className="flex flex-col items-center justify-center p-4 h-[104px] border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 hover:border-[#0F798C] hover:shadow-md cursor-pointer transition-all duration-200 group outline-none"
            >
              <div className="flex flex-col items-center justify-center">
                <span className="text-[12px] font-extrabold text-[#E4002B] tracking-wider uppercase group-hover:opacity-90 transition-opacity">
                  WORLDFIRST
                </span>
              </div>
            </button>

            {/* 5. Airwallex */}
            <button
              type="button"
              onClick={() => handleSelect("airwallex")}
              className="flex flex-col items-center justify-center p-4 h-[104px] border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 hover:border-[#0F798C] hover:shadow-md cursor-pointer transition-all duration-200 group outline-none"
            >
              <div className="flex items-center justify-center gap-1.5">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 22H7L12 12L17 22H22L12 2Z" fill="#FF3B30" />
                </svg>
                <span className="text-[13px] font-bold text-slate-900 dark:text-white group-hover:text-[#0F798C] transition-colors">
                  Airwallex
                </span>
              </div>
            </button>

            {/* 6. Others */}
            <button
              type="button"
              onClick={() => handleSelect("others")}
              className="flex flex-col items-center justify-center p-4 h-[104px] border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 hover:border-[#0F798C] hover:shadow-md cursor-pointer transition-all duration-200 group outline-none"
            >
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className="w-7 h-7 rounded-md bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 group-hover:text-[#0F798C] transition-colors">
                  Others
                </span>
              </div>
            </button>
          </div>
        </div>
      </BaseModalContent>
    </BaseModal>
  );
}
