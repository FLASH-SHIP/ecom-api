"use client";

import * as React from "react";
import { type ReactNode, useMemo } from "react";
import { Button } from "@ecom/ui/components/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationData {
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface PaginationBarProps {
  pagination: PaginationData;
  onPageChange: (page: number) => void;
  className?: string;
  hideInfo?: boolean;
}

const PaginationBar = ({
  pagination,
  onPageChange,
  className = "",
  hideInfo = false,
}: PaginationBarProps): ReactNode => {
  const { current_page, last_page, total, per_page } = pagination;

  if (last_page <= 1) return null;

  const from = (current_page - 1) * per_page + 1;
  const to = Math.min(current_page * per_page, total);

  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[ ] = [];
    const maxVisible = 5;

    if (last_page <= maxVisible + 2) {
      for (let i = 1; i <= last_page; i++) pages.push(i);
    } else {
      pages.push(1);

      const start = Math.max(2, current_page - 1);
      const end = Math.min(last_page - 1, current_page + 1);

      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < last_page - 1) pages.push("...");

      pages.push(last_page);
    }

    return pages;
  }, [current_page, last_page]);

  return (
    <div
      className={`flex items-center justify-between flex-wrap gap-2 px-4 py-2 md:py-4 ${className}`}
    >
      {!hideInfo ? (
        <span className="text-sm text-muted-foreground">
          {from}-{to} of {total}
        </span>
      ) : null}

      <div
        className={`flex items-center gap-1 overflow-visible ${hideInfo ? "w-full justify-center" : ""}`}
      >
        <Button
          variant="ghost"
          size="icon"
          className="size-8 cursor-pointer"
          disabled={current_page <= 1}
          onClick={() => onPageChange(current_page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>

        {pageNumbers.map((p, idx) =>
          p === "..." ? (
            <span key={`dots-${idx}`} className="px-1 text-sm text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === current_page ? "default" : "ghost"}
              size="icon"
              className={`size-8 text-sm cursor-pointer ${
                p === current_page ? "pointer-events-none shadow-none bg-primary text-primary-foreground" : ""
              }`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          )
        )}

        <Button
          variant="ghost"
          size="icon"
          className="size-8 cursor-pointer"
          disabled={current_page >= last_page}
          onClick={() => onPageChange(current_page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
};

export default React.memo(PaginationBar);
