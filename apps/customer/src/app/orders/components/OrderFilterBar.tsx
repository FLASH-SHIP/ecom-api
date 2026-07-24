"use client";

import { Button } from "@ecom/ui/components/button";
import { DateRangePicker } from "@ecom/ui/components/date-range-picker";
import { Input } from "@ecom/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import debounce from "lodash/debounce";
import { Download, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { OrderStatus } from "@customer/app/orders/constants/enums";
import { getOrderStatusOptions } from "@customer/app/orders/constants/constants";

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
  onExport?: () => void;
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
  onExport,
}: OrderFilterBarProps) {
  const statusOptions = useMemo(() => getOrderStatusOptions(), []);

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

  return (
    <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-start w-full">
      {/* Left Filters */}
      <div className="flex flex-col md:flex-row flex-wrap items-stretch md:items-center gap-4 flex-1">
        {/* Search Input */}
        <div className="relative w-full lg:w-[415px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#7B7B7B]" />
          <Input
            type="text"
            placeholder="Search by Reception/Order ID/Tracking Number"
            value={localSearch}
            onChange={(e) => {
              const val = e.target.value;
              setLocalSearch(val);
              debouncedOnSearchChange(val);
            }}
            className="h-[52px] pl-11 pr-4 border-[#DADADA] rounded-lg bg-white dark:bg-zinc-900 shadow-xs focus-visible:ring-1 focus-visible:ring-[#0F798C] placeholder:text-[#7B7B7B] placeholder:text-sm lg:placeholder:text-[15px]"
          />
        </div>

        {/* Date Picker */}
        <DateRangePicker
          valueFrom={dateFrom}
          valueTo={dateTo}
          onChange={(from, to) => {
            debouncedOnDateChange(from, to);
          }}
          onClear={() => {
            debouncedOnDateChange(undefined, undefined);
          }}
          disableFuture={true}
          maxDays={60}
          placeholder="Select date"
          className="h-[52px] border-[#DADADA] rounded-lg bg-white dark:bg-zinc-900 shadow-xs text-[#232323] px-4 py-3 gap-2 w-full md:w-auto"
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
            <SelectTrigger className="h-[52px] min-w-[140px] md:w-[195px] border-[#DADADA] rounded-[10px] bg-white dark:bg-zinc-900 shadow-xs px-4 gap-2 text-[#232323] font-normal justify-between">
              <SelectValue placeholder="Status" />
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
        <Select
          value={localShippingMethod}
          onValueChange={(val) => {
            setLocalShippingMethod(val);
            debouncedOnShippingMethodFilterChange(val);
          }}
        >
          <SelectTrigger className="h-[52px] min-w-[180px] md:w-auto border-[#DADADA] rounded-[10px] bg-white dark:bg-zinc-900 shadow-xs px-4 gap-2 text-[#232323] font-normal justify-between">
            <SelectValue placeholder="Shipping Methods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Shipping Methods</SelectItem>
            <SelectItem value="EPACKET">ePacket</SelectItem>
            <SelectItem value="USPS">USPS</SelectItem>
            <SelectItem value="FEDEX">FedEx</SelectItem>
            <SelectItem value="DHL">DHL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Right Actions */}
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          onClick={onExport}
          className="h-[52px] px-6 gap-2 border-[#DADADA] rounded-[10px] bg-white dark:bg-zinc-900 shadow-xs text-[#232323] font-normal cursor-pointer hover:bg-zinc-50"
        >
          <Download className="h-5 w-5 text-[#232323]" />
          Export
        </Button>
      </div>
    </div>
  );
}
