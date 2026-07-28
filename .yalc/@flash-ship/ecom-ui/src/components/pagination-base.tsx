"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "./icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { cn } from "../lib/utils";
import * as React from "react";

export interface PaginationBaseProps {
  currentPage: number;
  totalItems: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  perPageOptions?: number[];
  itemType?: string;
  className?: string;
  renderRangeText?: (
    fromItem: number,
    toItem: number,
    totalItems: number,
    itemType?: string,
  ) => React.ReactNode;
}

export function PaginationBase({
  currentPage,
  totalItems,
  perPage,
  onPageChange,
  onPerPageChange,
  perPageOptions = [5, 10, 20, 50],
  itemType = "items",
  className,
  renderRangeText,
}: PaginationBaseProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

  const pages = React.useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const list: (number | "...")[] = [1];
    if (currentPage > 3) {
      list.push("...");
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      list.push(i);
    }

    if (currentPage < totalPages - 2) {
      list.push("...");
    }
    list.push(totalPages);

    return list;
  }, [currentPage, totalPages]);

  const fromItem = totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const toItem = Math.min(currentPage * perPage, totalItems);

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 border-t border-border bg-white rounded-b-xl",
        className,
      )}
    >
      {/* Left side: Range Info & Page Size */}
      <div className="flex items-center gap-3 text-sm text-[#4E4E4E]">
        {onPerPageChange && (
          <Select value={String(perPage)} onValueChange={(val) => onPerPageChange(Number(val))}>
            <SelectTrigger className="!h-[28px] w-[56px] px-2.5 bg-white border-[#DADADA] text-xs font-semibold rounded-md shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:outline-none">
              <SelectValue placeholder={String(perPage)} />
            </SelectTrigger>
            <SelectContent className="min-w-[60px]">
              {perPageOptions.map((opt) => (
                <SelectItem key={opt} value={String(opt)} className="text-xs">
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <span className="text-sm">
          {renderRangeText ? (
            renderRangeText(fromItem, toItem, totalItems, itemType)
          ) : (
            <>
              Showing {fromItem}-{toItem} of{" "}
              <span className="text-[#4277DB] font-semibold">{totalItems}</span> {itemType}
            </>
          )}
        </span>
      </div>

      {/* Right side: Page Numbers */}
      <nav aria-label="Pagination" className="flex items-center gap-1">
        {/* First Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] border border-[#DADADA] bg-white text-[#232323] hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          aria-label="First page"
        >
          <ChevronLeftIcon />
        </button>

        {/* Previous Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] border border-[#DADADA] bg-white text-[#232323] hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          aria-label="Previous page"
        >
          <ChevronsLeftIcon />
        </button>

        {/* Page Buttons */}
        {pages.map((page, index) => {
          if (page === "...") {
            const neighbor = pages[index + 1] ?? pages[index - 1];
            const ellipsisKey = `ellipsis-${String(neighbor)}`;
            return (
              <span
                key={ellipsisKey}
                className="flex h-8 w-6 items-center justify-center text-sm text-muted-foreground/60 select-none font-medium"
              >
                …
              </span>
            );
          }

          const isCurrent = currentPage === page;
          return (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page as number)}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-[4px] text-xs font-semibold transition-colors cursor-pointer",
                isCurrent
                  ? "bg-[#0F798C] text-white border border-[#0F798C]"
                  : "border border-[#DADADA] bg-white text-foreground hover:bg-accent",
              )}
              aria-current={isCurrent ? "page" : undefined}
            >
              {page}
            </button>
          );
        })}

        {/* Next Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] border border-[#DADADA] bg-white text-[#232323] hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          aria-label="Next page"
        >
          <ChevronRightIcon />
        </button>

        {/* Last Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] border border-[#DADADA] bg-white text-[#232323] hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
          aria-label="Last page"
        >
          <ChevronsRightIcon />
        </button>
      </nav>
    </div>
  );
}
