"use client";

import { Checkbox } from "./checkbox";
import { ArrowUpDownIcon } from "./icon-component/ArrowUpDownIcon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { cn } from "../lib/utils";
import { PackageOpen } from "lucide-react";
import * as React from "react";

export interface Column<T> {
  header: React.ReactNode;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  width?: string | number;
  fixed?: "left" | "right";
  sortable?: boolean;
  sortKey?: string;
}

interface ComputedColumn<T> extends Column<T> {
  computedOffset?: number;
}

export interface TableBaseProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (item: T) => void;
  // Row selection props
  enableRowSelection?: boolean;
  selectedRowIds?: (string | number)[];
  onSelectedRowIdsChange?: (ids: (string | number)[]) => void;
  fixedCheckbox?: boolean;
  // Scroll and sizing props
  minWidth?: string | number;
  // Sorting props
  sortBy?: string;
  sortOrder?: "asc" | "desc" | null;
  onSortChange?: (sortKey: string, nextSortOrder: "asc" | "desc" | null) => void;
}

function renderCellContent<T>(item: T, col: Column<T>): React.ReactNode {
  if (col.cell) {
    return col.cell(item);
  }
  if (col.accessorKey) {
    return item[col.accessorKey] as React.ReactNode;
  }
  return null;
}

export function TableBase<T extends { id: string | number }>({
  data,
  columns,
  isLoading = false,
  emptyMessage = "No data found.",
  className,
  onRowClick,
  enableRowSelection = false,
  selectedRowIds = [],
  onSelectedRowIdsChange,
  fixedCheckbox = true,
  minWidth,
  sortBy,
  sortOrder,
  onSortChange,
}: TableBaseProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [showLeftShadow, setShowLeftShadow] = React.useState(false);
  const [showRightShadow, setShowRightShadow] = React.useState(false);

  // Internal sort state for client-side sorting fallback when onSortChange is omitted
  const [internalSortBy, setInternalSortBy] = React.useState<string | undefined>(undefined);
  const [internalSortOrder, setInternalSortOrder] = React.useState<"asc" | "desc" | null>(null);

  const currentSortBy = sortBy ?? internalSortBy;
  const currentSortOrder = sortOrder !== undefined ? sortOrder : internalSortOrder;

  const handleHeaderSort = React.useCallback(
    (sortKey: string) => {
      let nextSortOrder: "asc" | "desc" | null = "asc";
      if (currentSortBy === sortKey) {
        if (currentSortOrder === "asc") {
          nextSortOrder = "desc";
        } else if (currentSortOrder === "desc") {
          nextSortOrder = null;
        } else {
          nextSortOrder = "asc";
        }
      }

      if (onSortChange) {
        onSortChange(sortKey, nextSortOrder);
      } else {
        setInternalSortBy(nextSortOrder ? sortKey : undefined);
        setInternalSortOrder(nextSortOrder);
      }
    },
    [currentSortBy, currentSortOrder, onSortChange],
  );

  const processedData = React.useMemo(() => {
    if (!currentSortBy || !currentSortOrder || onSortChange) {
      return data;
    }

    const sortCol = columns.find(
      (c) =>
        (c.sortKey ??
          (c.accessorKey
            ? String(c.accessorKey)
            : typeof c.header === "string"
              ? c.header
              : "")) === currentSortBy,
    );

    const keyAccessor = sortCol?.accessorKey;
    if (!keyAccessor) return data;

    return [...data].sort((a, b) => {
      const aVal = a[keyAccessor];
      const bVal = b[keyAccessor];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return currentSortOrder === "asc" ? aVal - bVal : bVal - aVal;
      }

      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();
      const cmp = strA.localeCompare(strB);
      return currentSortOrder === "asc" ? cmp : -cmp;
    });
  }, [data, columns, currentSortBy, currentSortOrder, onSortChange]);

  const handleScroll = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setShowLeftShadow(scrollLeft > 0);
    setShowRightShadow(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: handleScroll should re-run on data/loading changes
  React.useEffect(() => {
    handleScroll();
  }, [data, isLoading, handleScroll]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);
    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [handleScroll]);

  const selectableData = React.useMemo(
    () => processedData.filter((item) => item.id !== undefined),
    [processedData],
  );

  const isAllSelected = React.useMemo(() => {
    if (selectableData.length === 0) return false;
    return selectableData.every((item) => selectedRowIds.includes(item.id));
  }, [selectableData, selectedRowIds]);

  const isSomeSelected = React.useMemo(() => {
    if (selectableData.length === 0) return false;
    return selectableData.some((item) => selectedRowIds.includes(item.id)) && !isAllSelected;
  }, [selectableData, selectedRowIds, isAllSelected]);

  const handleSelectAllToggle = React.useCallback(() => {
    if (!onSelectedRowIdsChange) return;
    if (isAllSelected) {
      const currentIds = selectableData.map((item) => item.id);
      const nextIds = selectedRowIds.filter((id) => !currentIds.includes(id));
      onSelectedRowIdsChange(nextIds);
    } else {
      const currentIds = selectableData.map((item) => item.id);
      const nextIds = Array.from(new Set([...selectedRowIds, ...currentIds]));
      onSelectedRowIdsChange(nextIds);
    }
  }, [selectableData, isAllSelected, selectedRowIds, onSelectedRowIdsChange]);

  const handleRowSelectToggle = React.useCallback(
    (id: string | number) => {
      if (!onSelectedRowIdsChange) return;
      const isSelected = selectedRowIds.includes(id);
      let nextIds: (string | number)[] = [];
      if (isSelected) {
        nextIds = selectedRowIds.filter((item) => item !== id);
      } else {
        nextIds = [...selectedRowIds, id];
      }
      onSelectedRowIdsChange(nextIds);
    },
    [selectedRowIds, onSelectedRowIdsChange],
  );

  const isCheckboxFixed = React.useMemo(
    () => enableRowSelection && fixedCheckbox,
    [enableRowSelection, fixedCheckbox],
  );

  // Compute fixed column offsets
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: computedColumns calculation
  const computedColumns = React.useMemo(() => {
    // Selection column width is 48px (w-12) if fixed
    let leftAccumulator = isCheckboxFixed ? 48 : 0;

    const colsWithLeft: ComputedColumn<T>[] = columns.map((col) => {
      if (col.fixed === "left") {
        const left = leftAccumulator;
        const colWidth =
          typeof col.width === "number"
            ? col.width
            : typeof col.width === "string" && col.width.endsWith("px")
              ? Number.parseInt(col.width, 10)
              : 150; // Fallback
        leftAccumulator += colWidth;
        return { ...col, computedOffset: left };
      }
      return col;
    });

    let rightAccumulator = 0;
    for (let i = colsWithLeft.length - 1; i >= 0; i--) {
      const col = colsWithLeft[i];
      if (col && col.fixed === "right") {
        const right = rightAccumulator;
        const colWidth =
          typeof col.width === "number"
            ? col.width
            : typeof col.width === "string" && col.width.endsWith("px")
              ? Number.parseInt(col.width, 10)
              : 150; // Fallback
        rightAccumulator += colWidth;
        colsWithLeft[i] = { ...col, computedOffset: right };
      }
    }

    return colsWithLeft;
  }, [columns, isCheckboxFixed]);

  const lastLeftFixedIdx = React.useMemo(() => {
    for (let i = computedColumns.length - 1; i >= 0; i--) {
      if (computedColumns[i]?.fixed === "left") {
        return i;
      }
    }
    return -1;
  }, [computedColumns]);

  const firstRightFixedIdx = React.useMemo(() => {
    for (let i = 0; i < computedColumns.length; i++) {
      if (computedColumns[i]?.fixed === "right") {
        return i;
      }
    }
    return -1;
  }, [computedColumns]);

  const isCheckboxRightmostFixedLeft = React.useMemo(
    () => isCheckboxFixed && lastLeftFixedIdx === -1,
    [isCheckboxFixed, lastLeftFixedIdx],
  );

  const checkboxShadowStyle = React.useMemo(() => {
    if (!isCheckboxFixed) return undefined;
    const baseBorder = "inset -1px 0 0 0 var(--border)";
    if (isCheckboxRightmostFixedLeft && showLeftShadow) {
      return {
        boxShadow: `${baseBorder}, inset -10px 0 8px -8px rgba(0, 0, 0, 0.15)`,
      };
    }
    return { boxShadow: baseBorder };
  }, [isCheckboxFixed, isCheckboxRightmostFixedLeft, showLeftShadow]);

  const colSpanCount = enableRowSelection ? columns.length + 1 : columns.length;

  return (
    <div
      ref={containerRef}
      className={cn("overflow-x-auto w-full relative thin-scrollbar", className)}
    >
      <Table
        className="border-separate border-spacing-0"
        style={
          minWidth
            ? { minWidth: typeof minWidth === "number" ? `${minWidth}px` : minWidth }
            : undefined
        }
      >
        <TableHeader className="bg-transparent">
          <TableRow className="hover:bg-transparent">
            {enableRowSelection && (
              <TableHead
                className={cn(
                  "w-12 p-0 text-center align-middle h-11 border-b border-border bg-white dark:bg-zinc-900",
                  isCheckboxFixed && "sticky left-0 z-20",
                )}
                style={{
                  width: "48px",
                  minWidth: "48px",
                  maxWidth: "48px",
                  ...(isCheckboxFixed ? { left: 0 } : undefined),
                  ...checkboxShadowStyle,
                }}
              >
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={isAllSelected ? true : isSomeSelected ? "indeterminate" : false}
                    onCheckedChange={handleSelectAllToggle}
                    aria-label="Select all rows"
                  />
                </div>
              </TableHead>
            )}
            {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: header cells rendering */}
            {computedColumns.map((col, idx) => {
              const isSticky = col.fixed !== undefined;
              const fixedDir = col.fixed;
              const sortKey =
                col.sortKey ??
                (col.accessorKey
                  ? String(col.accessorKey)
                  : typeof col.header === "string"
                    ? col.header
                    : undefined);
              const isSortable = col.sortable && !!sortKey;
              const isCurrentSorted = currentSortBy === sortKey;

              const widthStyle = col.width
                ? {
                    width: typeof col.width === "number" ? `${col.width}px` : col.width,
                    minWidth: typeof col.width === "number" ? `${col.width}px` : col.width,
                  }
                : undefined;

              let stickyBorder = "";
              if (isSticky && fixedDir === "left") {
                stickyBorder = "inset -1px 0 0 0 var(--border)";
              } else if (isSticky && fixedDir === "right") {
                stickyBorder = "inset 1px 0 0 0 var(--border)";
              }

              let shadowPart = "";
              if (idx === lastLeftFixedIdx && showLeftShadow) {
                shadowPart = "inset -10px 0 8px -8px rgba(0, 0, 0, 0.15)";
              } else if (idx === firstRightFixedIdx && showRightShadow) {
                shadowPart = "inset 10px 0 8px -8px rgba(0, 0, 0, 0.15)";
              }

              const shadowStyle = isSticky
                ? {
                    boxShadow: [stickyBorder, shadowPart].filter(Boolean).join(", "),
                  }
                : undefined;

              const isCentered = col.headerClassName?.includes("text-center");
              const isRightAligned = col.headerClassName?.includes("text-right");

              return (
                <TableHead
                  // biome-ignore lint/suspicious/noArrayIndexKey: column headers are static
                  key={idx}
                  className={cn(
                    "font-medium text-[#232323] dark:text-zinc-100 h-11 xl:h-12 2xl:h-[52px] text-sm lg:text-base xl:text-base 2xl:text-xl whitespace-nowrap align-middle border-b border-border transition-colors duration-150",
                    isSticky
                      ? "sticky z-20 bg-white dark:bg-zinc-900"
                      : "bg-[#CFFEF9] dark:bg-teal-950/60",
                    isSortable && "cursor-pointer select-none group/sort",
                    col.headerClassName,
                  )}
                  style={{
                    ...widthStyle,
                    ...(isSticky && fixedDir ? { [fixedDir]: col.computedOffset } : undefined),
                    ...shadowStyle,
                  }}
                  onClick={() => {
                    if (isSortable && sortKey) {
                      handleHeaderSort(sortKey);
                    }
                  }}
                >
                  <div
                    className={cn(
                      "flex items-center gap-2 w-full",
                      isSortable
                        ? "justify-between"
                        : isCentered
                          ? "justify-center"
                          : isRightAligned
                            ? "justify-end"
                            : "justify-start",
                    )}
                  >
                    <span>{col.header}</span>
                    {isSortable && (
                      <span className="shrink-0 inline-flex items-center text-[#0A0A0A]">
                        <ArrowUpDownIcon
                          className={cn(
                            "size-4 transition-colors",
                            isCurrentSorted
                              ? "text-[#0A0A0A] dark:text-cyan-400"
                              : "text-[#7B7B7B] opacity-60 group-hover/sort:opacity-100",
                          )}
                        />
                      </span>
                    )}
                  </div>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={colSpanCount} className="text-center py-16 text-muted-foreground">
                <div className="flex flex-col items-center justify-center gap-2">
                  <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#0F798C] border-t-transparent" />
                  <span className="text-sm font-medium">Loading data...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : processedData.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={colSpanCount} className="text-center py-20">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="p-3 bg-muted/30 rounded-full">
                    <PackageOpen className="h-8 w-8 text-muted-foreground/80" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground max-w-[280px]">
                    {emptyMessage}
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            processedData.map((item) => (
              <TableRow
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  "group transition-colors duration-150 hover:bg-muted/20",
                  onRowClick && "cursor-pointer",
                )}
              >
                {enableRowSelection && (
                  <TableCell
                    className={cn(
                      "w-12 p-0 text-center align-middle border-b border-border",
                      isCheckboxFixed &&
                        "sticky left-0 z-10 bg-background group-hover:bg-[#FAFAFC] dark:group-hover:bg-[#141416] transition-colors duration-150",
                    )}
                    style={{
                      width: "48px",
                      minWidth: "48px",
                      maxWidth: "48px",
                      ...(isCheckboxFixed ? { left: 0 } : undefined),
                      ...checkboxShadowStyle,
                    }}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()} // Prevent row click details modal
                  >
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={selectedRowIds.includes(item.id) || false}
                        onCheckedChange={() => handleRowSelectToggle(item.id)}
                        aria-label={`Select row ${item.id}`}
                      />
                    </div>
                  </TableCell>
                )}
                {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: row cells mapping rendering */}
                {computedColumns.map((col, colIdx) => {
                  const content = renderCellContent(item, col);
                  const isSticky = col.fixed !== undefined;
                  const fixedDir = col.fixed;

                  const widthStyle = col.width
                    ? {
                        width: typeof col.width === "number" ? `${col.width}px` : col.width,
                        minWidth: typeof col.width === "number" ? `${col.width}px` : col.width,
                      }
                    : undefined;

                  let stickyBorder = "";
                  if (isSticky && fixedDir === "left") {
                    stickyBorder = "inset -1px 0 0 0 var(--border)";
                  } else if (isSticky && fixedDir === "right") {
                    stickyBorder = "inset 1px 0 0 0 var(--border)";
                  }

                  let shadowPart = "";
                  if (colIdx === lastLeftFixedIdx && showLeftShadow) {
                    shadowPart = "inset -10px 0 8px -8px rgba(0, 0, 0, 0.15)";
                  } else if (colIdx === firstRightFixedIdx && showRightShadow) {
                    shadowPart = "inset 10px 0 8px -8px rgba(0, 0, 0, 0.15)";
                  }

                  const shadowStyle = isSticky
                    ? {
                        boxShadow: [stickyBorder, shadowPart].filter(Boolean).join(", "),
                      }
                    : undefined;

                  return (
                    <TableCell
                      // biome-ignore lint/suspicious/noArrayIndexKey: row cells are stable within structured column definitions
                      key={colIdx}
                      className={cn(
                        "p-3 text-sm 2xl:text-xl text-[#232323] align-middle border-b border-border",
                        isSticky &&
                          "sticky z-10 bg-background group-hover:bg-[#FAFAFC] dark:group-hover:bg-[#141416] transition-colors duration-150",
                        col.className,
                      )}
                      style={{
                        ...widthStyle,
                        ...(isSticky && fixedDir ? { [fixedDir]: col.computedOffset } : undefined),
                        ...shadowStyle,
                      }}
                    >
                      {content}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
