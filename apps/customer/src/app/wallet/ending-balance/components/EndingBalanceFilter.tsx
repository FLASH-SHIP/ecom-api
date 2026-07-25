"use client";

import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { Button } from "@ecom/ui/components/button";
import { ExportFileIcon } from "@ecom/ui/components/icon-component/ExportFileIcon";
import { Input } from "@ecom/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { format, subDays } from "date-fns";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import {DateRangePicker} from "@customer/components/ui/date-range-picker";

export interface EndingBalanceFilterProps {
  dateFrom?: string;
  dateTo?: string;
  onDateChange?: (from: string | undefined, to: string | undefined) => void;
  orderCode?: string;
  onOrderCodeChange?: (code: string) => void;
  transactionType?: string;
  onTransactionTypeChange?: (type: string) => void;
  onClearAll?: () => void;
  onExport?: () => void;
  isExporting?: boolean;
}

export default function EndingBalanceFilter({
  dateFrom: propsDateFrom,
  dateTo: propsDateTo,
  onDateChange,
  orderCode: propsOrderCode,
  onOrderCodeChange,
  transactionType: propsTransactionType,
  onTransactionTypeChange,
  onClearAll,
  onExport,
  isExporting = false,
}: EndingBalanceFilterProps) {
  const { languageId: currentLocale } = useI18n();

  // Default date range: 7 days (today and 6 past days)
  const defaultToDate = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const defaultFromDate = useMemo(() => format(subDays(new Date(), 6), "yyyy-MM-dd"), []);

  const [dateFrom, setDateFrom] = useState<string | undefined>(
    propsDateFrom ?? defaultFromDate,
  );
  const [dateTo, setDateTo] = useState<string | undefined>(
    propsDateTo ?? defaultToDate,
  );
  const [orderCode, setOrderCode] = useState<string>(propsOrderCode ?? "");
  const [transactionType, setTransactionType] = useState<string>(
    propsTransactionType ?? "",
  );

  const handleDateChange = (from: string | undefined, to: string | undefined) => {
    setDateFrom(from);
    setDateTo(to);
    onDateChange?.(from, to);
  };

  const handleOrderCodeChange = (val: string) => {
    setOrderCode(val);
    onOrderCodeChange?.(val);
  };

  const handleTransactionTypeChange = (val: string) => {
    setTransactionType(val);
    onTransactionTypeChange?.(val);
  };

  const handleClearAll = () => {
    setDateFrom(defaultFromDate);
    setDateTo(defaultToDate);
    setOrderCode("");
    setTransactionType("");

    onDateChange?.(defaultFromDate, defaultToDate);
    onOrderCodeChange?.("");
    onTransactionTypeChange?.("");
    onClearAll?.();
  };

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-24 gap-4 w-full items-center"
      style={{ display: "grid", gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
    >
      {/* Part 1: DateRangePicker, Search Input (Order code), Select Transaction Type, Clear All Button (18/24 width, justify-start) */}
      <div
        className="col-span-24 md:col-span-20 flex flex-wrap items-center gap-3 justify-start"
        style={{ gridColumn: "span 20 / span 20" }}
      >
        {/* 1. DateRangePicker (Default 7 days) */}
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

        {/* 4. Button Clear All */}
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

      {/* Part 2: Button Export (6/24 width, justify-end) */}
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
