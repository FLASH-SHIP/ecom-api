"use client";

import { cn } from "@ecom/ui/lib/utils";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (row: T) => ReactNode;
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
}

export function DataTable<T extends Record<string, unknown>>({
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

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
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
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows have no stable identity
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    {onSelectRow && getRowId && (
                      <td className="px-4 py-3">
                        <div className="h-4 w-4 rounded bg-muted" />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        <div className="h-4 w-3/4 rounded bg-muted" />
                      </td>
                    ))}
                    {actions && (
                      <td className="px-4 py-3">
                        <div className="h-4 w-4 rounded bg-muted" />
                      </td>
                    )}
                  </tr>
                ))
              ) : data.length === 0 ? (
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
                        <td key={col.key} className="px-4 py-3 text-card-foreground">
                          {col.render ? col.render(row) : String(row[col.key] ?? "")}
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
