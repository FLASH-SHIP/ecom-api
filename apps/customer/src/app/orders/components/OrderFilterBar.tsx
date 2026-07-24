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
import { Download, Search } from "lucide-react";

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
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-[52px] pl-11 pr-4 border-[#DADADA] rounded-lg bg-white dark:bg-zinc-900 shadow-xs focus-visible:ring-1 focus-visible:ring-[#0F798C] placeholder:text-[#7B7B7B] placeholder:text-sm lg:placeholder:text-[15px]"
          />
        </div>

        {/* Date Picker */}
        <DateRangePicker
          valueFrom={dateFrom}
          valueTo={dateTo}
          onChange={(from, to) => onDateChange(from, to)}
          onClear={() => onDateChange(undefined, undefined)}
          placeholder="Select date"
          className="h-[52px] border-[#DADADA] rounded-lg bg-white dark:bg-zinc-900 shadow-xs text-[#232323] px-4 py-3 gap-2 w-full md:w-auto"
        />

        {/* Status Dropdown */}
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="h-[52px] min-w-[120px] md:w-auto border-[#DADADA] rounded-[10px] bg-white dark:bg-zinc-900 shadow-xs px-4 gap-2 text-[#232323] font-normal justify-between">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Status</SelectItem>
            <SelectItem value="LABEL_CREATED">Label Created</SelectItem>
            <SelectItem value="PENDING_LABEL">Pending Label</SelectItem>
            <SelectItem value="PACKAGE_RECEIVED">Package Received</SelectItem>
            <SelectItem value="ON_THE_WAY">On the Way</SelectItem>
            <SelectItem value="PICK_UP">Pick Up</SelectItem>
            <SelectItem value="DELIVERY">Delivery</SelectItem>
          </SelectContent>
        </Select>

        {/* Shipping Methods Dropdown */}
        <Select value={shippingMethodFilter} onValueChange={onShippingMethodFilterChange}>
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
