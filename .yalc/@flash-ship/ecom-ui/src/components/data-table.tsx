"use client";

import { Button } from "./button";
import { TableSkeleton } from "./table-skeleton";
import { cn } from "../lib/utils";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

export interface DataTablePaginationProps {
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  currentLocale?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string) => void;
  selectedIds?: Set<number | string>;
  onSelectAll?: (selected: boolean) => void;
  onSelectRow?: (id: number | string, selected: boolean) => void;
  getRowId?: (row: T) => number | string;
  actions?: (row: T) => ReactNode;
  className?: string;
  headerRowClassName?: string;
  pagination?: DataTablePaginationProps;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = "No data found",
  emptyIcon,
  searchPlaceholder = "Search...",
  onSearch,
  sortBy,
  sortOrder,
  onSort,
  selectedIds,
  onSelectAll,
  onSelectRow,
  getRowId,
  actions,
  className,
  headerRowClassName,
  pagination,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const allSelected =
    data.length > 0 &&
    selectedIds &&
    getRowId &&
    data.every((row) => selectedIds.has(getRowId(row)));

  if (isLoading) {
    return (
      <TableSkeleton
        columnCount={columns.length}
        rowCount={5}
        hasHeader
        hasCheckbox={!!onSelectRow && !!getRowId}
        hasActions={!!actions}
        className={className}
      />
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search bar */}
      {onSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.currentTarget.value)}
            className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:max-w-sm"
          />
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={cn("border-b border-border bg-muted/50", headerRowClassName)}>
                {onSelectRow && getRowId && (
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={!!allSelected}
                      onChange={(e) => onSelectAll?.(e.currentTarget.checked)}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-left font-medium text-muted-foreground",
                      col.sortable &&
                        "cursor-pointer select-none hover:text-foreground transition-colors",
                      col.width,
                      col.headerClassName,
                    )}
                    onClick={() => col.sortable && onSort?.(col.key)}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.header}
                      {col.sortable && (
                        <SortIndicator column={col.key} sortBy={sortBy} sortOrder={sortOrder} />
                      )}
                    </div>
                  </th>
                ))}
                {actions && <th className="w-12 px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (onSelectRow ? 1 : 0) + (actions ? 1 : 0)}
                    className="px-4 py-12 text-center"
                  >
                    <div className="flex flex-col items-center gap-2">
                      {emptyIcon}
                      <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row, i) => {
                  const rowId = getRowId?.(row);
                  const isSelected = rowId !== undefined && selectedIds?.has(rowId);

                  return (
                    <tr
                      key={rowId ?? i}
                      className={cn(
                        "transition-colors hover:bg-muted/30",
                        isSelected && "bg-primary/5",
                      )}
                    >
                      {onSelectRow && getRowId && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={!!isSelected}
                            onChange={(e) =>
                              rowId !== undefined && onSelectRow(rowId, e.currentTarget.checked)
                            }
                            className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                          />
                        </td>
                      )}
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn("px-4 py-3 text-card-foreground", col.cellClassName)}
                        >
                          {col.render
                            ? col.render(row)
                            : String((row as Record<string, unknown>)[col.key] ?? "")}
                        </td>
                      ))}
                      {actions && <td className="px-4 py-3 text-right">{actions(row)}</td>}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Integrated Pagination Footer */}
        {pagination && pagination.total > 0 && <DataTablePagination pagination={pagination} />}
      </div>
    </div>
  );
}

function SortIndicator({
  column,
  sortBy,
  sortOrder,
}: {
  column: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  if (sortBy !== column) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
  return sortOrder === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5 text-primary" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5 text-primary" />
  );
}

function DataTablePagination({ pagination }: { pagination: DataTablePaginationProps }) {
  const { page, perPage, total, onPageChange, onPerPageChange, currentLocale = "vi" } = pagination;

  const totalPages = Math.ceil(total / perPage);
  const visiblePages = useMemo(() => generatePages(page, totalPages), [page, totalPages]);
  const startRow = (page - 1) * perPage + 1;
  const endRow = Math.min(page * perPage, total);

  return (
    <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between border-t border-border bg-background gap-4 text-xs select-none">
      <div className="flex items-center gap-3 text-muted-foreground">
        {onPerPageChange && (
          <div className="relative inline-flex items-center">
            <select
              value={perPage}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              className="appearance-none bg-background border border-input rounded-lg pl-3 pr-8 py-1.5 font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-[#0F798C] focus:border-[#0F798C] cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
        )}

        <span className="font-medium">
          {currentLocale === "vi"
            ? `Hiển thị từ ${startRow} - ${endRow} trong tổng số ${total} bản ghi`
            : `Showing ${startRow}-${endRow} of ${total} records`}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          disabled={page === 1}
          onClick={() => onPageChange(1)}
          className="h-8 w-8 rounded-lg border-input text-muted-foreground hover:bg-accent cursor-pointer disabled:opacity-40"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          className="h-8 w-8 rounded-lg border-input text-muted-foreground hover:bg-accent cursor-pointer disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {visiblePages.map((p, i) => {
          if (p === "...") {
            const neighbor = visiblePages[i + 1] ?? visiblePages[i - 1];
            const ellipsisKey = `ellipsis-${String(neighbor)}`;
            return (
              <span
                key={ellipsisKey}
                className="flex h-8 w-8 items-center justify-center text-muted-foreground"
              >
                …
              </span>
            );
          }
          return (
            <Button
              key={p}
              variant={page === p ? "default" : "outline"}
              onClick={() => onPageChange(p as number)}
              className={cn(
                "h-8 w-8 rounded-lg text-xs font-semibold cursor-pointer",
                page === p
                  ? "bg-[#0F798C] hover:bg-[#0c6070] text-white"
                  : "border-input text-slate-700 dark:text-slate-200 hover:bg-accent",
              )}
            >
              {p}
            </Button>
          );
        })}

        <Button
          variant="outline"
          size="icon"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="h-8 w-8 rounded-lg border-input text-muted-foreground hover:bg-accent cursor-pointer disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className="h-8 w-8 rounded-lg border-input text-muted-foreground hover:bg-accent cursor-pointer disabled:opacity-40"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function generatePages(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("...");
  pages.push(total);

  return pages;
}
