"use client";

/**
 * DataTable — Admin data table built on @tanstack/react-table + shadcn/ui.
 *
 * Features:
 *  - Server-side pagination, sorting, filtering via onServerChange callback
 *  - Botble-style filter panel (field/operator/value with explicit Apply)
 *  - Row selection with bulk actions (Botble-style dropdown)
 *  - Row action menu per row
 *  - Global search
 *  - Column visibility toggle
 *  - Responsive, Tailwind-styled
 */

import { BulkActionDropdown } from "@admin/components/data-table/BulkActionDropdown";
import { BulkChangeDialog } from "@admin/components/data-table/BulkChangeDialog";
import { ColumnHeaderMenu } from "@admin/components/data-table/ColumnHeaderMenu";
import { ColumnManagementPanel } from "@admin/components/data-table/ColumnManagementPanel";
import { CopyCell } from "@admin/components/data-table/CopyCell";
import { FilterPanel } from "@admin/components/data-table/FilterPanel";
import { RowActionMenu } from "@admin/components/data-table/RowActionMenu";
import PageBreadcrumb from "@admin/components/PageBreadcrumb";
import { SearchInput } from "@admin/components/ui/SearchInput";
import { Button } from "@ecom/ui/components/button";
import { Checkbox } from "@ecom/ui/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@ecom/ui/components/dropdown-menu";
import { Pagination } from "@ecom/ui/components/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { Skeleton } from "@ecom/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ecom/ui/components/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ecom/ui/components/tooltip";
import { cn } from "@ecom/ui/lib/utils";
import type {
  Column,
  ColumnDef,
  ColumnOrderState,
  ColumnPinningState,
  Row,
  SortingState,
  Table as TanStackTable,
  VisibilityState,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Filter, FilterX, Maximize, Minimize, RefreshCw, Rows3 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getValidFilters } from "./filter-validation";
import type { ActiveFilter, DataTableServerParams, FilterFieldDef, RowAction } from "./types";

// ── Types ────────────────────────────────────────────────────────────────────

export type { RowAction } from "./types";

/** @deprecated Use BulkActionConfig instead */
export interface BulkAction<T> {
  key: string;
  label: string;
  onClick: (selectedRows: T[], clearSelection: () => void) => void | Promise<void>;
  variant?: "default" | "danger";
  disabled?: boolean;
}

export interface BulkChangeField {
  key: string;
  label: string;
  type: "text" | "select" | "date";
  options?: { value: string; label: string }[];
}

export interface BulkActionConfig<T> {
  bulkChangeFields?: BulkChangeField[];
  onBulkChange?: (selectedRows: T[], fieldKey: string, value: string) => void | Promise<void>;
  onBulkDelete?: (selectedRows: T[], clearSelection: () => void) => void | Promise<void>;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  rowCount?: number;
  isLoading?: boolean;
  isFetching?: boolean;
  onServerChange?: (params: DataTableServerParams) => void;
  rowActions?: RowAction<T>[];
  /** Custom render function for row action menu items */
  renderRowActionMenuItems?: (params: { row: Row<T>; table: TanStackTable<T> }) => ReactNode;
  /** Custom render function for column header menu items */
  renderColumnActionsMenuItems?: (params: {
    column: Column<T, unknown>;
    table: TanStackTable<T>;
  }) => ReactNode;
  /** @deprecated Use bulkActionConfig */
  bulkActions?: BulkAction<T>[];
  bulkActionConfig?: BulkActionConfig<T>;
  /** Filter field definitions for the Botble-style filter panel */
  filterFields?: FilterFieldDef[];
  pageTitle?: string;
  headerActions?: ReactNode;
  /** Render content right after the search input (before the spacer) */
  toolbarLeading?: ReactNode;
  toolbarActions?: ReactNode;
  emptyState?: ReactNode;
  tableKey?: string | number;
  onRefresh?: () => void;
  defaultPageSize?: number;
  defaultPage?: number;
  /** Enable global search input in toolbar. Default: true */
  enableGlobalSearch?: boolean;
  /** Enable column resizing. Default: true */
  enableColumnResizing?: boolean;
  /** Enable column pinning. Default: true */
  enableColumnPinning?: boolean;
  /** Enable column ordering via drag-and-drop. Default: false */
  enableColumnOrdering?: boolean;
  /** Enable click-to-copy on cells. Default: false */
  enableClickToCopy?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: full-featured data table with 15+ features; further splitting creates excessive prop drilling
export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  rowCount,
  isLoading,
  isFetching,
  onServerChange,
  rowActions,
  renderRowActionMenuItems,
  renderColumnActionsMenuItems,
  bulkActions,
  bulkActionConfig,
  filterFields,
  pageTitle,
  headerActions,
  toolbarLeading,
  toolbarActions,
  emptyState,
  tableKey,
  onRefresh,
  defaultPageSize = 25,
  defaultPage = 1,
  enableGlobalSearch = true,
  enableColumnResizing = true,
  enableColumnPinning = true,
  enableColumnOrdering = true,
  enableClickToCopy = false,
}: DataTableProps<T>) {
  const t = useTranslations("dataTable");

  // ── State ───────────────────────────────────────────────────────────────────
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [searchDisplay, setSearchDisplay] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pagination, setPagination] = useState({
    pageIndex: defaultPage - 1,
    pageSize: defaultPageSize,
  });
  const [density, setDensity] = useState<"compact" | "normal" | "spacious">("normal");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<"idle" | "loading" | "completing" | "fading">("idle");
  const timersRef = useRef<{ t1?: NodeJS.Timeout; t2?: NodeJS.Timeout }>({});

  const startLoading = useCallback(() => {
    if (timersRef.current.t1) clearTimeout(timersRef.current.t1);
    if (timersRef.current.t2) clearTimeout(timersRef.current.t2);
    setStage("loading");
    setProgress(0);
    timersRef.current.t1 = setTimeout(() => {
      setProgress(70);
    }, 20);
  }, []);

  const completeLoading = useCallback(() => {
    setStage("completing");
    setProgress(100);

    if (timersRef.current.t1) clearTimeout(timersRef.current.t1);
    timersRef.current.t1 = setTimeout(() => {
      setStage("fading");

      if (timersRef.current.t2) clearTimeout(timersRef.current.t2);
      timersRef.current.t2 = setTimeout(() => {
        setStage("idle");
        setProgress(0);
      }, 200);
    }, 300);
  }, []);

  useEffect(() => {
    if (isFetching && stage !== "loading") {
      startLoading();
    } else if (!isFetching && stage === "loading") {
      completeLoading();
    }
  }, [isFetching, stage, startLoading, completeLoading]);

  useEffect(() => {
    return () => {
      if (timersRef.current.t1) clearTimeout(timersRef.current.t1);
      if (timersRef.current.t2) clearTimeout(timersRef.current.t2);
    };
  }, []);
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({});

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pinning logic checks selection, meta pins, and action columns
  useEffect(() => {
    // Only apply column pinning on desktop client after mount to prevent hydration mismatch
    const isMobile = window.matchMedia("(min-width: 768px)").matches === false;
    if (!isMobile) {
      const left: string[] = [];
      const right: string[] = [];
      if (bulkActionConfig || (bulkActions && bulkActions.length > 0)) left.push("select");
      for (const col of columns) {
        const pin = (col.meta as Record<string, string> | undefined)?.pin;
        const id = (col as { accessorKey?: string }).accessorKey ?? col.id;
        if (pin === "left" && id) left.push(id);
        if (pin === "right" && id) right.push(id);
      }
      if ((rowActions && rowActions.length > 0) || renderRowActionMenuItems) right.push("actions");
      if (left.length > 0 || right.length > 0) {
        setColumnPinning({ left, right });
      }
    }
  }, [columns, bulkActionConfig, bulkActions, rowActions, renderRowActionMenuItems]);

  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Column DnD visual state — tracks which columns to highlight during drag
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const handleColumnDragChange = useCallback(
    ({ draggingId, dragOverId }: { draggingId: string | null; dragOverId: string | null }) => {
      if (draggingId !== undefined) setDraggingColumnId((prev) => draggingId ?? prev);
      if (dragOverId !== undefined) setDragOverColumnId(dragOverId);
      if (draggingId === null && dragOverId === null) {
        setDraggingColumnId(null);
        setDragOverColumnId(null);
      }
    },
    [],
  );

  // Header/cell-level DnD — onDragOver continuously tracks column under cursor (no flicker)
  const handleCellDragOver = useCallback(
    (e: React.DragEvent, columnId: string) => {
      if (!enableColumnOrdering) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverColumnId((prev) => (prev === columnId ? prev : columnId));
    },
    [enableColumnOrdering],
  );

  const handleCellDrop = useCallback((e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setDragOverColumnId(null);
    setDraggingColumnId(null);
    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === targetColumnId) return;

    setColumnOrder((prev) => {
      if (prev.length === 0) return prev;

      const order = [...prev];
      const fromIdx = order.indexOf(draggedId);
      const toIdx = order.indexOf(targetColumnId);
      if (fromIdx === -1 || toIdx === -1) return prev;

      order.splice(fromIdx, 1);
      order.splice(toIdx, 0, draggedId);
      return order;
    });
  }, []);

  // Clear drag-over when cursor leaves table entirely
  const handleTableDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverColumnId(null);
  }, []);

  // Bulk action state
  const [bulkChangeField, setBulkChangeField] = useState<BulkChangeField | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  // ── Botble filter panel state ───────────────────────────────────────────────
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [pendingFilters, setPendingFilters] = useState<ActiveFilter[]>([]);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);

  const activeFiltersRef = useRef(activeFilters);
  activeFiltersRef.current = activeFilters;

  const createFilterRow = useCallback((): ActiveFilter => {
    const firstField = filterFields?.[0];
    const firstOp = firstField?.operators?.[0]?.value ?? "contains";
    return {
      id: crypto.randomUUID(),
      fieldKey: firstField?.key ?? "",
      operator: firstOp,
      value: "",
    };
  }, [filterFields]);

  const addFilterRow = useCallback(() => {
    setPendingFilters((prev) => [...prev, createFilterRow()]);
  }, [createFilterRow]);

  const removeFilterRow = useCallback((id: string) => {
    setPendingFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const updateFilterRow = useCallback((id: string, patch: Partial<ActiveFilter>) => {
    setPendingFilters((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const openFilterPanel = useCallback(() => {
    setPendingFilters((prev) => {
      if (prev.length === 0 && activeFiltersRef.current.length === 0) {
        return [createFilterRow()];
      }
      if (prev.length === 0) return [...activeFiltersRef.current];
      return prev;
    });
    setFilterPanelOpen(true);
  }, [createFilterRow]);

  // Close fullscreen on Escape
  useEffect(() => {
    if (!isFullscreen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsFullscreen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isFullscreen]);

  const densityPadding = density === "compact" ? "py-1" : density === "spacious" ? "py-4" : "py-2";

  const isServerMode = !!onServerChange;

  // Stable ref for onServerChange to break callback re-creation chain
  const onServerChangeRef = useRef(onServerChange);
  onServerChangeRef.current = onServerChange;

  // ── Server change emitter ───────────────────────────────────────────────────

  const emitServerChange = useCallback(
    (
      newPagination: { pageIndex: number; pageSize: number },
      newSorting: SortingState,
      newGlobalFilter: string,
      newActiveFilters: ActiveFilter[],
    ) => {
      const fn = onServerChangeRef.current;
      if (!fn) return;
      const sortItem = newSorting[0];

      fn({
        search: newGlobalFilter ?? "",
        filters: newActiveFilters,
        sort: sortItem
          ? { key: sortItem.id, direction: sortItem.desc ? "desc" : "asc" }
          : { key: "id", direction: "desc" },
        page: newPagination.pageIndex + 1,
        pageSize: newPagination.pageSize,
      });
    },
    [],
  );

  // ── Apply / Clear filters ──────────────────────────────────────────────────

  const applyFilters = useCallback(() => {
    const valid = getValidFilters(pendingFilters, filterFields ?? []);
    setActiveFilters(valid);
    const resetPag = { ...pagination, pageIndex: 0 };
    setPagination(resetPag);
    if (isServerMode) {
      emitServerChange(resetPag, sorting, globalFilter, valid);
    }
  }, [
    pendingFilters,
    filterFields,
    pagination,
    isServerMode,
    emitServerChange,
    sorting,
    globalFilter,
  ]);

  const clearFilters = useCallback(() => {
    setPendingFilters([]);
    setActiveFilters([]);
    const resetPag = { ...pagination, pageIndex: 0 };
    setPagination(resetPag);
    if (isServerMode) {
      emitServerChange(resetPag, sorting, globalFilter, []);
    }
  }, [pagination, isServerMode, emitServerChange, sorting, globalFilter]);

  // Column-level filter actions (used by ColumnHeaderMenu)
  const handleAddColumnFilter = useCallback((fieldKey: string, operator: string) => {
    const newFilter: ActiveFilter = {
      id: crypto.randomUUID(),
      fieldKey,
      operator,
      value: "",
    };
    setPendingFilters((prev) => [...prev.filter((f) => f.fieldKey !== fieldKey), newFilter]);
    setFilterPanelOpen(true);
  }, []);

  const handleClearColumnFilter = useCallback(
    (fieldKey: string) => {
      const next = activeFilters.filter((f) => f.fieldKey !== fieldKey);
      setActiveFilters(next);
      setPendingFilters((prev) => prev.filter((f) => f.fieldKey !== fieldKey));
      const resetPag = { ...pagination, pageIndex: 0 };
      setPagination(resetPag);
      if (isServerMode) {
        emitServerChange(resetPag, sorting, globalFilter, next);
      }
    },
    [activeFilters, pagination, isServerMode, emitServerChange, sorting, globalFilter],
  );

  // ── Event handlers (emit to server when in server mode) ─────────────────────

  const handleSortingChange = useCallback(
    (updater: SortingState | ((prev: SortingState) => SortingState)) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      setSorting(next);
      const resetPag = { ...pagination, pageIndex: 0 };
      setPagination(resetPag);
      emitServerChange(resetPag, next, globalFilter, activeFilters);
    },
    [sorting, pagination, globalFilter, activeFilters, emitServerChange],
  );

  const handleGlobalFilterChange = useCallback(
    (value: string) => {
      setSearchDisplay(value);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        setGlobalFilter(value);
        const resetPag = { ...pagination, pageIndex: 0 };
        setPagination(resetPag);
        emitServerChange(resetPag, sorting, value, activeFilters);
      }, 300);
    },
    [pagination, sorting, activeFilters, emitServerChange],
  );

  const handleClearAllFilters = useCallback(() => {
    setActiveFilters([]);
    setPendingFilters([]);
    setGlobalFilter("");
    setSearchDisplay("");
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const resetPag = { ...pagination, pageIndex: 0 };
    setPagination(resetPag);
    emitServerChange(resetPag, sorting, "", []);
  }, [pagination, sorting, emitServerChange]);

  // ── Add selection column if bulk actions exist ──────────────────────────────

  const hasBulk = !!bulkActionConfig || (bulkActions && bulkActions.length > 0);

  const allColumns = useMemo(() => {
    const cols: ColumnDef<T, unknown>[] = [];

    if (hasBulk) {
      cols.push({
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
        minSize: 40,
      });
    }

    cols.push(...columns);

    if ((rowActions && rowActions.length > 0) || renderRowActionMenuItems) {
      cols.push({
        id: "actions",
        header: () => <span className="flex w-full justify-center">{t("actions")}</span>,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,
        enablePinning: true,
        size: 80,
        minSize: 80,
        cell: ({ row, table: tbl }) => (
          <div className="flex justify-center">
            <RowActionMenu
              row={row.original}
              actions={rowActions}
              renderCustomItems={
                renderRowActionMenuItems
                  ? () => renderRowActionMenuItems({ row, table: tbl })
                  : undefined
              }
            />
          </div>
        ),
      });
    }

    return cols;
  }, [columns, hasBulk, rowActions, renderRowActionMenuItems, t]);

  // ── Table instance ──────────────────────────────────────────────────────────

  const table = useReactTable({
    data,
    columns: allColumns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      globalFilter,
      pagination,
      columnPinning,
      columnOrder,
    },
    onSortingChange: isServerMode ? handleSortingChange : setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onColumnPinningChange: setColumnPinning,
    onColumnOrderChange: setColumnOrder,
    onGlobalFilterChange: isServerMode
      ? (updater) => {
          const next = typeof updater === "function" ? updater(globalFilter) : updater;
          handleGlobalFilterChange(next);
        }
      : setGlobalFilter,
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(pagination) : updater;
      setPagination(next);
      if (isServerMode) {
        emitServerChange(next, sorting, globalFilter, activeFilters);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    ...(isServerMode
      ? {
          manualPagination: true,
          manualSorting: true,
          manualFiltering: true,
          rowCount: rowCount ?? 0,
        }
      : {
          getPaginationRowModel: getPaginationRowModel(),
          getSortedRowModel: getSortedRowModel(),
          getFilteredRowModel: getFilteredRowModel(),
        }),
    enableRowSelection: !!hasBulk,
    enableColumnResizing,
    columnResizeMode: "onChange",
    enableColumnPinning,
  });

  // Seed column order on mount so DnD drop handler has a valid order
  useEffect(() => {
    if (columnOrder.length === 0 && enableColumnOrdering) {
      setColumnOrder(table.getAllLeafColumns().map((c) => c.id));
    }
  }, [columnOrder.length, enableColumnOrdering, table]);

  // ── Bulk action helpers ─────────────────────────────────────────────────────

  const selectedRows = table.getFilteredSelectedRowModel().rows.map((r) => r.original);
  const hasSelection = selectedRows.length > 0;

  const clearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  const handleBulkChangeSubmit = useCallback(
    async (fieldKey: string, value: string) => {
      if (bulkActionConfig?.onBulkChange) {
        await bulkActionConfig.onBulkChange(selectedRows, fieldKey, value);
        clearSelection();
      }
    },
    [bulkActionConfig, selectedRows, clearSelection],
  );

  // ── Pagination ──────────────────────────────────────────────────────────────

  const totalRows = isServerMode ? (rowCount ?? 0) : table.getFilteredRowModel().rows.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pagination.pageSize));
  const from = totalRows === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const to = Math.min((pagination.pageIndex + 1) * pagination.pageSize, totalRows);

  // Auto-clamp pageIndex to page 1 if current pageIndex exceeds available pageCount
  useEffect(() => {
    if (isServerMode && totalRows > 0 && pagination.pageIndex >= pageCount) {
      const resetPag = { ...pagination, pageIndex: 0 };
      setPagination(resetPag);
      emitServerChange(resetPag, sorting, globalFilter, activeFilters);
    }
  }, [
    isServerMode,
    totalRows,
    pageCount,
    pagination,
    sorting,
    globalFilter,
    activeFilters,
    emitServerChange,
  ]);

  // ── Filter panel helpers ────────────────────────────────────────────────────

  const hasFilterFields = filterFields && filterFields.length > 0;
  const activeFilterCount = activeFilters.length;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      {/* Page header */}
      {pageTitle && (
        <div className="mb-4 flex flex-col">
          <PageBreadcrumb className="mb-2" />
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <h2 className="flex-auto text-xl font-bold">{pageTitle}</h2>
            {headerActions && (
              <div className="flex flex-shrink-0 flex-wrap items-center justify-center gap-2 sm:justify-start">
                {headerActions}
              </div>
            )}
          </div>
        </div>
      )}
      {!pageTitle && headerActions && (
        <div className="mb-2 flex flex-wrap items-center justify-end gap-2">{headerActions}</div>
      )}

      {/* Filter panel (Botble-style) */}
      {hasFilterFields && (
        <FilterPanel
          open={filterPanelOpen}
          fields={filterFields}
          filters={pendingFilters}
          onAdd={addFilterRow}
          onRemove={removeFilterRow}
          onUpdate={updateFilterRow}
          onApply={applyFilters}
          onClose={() => setFilterPanelOpen(false)}
          onClear={clearFilters}
          hasActiveFilters={activeFilterCount > 0}
        />
      )}

      {/* Table card */}
      <div
        ref={tableContainerRef}
        className={cn(
          "flex w-full flex-col overflow-hidden rounded-lg border border-border bg-card",
          isFullscreen &&
            "fixed inset-0 z-fullscreen rounded-none border-0 overflow-auto bg-background",
        )}
      >
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          {/* Global search */}
          {enableGlobalSearch && (
            <SearchInput
              value={isServerMode ? searchDisplay : globalFilter}
              onChange={(val) => {
                if (isServerMode) {
                  handleGlobalFilterChange(val);
                } else {
                  setGlobalFilter(val);
                }
              }}
              placeholder={t("search")}
              minChars={2}
              debounceMs={300}
              className="w-full sm:w-auto sm:flex-1 sm:max-w-xs"
              inputClassName="h-8 text-sm"
            />
          )}

          {toolbarLeading}

          {/* Bulk action buttons */}
          {hasSelection && bulkActionConfig && (
            <BulkActionDropdown
              config={bulkActionConfig}
              selectedRows={selectedRows}
              clearSelection={clearSelection}
              onBulkChangeFieldSelect={(field) => {
                setBulkChangeField(field);
                setBulkDialogOpen(true);
              }}
              t={t}
            />
          )}

          {hasSelection &&
            !bulkActionConfig &&
            bulkActions?.map((action) => (
              <Button
                key={action.key}
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 text-xs",
                  action.variant === "danger" && "text-destructive hover:text-destructive",
                )}
                disabled={action.disabled}
                onClick={() => action.onClick(selectedRows, clearSelection)}
              >
                {action.label} ({selectedRows.length})
              </Button>
            ))}

          <div className="flex-1" />

          {toolbarActions}

          {/* Filter data button (Botble-style) */}
          {hasFilterFields && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "relative size-7",
                    filterPanelOpen && "bg-accent text-accent-foreground",
                  )}
                  onClick={() => (filterPanelOpen ? setFilterPanelOpen(false) : openFilterPanel())}
                >
                  <Filter className="size-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("filterData")}</TooltipContent>
            </Tooltip>
          )}

          {/* Column management panel (Admin-style) */}
          <ColumnManagementPanel
            table={table}
            enableColumnPinning={enableColumnPinning}
            enableColumnOrdering={enableColumnOrdering}
            enableColumnResizing={enableColumnResizing}
          />

          {/* Clear filters */}
          {(activeFilterCount > 0 || globalFilter) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={handleClearAllFilters}
                >
                  <FilterX className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("clearAllFilters")}</TooltipContent>
            </Tooltip>
          )}

          {/* Density toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7" title={t("densityNormal")}>
                <Rows3 className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuCheckboxItem
                checked={density === "compact"}
                onCheckedChange={() => setDensity("compact")}
              >
                {t("densityCompact")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={density === "normal"}
                onCheckedChange={() => setDensity("normal")}
              >
                {t("densityNormal")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={density === "spacious"}
                onCheckedChange={() => setDensity("spacious")}
              >
                {t("densitySpacious")}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Fullscreen toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setIsFullscreen((prev) => !prev)}
              >
                {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isFullscreen ? t("exitFullscreen") : t("enterFullscreen")}
            </TooltipContent>
          </Tooltip>

          {/* Refresh */}
          {onRefresh && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7" onClick={onRefresh}>
                  <RefreshCw className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("reload")}</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Progress bar for refetch */}
        <div
          className={cn(
            "relative w-full overflow-hidden bg-primary/15 transition-all ease-in-out",
            stage !== "idle" ? "h-0.5" : "h-0",
            stage === "fading" || stage === "idle"
              ? "opacity-0 duration-200"
              : "opacity-100 duration-0",
          )}
        >
          <div
            className={cn(
              "h-full bg-primary transition-all ease-out",
              stage === "loading" ? "duration-[5000ms]" : "duration-300",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        {/* Selection info bar (Admin-style) */}
        {hasSelection && (
          <div
            className="mx-3 my-3 flex items-center justify-center rounded-md px-4 py-2 text-sm"
            style={{ backgroundColor: "rgb(239, 246, 254)", border: "1px solid rgb(59, 130, 246)" }}
          >
            <div className="flex flex-1 items-center justify-center gap-2">
              <span className="text-primary text-sm font-medium">
                {t("selectedRowsInfo", {
                  selected: selectedRows.length,
                  total: totalRows,
                })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground text-sm hover:text-foreground hover:bg-accent"
                onClick={clearSelection}
              >
                {t("clearSelection")}
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        <Table
          key={tableKey}
          onDragLeave={draggingColumnId ? handleTableDragLeave : undefined}
          style={{ width: table.getTotalSize(), minWidth: "100%" }}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/30 hover:bg-muted/30">
                {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: header cell rendering with pinning/resizing logic */}
                {headerGroup.headers.map((header) => {
                  const isPinned = header.column.getIsPinned();
                  const isReorderable =
                    enableColumnOrdering &&
                    header.column.id !== "select" &&
                    header.column.id !== "actions";
                  return (
                    <TableHead
                      key={header.id}
                      style={{
                        width: header.getSize() !== 150 ? header.getSize() : undefined,
                        minWidth: header.column.columnDef.minSize,
                        ...(isPinned
                          ? {
                              position: "sticky" as const,
                              left:
                                isPinned === "left" ? `${header.getStart("left")}px` : undefined,
                              right:
                                isPinned === "right"
                                  ? `${header.column.getAfter("right")}px`
                                  : undefined,
                              zIndex: 1,
                            }
                          : {}),
                      }}
                      className={cn(
                        isPinned && "sticky-cell-pinned",
                        header.column.id === draggingColumnId &&
                          "opacity-50 bg-primary/5 border-x-2 border-t-2 border-dashed border-primary",
                        header.column.id === dragOverColumnId &&
                          header.column.id !== draggingColumnId &&
                          "bg-primary/10 border-x-2 border-t-2 border-dashed border-primary",
                        (header.column.columnDef.meta as Record<string, string> | undefined)
                          ?.align === "center" && "text-center",
                        (header.column.columnDef.meta as Record<string, string> | undefined)
                          ?.align === "right" && "text-right",
                      )}
                      onDragOver={
                        isReorderable ? (e) => handleCellDragOver(e, header.column.id) : undefined
                      }
                      onDrop={
                        isReorderable ? (e) => handleCellDrop(e, header.column.id) : undefined
                      }
                    >
                      {header.isPlaceholder ? null : header.column.id === "select" ||
                        header.column.id === "actions" ? (
                        <div className="flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </div>
                      ) : (
                        <ColumnHeaderMenu
                          header={header}
                          table={table}
                          enableColumnResizing={enableColumnResizing}
                          enableColumnPinning={enableColumnPinning}
                          enableColumnOrdering={enableColumnOrdering}
                          renderColumnActionsMenuItems={renderColumnActionsMenuItems}
                          onColumnDragChange={handleColumnDragChange}
                          filterFields={filterFields}
                          activeFilters={activeFilters}
                          onAddColumnFilter={handleAddColumnFilter}
                          onClearColumnFilter={handleClearColumnFilter}
                        />
                      )}
                      {/* Column resize handle */}
                      {enableColumnResizing && header.column.getCanResize() && (
                        // biome-ignore lint/a11y/noStaticElementInteractions: resize handle uses mouse/touch events
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          onDoubleClick={() => header.column.resetSize()}
                          className={cn(
                            "absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none",
                            "hover:bg-primary/50",
                            header.column.getIsResizing() && "bg-primary",
                          )}
                        />
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows never reorder
                <TableRow key={`skeleton-${i}`}>
                  {allColumns.map((_col, j) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton cells never reorder
                    <TableCell key={`sk-${i}-${j}`} className={densityPadding}>
                      <Skeleton className="h-4 w-3/4" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={allColumns.length} className="h-24 text-center">
                  {emptyState ?? <p className="text-sm text-muted-foreground">{t("noResults")}</p>}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                  {/* biome-ignore lint/complexity/noExcessiveCognitiveComplexity: cell rendering with pinning/copy logic */}
                  {row.getVisibleCells().map((cell) => {
                    const isPinned = cell.column.getIsPinned();
                    const isCellDropTarget =
                      draggingColumnId &&
                      cell.column.id !== "select" &&
                      cell.column.id !== "actions";
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          densityPadding,
                          isPinned && "sticky-cell-pinned",
                          cell.column.id === draggingColumnId &&
                            "opacity-50 bg-primary/5 border-x-2 border-dashed border-primary",
                          cell.column.id === dragOverColumnId &&
                            cell.column.id !== draggingColumnId &&
                            "bg-primary/10 border-x-2 border-dashed border-primary",
                          (cell.column.columnDef.meta as Record<string, string> | undefined)
                            ?.align === "center" && "text-center",
                          (cell.column.columnDef.meta as Record<string, string> | undefined)
                            ?.align === "right" && "text-right",
                        )}
                        style={{
                          minWidth: cell.column.columnDef.minSize,
                          ...(isPinned
                            ? {
                                position: "sticky" as const,
                                left:
                                  isPinned === "left"
                                    ? `${cell.column.getStart("left")}px`
                                    : undefined,
                                right:
                                  isPinned === "right"
                                    ? `${cell.column.getAfter("right")}px`
                                    : undefined,
                                zIndex: 1,
                              }
                            : {}),
                        }}
                        onDragOver={
                          isCellDropTarget
                            ? (e) => handleCellDragOver(e, cell.column.id)
                            : undefined
                        }
                        onDrop={
                          isCellDropTarget ? (e) => handleCellDrop(e, cell.column.id) : undefined
                        }
                      >
                        {enableClickToCopy &&
                        cell.column.id !== "select" &&
                        cell.column.id !== "actions" ? (
                          <CopyCell value={cell.getValue()}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </CopyCell>
                        ) : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Footer — pagination */}
        <div className="flex flex-col items-center gap-2 border-t border-border px-3 py-2 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) => {
                const newPag = { pageIndex: 0, pageSize: Number(value) };
                setPagination(newPag);
                if (isServerMode) {
                  emitServerChange(newPag, sorting, globalFilter, activeFilters);
                } else {
                  table.setPageSize(Number(value));
                }
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50, 100, 500].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span>
              {t("showing")} <strong>{from}</strong> {t("to")} <strong>{to}</strong> {t("of")}{" "}
              <strong className="text-primary">{totalRows}</strong> {t("records")}
            </span>
          </div>

          {/* Page buttons — shadcnblocks pagination-advanced-3 style */}
          <Pagination
            currentPage={pagination.pageIndex + 1}
            totalPages={pageCount}
            onPageChange={(page) => {
              const newPag = { ...pagination, pageIndex: page - 1 };
              setPagination(newPag);
              if (isServerMode) emitServerChange(newPag, sorting, globalFilter, activeFilters);
              else table.setPageIndex(page - 1);
            }}
          />
        </div>
      </div>

      {/* Bulk change dialog */}
      {bulkActionConfig && (
        <BulkChangeDialog
          open={bulkDialogOpen}
          field={bulkChangeField}
          onClose={() => {
            setBulkDialogOpen(false);
            setBulkChangeField(null);
          }}
          onSubmit={handleBulkChangeSubmit}
        />
      )}
    </TooltipProvider>
  );
}
