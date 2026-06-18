"use client";

import { SortIcon } from "@admin/components/data-table/SortIcon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@ecom/ui/components/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@ecom/ui/components/tooltip";
import { cn } from "@ecom/ui/lib/utils";
import type { Column, Header, Table as TanStackTable } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import {
  ArrowDownUp,
  EllipsisVertical,
  EyeOff,
  Filter,
  GripVertical,
  ListFilter,
  Pin,
  RotateCcw,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { getDefaultOperators, OPERATOR_GROUP_ENDS, OPERATOR_ICONS } from "./filter-operators";
import { BrushCleaningIcon, Columns3CogIcon } from "./icons";
import type { ActiveFilter, FilterFieldDef } from "./types";

export function ColumnHeaderMenu<T>({
  header,
  table,
  enableColumnResizing = true,
  enableColumnPinning = false,
  enableColumnOrdering = false,
  renderColumnActionsMenuItems,
  onColumnDragChange,
  filterFields,
  activeFilters,
  onAddColumnFilter,
  onClearColumnFilter,
}: {
  header: Header<T, unknown>;
  table: TanStackTable<T>;
  enableColumnResizing?: boolean;
  enableColumnPinning?: boolean;
  enableColumnOrdering?: boolean;
  renderColumnActionsMenuItems?: (params: {
    column: Column<T, unknown>;
    table: TanStackTable<T>;
  }) => ReactNode;
  onColumnDragChange?: (state: { draggingId: string | null; dragOverId: string | null }) => void;
  filterFields?: FilterFieldDef[];
  activeFilters?: ActiveFilter[];
  onAddColumnFilter?: (fieldKey: string, operator: string) => void;
  onClearColumnFilter?: (fieldKey: string) => void;
}) {
  const column = header.column;
  const canSort = column.getCanSort();
  const canHide = column.getCanHide();
  const sorted = column.getIsSorted();
  const isPinned = column.getIsPinned();
  const t = useTranslations("dataTable");
  const columnName =
    typeof column.columnDef.header === "string" ? column.columnDef.header : column.id;

  const allColumnsVisible = table
    .getAllColumns()
    .filter((col) => col.getCanHide())
    .every((col) => col.getIsVisible());

  // Find matching filter field for this column
  const columnFilterField = filterFields?.find((f) => f.key === column.id);
  const hasActiveFilter = activeFilters?.some(
    (f) => f.fieldKey === column.id && f.value.trim() !== "",
  );

  // Column drag-and-drop for reordering (only start/end — drop is on DataTable cells)
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      if (!enableColumnOrdering) return;
      setIsDragging(true);
      e.dataTransfer.setData("text/plain", column.id);
      e.dataTransfer.effectAllowed = "move";
      onColumnDragChange?.({ draggingId: column.id, dragOverId: null });
    },
    [enableColumnOrdering, column.id, onColumnDragChange],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    onColumnDragChange?.({ draggingId: null, dragOverId: null });
  }, [onColumnDragChange]);

  return (
    <div className={cn("flex items-center gap-1 w-full", isDragging && "opacity-50")}>
      {/* Column name + sort indicator (clickable to sort) */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: TanStack Table pattern for sort toggle */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: keyboard sort handled via TanStack's getToggleSortingHandler */}
      <span
        className={cn(
          "flex items-center gap-1 min-w-0 truncate",
          canSort && "cursor-pointer select-none hover:text-foreground",
        )}
        onClick={canSort ? column.getToggleSortingHandler() : undefined}
      >
        {flexRender(column.columnDef.header, header.getContext())}
        {canSort && (
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded hover:bg-muted text-muted-foreground">
            <SortIcon direction={sorted} />
          </span>
        )}
      </span>

      {/* Drag handle — only visible when column ordering is enabled */}
      {enableColumnOrdering && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex size-7 shrink-0 items-center justify-center rounded opacity-50 hover:opacity-100 hover:bg-muted text-muted-foreground cursor-grab active:cursor-grabbing"
              tabIndex={-1}
              draggable
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <GripVertical className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{t("dragColumn")}</TooltipContent>
        </Tooltip>
      )}

      {/* Column actions menu trigger */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded opacity-30 transition-opacity hover:opacity-100 hover:bg-muted text-muted-foreground"
          >
            <EllipsisVertical className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {/* ── 1. Sort section (matches app order) ─────────────────────── */}
          {canSort && (
            <>
              <DropdownMenuItem disabled={!sorted} onClick={() => column.clearSorting()}>
                <BrushCleaningIcon className="mr-2 size-4 text-muted-foreground" />
                {t("clearSort")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
                <ArrowDownUp className="mr-2 size-4 -scale-x-100 rotate-180 text-muted-foreground" />
                {t("sortAscBy", { column: columnName })}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
                <ArrowDownUp className="mr-2 size-4 text-muted-foreground" />
                {t("sortDescBy", { column: columnName })}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* ── 2. Filter section ────────────────────────────────────────── */}
          {columnFilterField && (
            <>
              <DropdownMenuItem
                disabled={!hasActiveFilter}
                onClick={() => onClearColumnFilter?.(column.id)}
              >
                <Filter className="mr-2 size-4 text-muted-foreground" />
                {t("clearFilter")}
              </DropdownMenuItem>
              {(() => {
                const ops =
                  columnFilterField.operators ?? getDefaultOperators(columnFilterField.type);
                return ops.length > 0 ? (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <ListFilter className="mr-2 size-4 text-muted-foreground" />
                      {t("filterByColumn", { column: columnName })}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {ops.map((op) => (
                        <div key={op.value}>
                          <DropdownMenuItem
                            onClick={() => onAddColumnFilter?.(column.id, op.value)}
                          >
                            {OPERATOR_ICONS[op.value] && (
                              <span className="mr-2 inline-block w-4 text-center font-mono text-xs text-muted-foreground">
                                {OPERATOR_ICONS[op.value]}
                              </span>
                            )}
                            {t(`filter.operators.${op.value}` as Parameters<typeof t>[0])}
                          </DropdownMenuItem>
                          {OPERATOR_GROUP_ENDS.has(op.value) && <DropdownMenuSeparator />}
                        </div>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ) : null;
              })()}
              <DropdownMenuSeparator />
            </>
          )}

          {/* ── 3. Column pinning section ────────────────────────────────── */}
          {enableColumnPinning && (
            <>
              <DropdownMenuItem disabled={isPinned === "left"} onClick={() => column.pin("left")}>
                <Pin className="mr-2 size-4 rotate-90 text-muted-foreground" />
                {t("pinColumnLeft")}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={isPinned === "right"} onClick={() => column.pin("right")}>
                <Pin className="mr-2 size-4 -rotate-90 text-muted-foreground" />
                {t("pinColumnRight")}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={!isPinned} onClick={() => column.pin(false)}>
                <Pin className="mr-2 size-4 text-muted-foreground" />
                {t("unpinColumn")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* ── 4. Reset column size ─────────────────────────────────────── */}
          {enableColumnResizing && (
            <DropdownMenuItem
              disabled={column.getSize() === (column.columnDef.size ?? 150)}
              onClick={() => column.resetSize()}
            >
              <RotateCcw className="mr-2 size-4 text-muted-foreground" />
              {t("resetColumnSize")}
            </DropdownMenuItem>
          )}

          {/* ── 5. Visibility section ────────────────────────────────────── */}
          {canHide && (
            <>
              <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                <EyeOff className="mr-2 size-4 text-muted-foreground" />
                {t("hideColumnName", { column: columnName })}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={allColumnsVisible}
                onClick={() => {
                  table.getAllColumns().forEach((col) => {
                    if (col.getCanHide()) col.toggleVisibility(true);
                  });
                }}
              >
                <Columns3CogIcon className="mr-2 size-4 text-muted-foreground" />
                {t("showAllColumns")}
              </DropdownMenuItem>
            </>
          )}

          {/* ── 6. Custom items from consumer ────────────────────────────── */}
          {renderColumnActionsMenuItems && (
            <>
              <DropdownMenuSeparator />
              {renderColumnActionsMenuItems({ column, table })}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
