"use client";

import {
  getOrderStatusOptions,
  getShippingMethodOptions,
} from "@customer/app/orders/constants/constants";
import { OrderStatus } from "@customer/app/orders/constants/enums";
import { translate } from "@ecom/i18n";
import { useI18n } from "@ecom/shared/@i18n";
import { Button } from "@ecom/ui/components/button";
import { ExportFileIcon } from "@ecom/ui/components/icons";
import { Input } from "@ecom/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { format, subDays } from "date-fns";
import debounce from "lodash/debounce";
import { Download, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DateRangePicker } from "../../../../packages/ui/components/date-range-picker";

export interface OrderFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  dateFrom: string | undefined;
  dateTo: string | undefined;
  onDateChange: (from: string | undefined, to: string | undefined) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  shippingMethodFilter: string;
  onShippingMethodFilterChange: (value: string) => void;
  selectedCount?: number;
  isExporting?: boolean;
  onClearAll?: () => void;
  onExport?: () => void;
  onGetLabels?: () => void;
}

export function OrderFilterBar({
  search,
  onSearchChange,
  dateFrom,
  dateTo,
  onDateChange,
  statusFilter,
  onStatusFilterChange,
  shippingMethodFilter,
  onShippingMethodFilterChange,
  selectedCount = 0,
  isExporting = false,
  onClearAll,
  onExport,
  onGetLabels,
}: OrderFilterBarProps) {
  const { languageId: currentLocale } = useI18n();
  const statusOptions = useMemo(() => getOrderStatusOptions(), []);
  const shippingMethodOptions = useMemo(() => getShippingMethodOptions(), []);

  const defaultToDate = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const defaultFromDate = useMemo(() => format(subDays(new Date(), 6), "yyyy-MM-dd"), []);

  const [localSearch, setLocalSearch] = useState(search);
  const [localStatus, setLocalStatus] = useState(statusFilter);
  const [localShippingMethod, setLocalShippingMethod] = useState(shippingMethodFilter);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    setLocalStatus(statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    setLocalShippingMethod(shippingMethodFilter);
  }, [shippingMethodFilter]);

  const debouncedOnSearchChange = useMemo(
    () => debounce((val: string) => onSearchChange(val), 500),
    [onSearchChange],
  );

  const debouncedOnDateChange = useMemo(
    () =>
      debounce((from: string | undefined, to: string | undefined) => {
        onDateChange(from, to);
      }, 500),
    [onDateChange],
  );

  const debouncedOnStatusFilterChange = useMemo(
    () => debounce((val: string) => onStatusFilterChange(val), 500),
    [onStatusFilterChange],
  );

  const debouncedOnShippingMethodFilterChange = useMemo(
    () => debounce((val: string) => onShippingMethodFilterChange(val), 500),
    [onShippingMethodFilterChange],
  );

  useEffect(() => {
    return () => {
      debouncedOnSearchChange.cancel();
      debouncedOnDateChange.cancel();
      debouncedOnStatusFilterChange.cancel();
      debouncedOnShippingMethodFilterChange.cancel();
    };
  }, [
    debouncedOnSearchChange,
    debouncedOnDateChange,
    debouncedOnStatusFilterChange,
    debouncedOnShippingMethodFilterChange,
  ]);

  const hasActiveFilter = useMemo(() => {
    const isSearchActive = Boolean(search && search.trim().length > 0);
    const isStatusActive = Boolean(statusFilter && statusFilter !== "ALL");
    const isShippingActive = Boolean(shippingMethodFilter && shippingMethodFilter !== "ALL");
    const isDateActive = Boolean(
      (dateFrom && dateFrom !== defaultFromDate) || (dateTo && dateTo !== defaultToDate),
    );
    return isSearchActive || isStatusActive || isShippingActive || isDateActive;
  }, [
    search,
    statusFilter,
    shippingMethodFilter,
    dateFrom,
    dateTo,
    defaultFromDate,
    defaultToDate,
  ]);

  const handleClearAll = () => {
    setLocalSearch("");
    setLocalStatus("");
    setLocalShippingMethod("");

    debouncedOnSearchChange.cancel();
    debouncedOnDateChange.cancel();
    debouncedOnStatusFilterChange.cancel();
    debouncedOnShippingMethodFilterChange.cancel();

    if (onClearAll) {
      onClearAll();
    } else {
      onSearchChange("");
      onStatusFilterChange("");
      onShippingMethodFilterChange("");
      onDateChange(defaultFromDate, defaultToDate);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-start w-full">
      {/* Left Filters */}
      <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-4 flex-1">
        {/* Search Input */}
        <div className="relative w-full lg:w-[415px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7B7B7B]" />
          <Input
            type="text"
            placeholder={translate(
              "customerOrder.placeholder.searchByReceptionOrderIdTracking",
              currentLocale,
            )}
            value={localSearch}
            onChange={(e) => {
              const val = e.target.value;
              setLocalSearch(val);
              debouncedOnSearchChange(val);
            }}
            className="pl-11 pr-4 border-[#DADADA] rounded-lg bg-white dark:bg-zinc-900 shadow-xs focus-visible:ring-1 focus-visible:ring-[#0F798C] placeholder:text-[#7B7B7B]"
          />
        </div>

        {/* Date Picker */}
        <DateRangePicker
          valueFrom={dateFrom}
          valueTo={dateTo}
          onChange={(from: string | undefined, to: string | undefined) => {
            debouncedOnDateChange(from, to);
          }}
          onClear={() => {
            debouncedOnDateChange(undefined, undefined);
          }}
          disableFuture={true}
          maxDays={60}
          placeholder="Select date"
          className="border-[#DADADA] rounded-lg bg-white dark:bg-zinc-900 shadow-xs text-[#232323] px-4 py-3 gap-2 w-full md:w-auto"
        />

        {/* Status Dropdown */}
        <div className="relative inline-flex items-center">
          <Select
            value={localStatus === "ALL" ? "" : localStatus}
            onValueChange={(val) => {
              setLocalStatus(val);
              debouncedOnStatusFilterChange(val);
            }}
          >
            <SelectTrigger className="min-w-[140px] md:w-[195px] border-[#DADADA] rounded-[10px] bg-white dark:bg-zinc-900 shadow-xs px-4 gap-2 text-[#232323] font-normal justify-between">
              <SelectValue
                placeholder={translate("customerOrder.placeholder.status", currentLocale)}
              />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {localStatus && localStatus !== "ALL" && (
            <button
              type="button"
              aria-label="Clear status"
              className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-sm focus:outline-none transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setLocalStatus("");
                debouncedOnStatusFilterChange("");
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Shipping Methods Dropdown */}
        <div className="relative inline-flex items-center">
          <Select
            value={localShippingMethod === "ALL" ? "" : localShippingMethod}
            onValueChange={(val) => {
              setLocalShippingMethod(val);
              debouncedOnShippingMethodFilterChange(val);
            }}
          >
            <SelectTrigger className="min-w-[180px] md:w-auto border-[#DADADA] rounded-[10px] bg-white dark:bg-zinc-900 shadow-xs px-4 gap-2 text-[#232323] font-normal justify-between">
              <SelectValue
                placeholder={translate("customerOrder.placeholder.shippingMethod", currentLocale)}
              />
            </SelectTrigger>
            <SelectContent>
              {shippingMethodOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {localShippingMethod && localShippingMethod !== "ALL" && (
            <button
              type="button"
              aria-label="Clear shipping method"
              className="absolute right-8 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-sm focus:outline-none transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setLocalShippingMethod("");
                debouncedOnShippingMethodFilterChange("");
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Clear All Button */}
        {hasActiveFilter && (
          <Button
            type="button"
            variant="outline"
            onClick={handleClearAll}
            className="px-3 gap-2 border-[#F5222D] rounded-lg bg-white dark:bg-zinc-900 shadow-xs !text-[#F5222D] font-medium hover:bg-rose-50/60 dark:hover:bg-rose-950/30 cursor-pointer"
          >
            <X className="h-4 w-4 text-[#F5222D]" />
            <span>{translate("customerOrder.clearAll", currentLocale)}</span>
          </Button>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center justify-end gap-3">
        {selectedCount > 0 && (
          <Button
            variant="outline"
            onClick={onGetLabels || onExport}
            className="!bg-[#0F798C] !text-white px-6 gap-2 rounded-[10px] shadow-xs font-medium cursor-pointer"
          >
            {translate("customerOrder.getLabels", currentLocale)}
          </Button>
        )}

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
          {translate("customerOrder.exportExcel", currentLocale)}
        </Button>
      </div>
    </div>
  );
}
