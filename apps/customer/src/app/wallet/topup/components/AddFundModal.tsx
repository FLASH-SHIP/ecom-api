"use client";

import { DatePicker } from "@customer/components/ui/date-picker";
import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { Button } from "@ecom/ui/components/button";
import { Input } from "@ecom/ui/components/input";
import {
  BaseModal,
  BaseModalContent,
} from "@ecom/ui/components/modals/base-modal";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ImageIcon,
  Info,
  Plus,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

export interface AddFundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  methodId?: string;
  methodName?: string;
  methodLogo?: React.ReactNode;
  onBack?: () => void;
  onSubmit?: () => void;
}

interface UploadedImageItem {
  id: string;
  url: string;
  file: File;
}

export function AddFundModal({
  open,
  onOpenChange,
  methodId = "payoneer",
  methodName = "Payoneer",
  methodLogo,
  onBack,
  onSubmit,
}: AddFundModalProps) {
  const { languageId: currentLocale } = useI18n();

  const isPayoneer =
    methodId === "payoneer" ||
    methodName?.toLowerCase().includes("payoneer");

  // Form State
  const [wireDate, setWireDate] = useState<string>("");
  const [wireAmountUsd, setWireAmountUsd] = useState<string>("");
  const [wireAmountVnd, setWireAmountVnd] = useState<string>("");

  // Copy State
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Upload State
  const [uploadedFiles, setUploadedFiles] = useState<UploadedImageItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Scroll State
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const accountEmail = "admin@mattertee.com";
  const EXCHANGE_RATE = 25000;

  // Handle USD Input & Conversion to VND
  const handleUsdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setWireAmountUsd(val);
    const num = parseFloat(val.replace(/[^0-9.]/g, ""));
    if (!isNaN(num)) {
      const vndVal = Math.round(num * EXCHANGE_RATE);
      setWireAmountVnd(vndVal.toLocaleString("vi-VN"));
    } else {
      setWireAmountVnd("");
    }
  };

  // Handle VND Input & Conversion to USD
  const handleVndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setWireAmountVnd(val);
    const num = parseFloat(val.replace(/[^0-9]/g, ""));
    if (!isNaN(num)) {
      const usdVal = (num / EXCHANGE_RATE).toFixed(2);
      setWireAmountUsd(usdVal);
    } else {
      setWireAmountUsd("");
    }
  };

  // Check scroll position
  const checkScrollPosition = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  };

  useEffect(() => {
    checkScrollPosition();
  }, [uploadedFiles]);

  const handleScrollLeft = () => {
    scrollContainerRef.current?.scrollBy({ left: -220, behavior: "smooth" });
  };

  const handleScrollRight = () => {
    scrollContainerRef.current?.scrollBy({ left: 220, behavior: "smooth" });
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    processFiles(selectedFiles);
    e.target.value = "";
  };

  const processFiles = (files: File[]) => {
    if (uploadedFiles.length + files.length > 10) {
      setErrorMessage(
        translate("customerWallet.addFundModal.maxFilesError", currentLocale) ||
          "You can upload up to 10 images",
      );
      return;
    }

    const validNewItems: UploadedImageItem[] = [];

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage(
          translate("customerWallet.addFundModal.maxSizeError", currentLocale) ||
            "Each image must not exceed 5MB",
        );
        return;
      }

      const isValidType =
        file.type === "image/png" ||
        file.type === "image/jpeg" ||
        file.type === "image/jpg" ||
        file.name.match(/\.(png|jpg|jpeg)$/i);

      if (!isValidType) {
        setErrorMessage(
          translate(
            "customerWallet.addFundModal.requiredFormat",
            currentLocale,
          ) || "Required to upload:*png, *jpg, *jpeg",
        );
        return;
      }

      const imageUrl = URL.createObjectURL(file);
      validNewItems.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        url: imageUrl,
        file,
      });
    }

    setUploadedFiles((prev) => [...prev, ...validNewItems]);
  };

  const handleRemoveFile = (id: string) => {
    setUploadedFiles((prev) => {
      const itemToRemove = prev.find((item) => item.id === id);
      if (itemToRemove) {
        URL.revokeObjectURL(itemToRemove.url);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (e.dataTransfer.files) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleBack = () => {
    uploadedFiles.forEach((item) => {
      URL.revokeObjectURL(item.url);
    });
    setUploadedFiles([]);
    setErrorMessage(null);
    setWireDate("");
    setWireAmountUsd("");
    setWireAmountVnd("");
    onBack?.();
  };

  const handleSubmit = () => {
    onSubmit?.();
    onOpenChange(false);
  };

  const defaultLogo = (
    <div className="w-6 h-6 rounded-full bg-[#00B4D8]/20 text-[#00B4D8] flex items-center justify-center font-bold text-xs">
      $
    </div>
  );

  const modalTitle = (
    <div className="flex items-center gap-2.5">
      {methodLogo || defaultLogo}
      <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
        {translate("customerWallet.addFundModal.titleVia", currentLocale) ||
          "Top-up via"}{" "}
        {methodName}
      </span>
    </div>
  );

  const modalFooter = (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleBack}
        className="px-6 py-2 h-10 rounded-lg font-medium border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-zinc-700 dark:text-slate-300 cursor-pointer transition-colors"
      >
        {translate("customerWallet.addFundModal.back", currentLocale) || "Back"}
      </Button>
      <Button
        type="button"
        onClick={handleSubmit}
        className="px-6 py-2 h-10 rounded-lg font-semibold bg-[#00B4D8] hover:bg-[#0096B4] text-white shadow-sm cursor-pointer transition-all"
      >
        {translate("customerWallet.addFundModal.submit", currentLocale) ||
          "Submit"}
      </Button>
    </>
  );

  return (
    <BaseModal open={open} onOpenChange={onOpenChange}>
      <BaseModalContent
        title={modalTitle}
        hideSearch={true}
        footer={modalFooter}
        className="max-w-[660px] rounded-2xl [&>div:first-child]:px-6 [&>div:first-child]:py-4"
      >
        <div className="flex flex-col gap-6 py-2 text-slate-800 dark:text-slate-200">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept="image/png, image/jpeg, image/jpg"
            className="hidden"
          />

          {/* Yellow Warning Alert Box — Only for Non-Payoneer methods */}
          {!isPayoneer && (
            <div className="bg-amber-500/10 border border-amber-300/60 dark:border-amber-700/50 rounded-xl p-3.5 flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  {translate(
                    "customerWallet.addFundModal.pleaseBeAware",
                    currentLocale,
                  ) || "Please be aware"}
                </span>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  {translate(
                    "customerWallet.addFundModal.alertMessage",
                    currentLocale,
                  ) ||
                    "Wire transactions may take up to 2 days to be processed and credited to your account."}
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Send Fund */}
          <div className="relative pl-8">
            {/* Step Number Circle */}
            <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-[#00B4D8] text-white flex items-center justify-center text-xs font-bold shadow-xs">
              1
            </div>

            {/* Connecting Vertical Line to Step 2 */}
            <div className="absolute left-[11px] top-6 -bottom-7 w-0 border-l-2 border-dashed border-[#00B4D8] z-0" />

            <div className="flex flex-col gap-1 pb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {translate(
                  "customerWallet.addFundModal.step1Title",
                  currentLocale,
                ) || "Send fund"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {translate(
                  "customerWallet.addFundModal.step1Desc",
                  currentLocale,
                ) ||
                  "Please use the wire info below to send the funding amount."}
              </p>

              {isPayoneer ? (
                /* Payoneer Banking Info + QR Code Card Box */
                <div className="mt-3 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 bg-slate-50/30 dark:bg-zinc-900/40 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
                  {/* Left Side: Banking Details */}
                  <div className="flex flex-col gap-2.5 flex-1 min-w-0 w-full text-xs">
                    {/* Account Holder */}
                    <div className="grid grid-cols-12 items-center gap-2">
                      <span className="col-span-4 text-slate-500 dark:text-slate-400 font-medium">
                        {translate(
                          "customerWallet.addFundModal.accountHolderLabel",
                          currentLocale,
                        ) || "Account holder:"}
                      </span>
                      <span className="col-span-8 font-bold text-[#1B64F2] truncate">
                        NGUYEN THI TOAN
                      </span>
                    </div>

                    {/* Bank Name */}
                    <div className="grid grid-cols-12 items-center gap-2">
                      <span className="col-span-4 text-slate-500 dark:text-slate-400 font-medium">
                        {translate(
                          "customerWallet.addFundModal.bankNameLabel",
                          currentLocale,
                        ) || "Bank Name:"}
                      </span>
                      <span className="col-span-8 font-bold text-[#1B64F2] leading-tight">
                        Bank for Investment and Development of Vietnam
                      </span>
                    </div>

                    {/* Account Number */}
                    <div className="grid grid-cols-12 items-center gap-2">
                      <span className="col-span-4 text-slate-500 dark:text-slate-400 font-medium">
                        {translate(
                          "customerWallet.addFundModal.accountNumberLabel",
                          currentLocale,
                        ) || "Account Number:"}
                      </span>
                      <div className="col-span-8 border border-dashed border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 flex items-center justify-between bg-white dark:bg-zinc-900">
                        <span className="font-bold text-[#1B64F2]">
                          8833161232
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy("8833161232", "accNum")}
                          className="text-slate-400 hover:text-[#00B4D8] transition-colors cursor-pointer ml-1"
                          title="Copy account number"
                        >
                          {copiedKey === "accNum" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="grid grid-cols-12 items-center gap-2">
                      <span className="col-span-4 text-slate-500 dark:text-slate-400 font-medium">
                        {translate(
                          "customerWallet.addFundModal.descriptionLabel",
                          currentLocale,
                        ) || "Description:"}
                      </span>
                      <div className="col-span-8 border border-dashed border-slate-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 flex items-center justify-between bg-white dark:bg-zinc-900">
                        <span className="font-bold text-[#1B64F2]">
                          SellerID
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy("SellerID", "desc")}
                          className="text-slate-400 hover:text-[#00B4D8] transition-colors cursor-pointer ml-1"
                          title="Copy description"
                        >
                          {copiedKey === "desc" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: QR Code Card Box */}
                  <div className="w-32 h-32 lg:w-36 lg:h-36 rounded-xl border border-sky-400 bg-white p-2 flex flex-col items-center justify-center shrink-0 shadow-xs">
                    <div className="relative w-full h-full bg-slate-50 flex items-center justify-center rounded-lg border border-slate-100">
                      <ImageIcon className="w-10 h-10 text-slate-300" />
                    </div>
                  </div>
                </div>
              ) : (
                /* Non-Payoneer Methods: Simple Account Card */
                <div className="mt-3 border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 bg-slate-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {translate(
                        "customerWallet.addFundModal.accountLabel",
                        currentLocale,
                      ) || "Account:"}
                    </span>
                    <span className="text-sm font-bold text-[#1B64F2] select-all">
                      {accountEmail}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(accountEmail, "accEmail")}
                    className="p-1.5 text-slate-400 hover:text-[#00B4D8] rounded-md transition-colors cursor-pointer relative"
                    title="Copy email"
                  >
                    {copiedKey === "accEmail" ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Submit Wire Transaction Detail */}
          <div className="relative pl-8">
            {/* Step Number Circle */}
            <div className="absolute left-0 top-0 w-6 h-6 rounded-full bg-[#00B4D8] text-white flex items-center justify-center text-xs font-bold shadow-xs">
              2
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {translate(
                    "customerWallet.addFundModal.step2Title",
                    currentLocale,
                  ) || "Submit Wire Transaction Detail"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {translate(
                    "customerWallet.addFundModal.step2Desc",
                    currentLocale,
                  ) ||
                    "Fill out wire date and amount and upload an image of your wire transfer confirmation."}
                </p>
              </div>

              {/* Form Layout */}
              {isPayoneer ? (
                /* Payoneer Form: Full Width Wire Date + Exchange Rate + USD/VND Row */
                <div className="flex flex-col gap-3">
                  {/* Full Width Row: Wire date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {translate(
                        "customerWallet.addFundModal.wireDateLabel",
                        currentLocale,
                      ) || "Wire date"}{" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <DatePicker
                      value={wireDate}
                      onChange={setWireDate}
                      placeholder="Select date"
                      className="w-full h-11 rounded-lg border-slate-300 dark:border-zinc-700"
                    />

                    {/* Exchange Rate Info Note */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                      <Info className="w-4 h-4 text-[#1B64F2] shrink-0" />
                      <span>
                        {translate(
                          "customerWallet.addFundModal.exchangeRateText",
                          currentLocale,
                        ) || "Exchange rate:"}{" "}
                        <strong className="text-[#1B64F2] font-bold">
                          25.000 VND = 1 USD
                        </strong>{" "}
                        <span className="text-slate-400">
                          {translate(
                            "customerWallet.addFundModal.exchangeRateNote",
                            currentLocale,
                          ) || "(The exchange rate may change over time)"}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* 2-Column Row: Wire amount (USD) & Wire amount (VND) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {translate(
                          "customerWallet.addFundModal.wireAmountUsdLabel",
                          currentLocale,
                        ) || "Wire amount (USD)"}{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={wireAmountUsd}
                        onChange={handleUsdChange}
                        placeholder="$"
                        className="h-11 rounded-lg border-slate-300 dark:border-zinc-700"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {translate(
                          "customerWallet.addFundModal.wireAmountVndLabel",
                          currentLocale,
                        ) || "Wire amount (VND)"}{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={wireAmountVnd}
                        onChange={handleVndChange}
                        placeholder="VND"
                        className="h-11 rounded-lg border-slate-300 dark:border-zinc-700"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Non-Payoneer Methods Form: 2-Column Wire Date & Wire Amount (USD) */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {translate(
                        "customerWallet.addFundModal.wireDateLabel",
                        currentLocale,
                      ) || "Wire date"}{" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <DatePicker
                      value={wireDate}
                      onChange={setWireDate}
                      placeholder="Select date"
                      className="h-11 rounded-lg border-slate-300 dark:border-zinc-700"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {translate(
                        "customerWallet.addFundModal.wireAmountUsdLabel",
                        currentLocale,
                      ) || "Wire amount (USD)"}{" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={wireAmountUsd}
                      onChange={handleUsdChange}
                      placeholder="$"
                      className="h-11 rounded-lg border-slate-300 dark:border-zinc-700"
                    />
                  </div>
                </div>
              )}

              {/* Upload Image Section */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {translate(
                    "customerWallet.addFundModal.wireConfirmationLabel",
                    currentLocale,
                  ) || "Wire transfer confirmation"}{" "}
                  <span className="text-rose-500">*</span>
                </label>

                {/* Error Banner */}
                {errorMessage && (
                  <p className="text-xs font-medium text-rose-500 mt-0.5">
                    {errorMessage}
                  </p>
                )}

                {/* Upload Container */}
                {uploadedFiles.length === 0 ? (
                  /* Empty State: Big Drag & Drop Box */
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-[#00B4D8] rounded-2xl p-6 flex flex-col items-center justify-center gap-2 bg-slate-50/40 dark:bg-zinc-900/40 cursor-pointer transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-200/60 dark:bg-zinc-800 flex items-center justify-center text-slate-400 group-hover:text-[#00B4D8] transition-colors">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      {translate(
                        "customerWallet.addFundModal.dragAndDrop",
                        currentLocale,
                      ) || "Drag & drop or"}{" "}
                      <span className="text-[#1B64F2] font-semibold underline">
                        {translate(
                          "customerWallet.addFundModal.browse",
                          currentLocale,
                        ) || "Browse"}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {translate(
                        "customerWallet.addFundModal.uploadLimit",
                        currentLocale,
                      ) || "Upload up to 10 files"}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {translate(
                        "customerWallet.addFundModal.requiredFormat",
                        currentLocale,
                      ) || "Required to upload:*png, *jpg, *jpeg"}
                    </span>
                  </div>
                ) : (
                  /* Uploaded List View with Horizontal Scroll & Floating Arrows */
                  <div className="relative border border-dashed border-slate-300 dark:border-zinc-700 rounded-2xl p-3 bg-slate-50/20 dark:bg-zinc-900/20">
                    {/* Left Scroll Arrow */}
                    {canScrollLeft && (
                      <button
                        type="button"
                        onClick={handleScrollLeft}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-md flex items-center justify-center text-slate-500 hover:text-[#00B4D8] dark:text-slate-300 cursor-pointer z-30 transition-all"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                    )}

                    {/* Horizontal Scroll Area */}
                    <div
                      ref={scrollContainerRef}
                      onScroll={checkScrollPosition}
                      className="flex items-center gap-3.5 overflow-x-auto no-scrollbar scroll-smooth py-2.5 -my-2.5 px-2.5 -mx-2.5"
                    >
                      {uploadedFiles.map((item) => (
                        <div
                          key={item.id}
                          className="relative group w-24 h-24 rounded-2xl shrink-0 border border-slate-200 dark:border-zinc-800 transition-all hover:border-2 hover:border-red-500 shadow-xs"
                        >
                          <img
                            src={item.url}
                            alt="Wire confirmation"
                            className="w-full h-full object-cover rounded-2xl"
                          />

                          {/* Hover Red X Clear Badge at top-right corner */}
                          <button
                            type="button"
                            aria-label="Remove image"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveFile(item.id);
                            }}
                            className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-20"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {/* Add Image Button (+) - Hidden when 10 images uploaded */}
                      {uploadedFiles.length < 10 && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-[#00B4D8] flex items-center justify-center text-slate-400 hover:text-[#00B4D8] shrink-0 transition-all bg-white dark:bg-zinc-900 cursor-pointer"
                        >
                          <Plus className="w-6 h-6" />
                        </button>
                      )}
                    </div>

                    {/* Right Scroll Arrow */}
                    {canScrollRight && (
                      <button
                        type="button"
                        onClick={handleScrollRight}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-md flex items-center justify-center text-slate-500 hover:text-[#00B4D8] dark:text-slate-300 cursor-pointer z-30 transition-all"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </BaseModalContent>
    </BaseModal>
  );
}
