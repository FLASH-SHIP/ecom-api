"use client";

import { DateRangePicker } from "@customer/components/ui/date-range-picker";
import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { Button } from "@ecom/ui/components/button";
import { ExportFileIcon } from "@ecom/ui/components/icon-component/ExportFileIcon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { format, subDays } from "date-fns";
import { X } from "lucide-react";
import { useMemo, useState } from "react";

export interface WalletFilterProps {
  dateFrom?: string;
  dateTo?: string;
  onDateChange?: (from: string | undefined, to: string | undefined) => void;
  paymentMethod?: string;
  onPaymentMethodChange?: (method: string) => void;
  status?: string;
  onStatusChange?: (status: string) => void;
  onClearAll?: () => void;
  onExport?: () => void;
  isExporting?: boolean;
}

export default function WalletFilter({
  dateFrom: propsDateFrom,
  dateTo: propsDateTo,
  onDateChange,
  paymentMethod: propsPaymentMethod,
  onPaymentMethodChange,
  status: propsStatus,
  onStatusChange,
  onClearAll,
  onExport,
  isExporting = false,
}: WalletFilterProps) {
  const { languageId: currentLocale } = useI18n();

  // Default date range: 7 days (today and 6 past days)
  const defaultToDate = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const defaultFromDate = useMemo(() => format(subDays(new Date(), 6), "yyyy-MM-dd"), []);

  const [dateFrom, setDateFrom] = useState<string | undefined>(propsDateFrom ?? defaultFromDate);
  const [dateTo, setDateTo] = useState<string | undefined>(propsDateTo ?? defaultToDate);
  const [paymentMethod, setPaymentMethod] = useState<string>(propsPaymentMethod ?? "");
  const [status, setStatus] = useState<string>(propsStatus ?? "");

  const handleDateChange = (from: string | undefined, to: string | undefined) => {
    setDateFrom(from);
    setDateTo(to);
    onDateChange?.(from, to);
  };

  const handlePaymentMethodChange = (val: string) => {
    setPaymentMethod(val);
    onPaymentMethodChange?.(val);
  };

  const handleStatusChange = (val: string) => {
    setStatus(val);
    onStatusChange?.(val);
  };

  const handleClearAll = () => {
    setDateFrom(defaultFromDate);
    setDateTo(defaultToDate);
    setPaymentMethod("");
    setStatus("");

    onDateChange?.(defaultFromDate, defaultToDate);
    onPaymentMethodChange?.("");
    onStatusChange?.("");
    onClearAll?.();
  };

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-24 gap-4 w-full items-center"
      style={{ display: "grid", gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
    >
      {/* Part 1: DateRangePicker, Select Payment Method, Select Status, Clear All Button (18/24 width, justify-start) */}
      <div
        className="col-span-24 md:col-span-20 flex flex-wrap items-center gap-3 justify-start"
        style={{ gridColumn: "span 20 / span 20" }}
      >
        {/* DateRangePicker (Default 7 days) */}
        <DateRangePicker
          valueFrom={dateFrom}
          valueTo={dateTo}
          onChange={handleDateChange}
          onClear={() => handleDateChange(defaultFromDate, defaultToDate)}
          disableFuture={true}
          maxDays={60}
          placeholder="Select date"
          className="border-[#DADADA] rounded-lg bg-white dark:bg-zinc-900 shadow-xs text-[#232323] px-4 py-3 gap-2 w-full md:w-auto"
        />

        {/* Select Payment Method */}
        <div className="relative inline-flex items-center">
          <Select
            value={paymentMethod === "ALL" ? "" : paymentMethod}
            onValueChange={handlePaymentMethodChange}
          >
            <SelectTrigger className="min-w-[200px] border-[#DADADA] rounded-[10px] bg-white dark:bg-zinc-900 shadow-xs px-4 gap-2 text-[#232323] font-normal justify-between">
              <SelectValue
                placeholder={translate("customerWallet.filter.selectPaymentMethod", currentLocale)}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">
                {translate("customerWallet.filter.allPaymentMethods", currentLocale)}
              </SelectItem>
              <SelectItem value="paypal">
                {translate("customerWallet.filter.paypal", currentLocale)}
              </SelectItem>
              <SelectItem value="bank">
                {translate("customerWallet.filter.bankTransfer", currentLocale)}
              </SelectItem>
              <SelectItem value="card">
                {translate("customerWallet.filter.creditCard", currentLocale)}
              </SelectItem>
            </SelectContent>
          </Select>
          {paymentMethod && paymentMethod !== "ALL" && (
            <button
              type="button"
              aria-label="Clear payment method"
              className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-sm focus:outline-none transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handlePaymentMethodChange("");
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Select Status */}
        <div className="relative inline-flex items-center">
          <Select value={status === "ALL" ? "" : status} onValueChange={handleStatusChange}>
            <SelectTrigger className="min-w-[160px] border-[#DADADA] rounded-[10px] bg-white dark:bg-zinc-900 shadow-xs px-4 gap-2 text-[#232323] font-normal justify-between">
              <SelectValue
                placeholder={translate("customerWallet.filter.selectStatus", currentLocale)}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">
                {translate("customerWallet.filter.allStatuses", currentLocale)}
              </SelectItem>
              <SelectItem value="waiting">
                {translate("customerWallet.filter.statusWaiting", currentLocale)}
              </SelectItem>
              <SelectItem value="confirm">
                {translate("customerWallet.filter.statusConfirm", currentLocale)}
              </SelectItem>
              <SelectItem value="reject">
                {translate("customerWallet.filter.statusReject", currentLocale)}
              </SelectItem>
            </SelectContent>
          </Select>
          {status && status !== "ALL" && (
            <button
              type="button"
              aria-label="Clear status"
              className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-sm focus:outline-none transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleStatusChange("");
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Button Clear All */}
        <Button
          type="button"
          variant="outline"
          onClick={handleClearAll}
          className="px-4 gap-2 border-[#F5222D] rounded-lg bg-white dark:bg-zinc-900 shadow-xs !text-[#F5222D] font-medium hover:bg-rose-50/60 dark:hover:bg-rose-950/30 cursor-pointer transition-colors"
        >
          <X className="h-4 w-4 text-[#F5222D]" />
          <span>{translate("customerWallet.filter.clearAll", currentLocale)}</span>
        </Button>
      </div>

      {/* Part 2: Button Export (4/24 width, justify-end) */}
      <div
        className="col-span-24 md:col-span-4 flex items-center justify-end"
        style={{ gridColumn: "span 4 / span 4" }}
      >
        <Button
          variant="outline"
          onClick={onExport}
          disabled={isExporting}
          className="px-6 gap-2 border-[#DADADA] hover:border-[#22843A] rounded-[10px] bg-white hover:bg-[#EBFAEF] hover:text-[#22843A] shadow-xs text-[#232323] font-medium cursor-pointer transition-all duration-200 disabled:opacity-50"
        >
          {isExporting ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#0F798C] border-t-transparent" />
          ) : (
            <ExportFileIcon />
          )}
          {translate("customerWallet.filter.export", currentLocale)}
        </Button>
      </div>
    </div>
  );
}
