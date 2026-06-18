/**
 * DataTablePagination — reusable pagination footer used across admin list pages.
 * Shows "Page X of Y" text + pagination controls.
 */
"use client";

import { Button } from "@ecom/ui/components/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface DataTablePaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  /** Optional total count to display, e.g. "Showing 10 of 100" */
  total?: number;
}

export function DataTablePagination({
  page,
  totalPages,
  onChange,
  total,
}: DataTablePaginationProps) {
  const t = useTranslations("common");

  if (totalPages <= 1 && !total) return null;

  return (
    <>
      <div className="border-t border-border" />
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {total !== undefined ? t("totalRecords", { total }) : t("pageOf", { page, totalPages })}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page <= 1}
              onClick={() => onChange(page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            {generatePageNumbers(page, totalPages).map((p, i) =>
              p === "..." ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: ellipsis separators have no stable identity
                <span key={`ellipsis-${i}`} className="px-1 text-sm text-muted-foreground">
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="icon"
                  className="size-8 text-xs"
                  onClick={() => onChange(p as number)}
                >
                  {p}
                </Button>
              ),
            )}
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={page >= totalPages}
              onClick={() => onChange(page + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

/** Generates page numbers with ellipsis for large ranges */
function generatePageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
