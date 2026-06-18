"use client";

/**
 * ColumnManagementPanel — Admin-style column management popover.
 *
 * Re-implements MRT's MRT_ShowHideColumnsMenu + MRT_ShowHideColumnsMenuItems
 * using shadcn/Radix primitives (Popover, Switch, Button, Tooltip).
 *
 * Features:
 *  - Header actions: Hide all, Reset order, Unpin all, Show all
 *  - Per-column: drag handle (reorder), pin buttons (left/right/unpin), visibility switch
 *  - Column list ordered: left-pinned → center (by columnOrder) → right-pinned
 *  - Drag-and-drop reorder within the panel
 */

import { Columns3CogIcon } from "@admin/components/data-table/icons";
import { Button } from "@ecom/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@ecom/ui/components/popover";
import { Switch } from "@ecom/ui/components/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@ecom/ui/components/tooltip";
import { cn } from "@ecom/ui/lib/utils";
import type { Column, ColumnOrderState, Table as TanStackTable } from "@tanstack/react-table";
import { GripVertical, Pin } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DragEvent } from "react";
import { useCallback, useMemo, useRef, useState } from "react";

interface ColumnManagementPanelProps<T> {
  table: TanStackTable<T>;
  enableColumnPinning?: boolean;
  enableColumnOrdering?: boolean;
  enableColumnResizing?: boolean;
}

export function ColumnManagementPanel<T>({
  table,
  enableColumnPinning = false,
  enableColumnOrdering = false,
}: ColumnManagementPanelProps<T>) {
  const t = useTranslations("dataTable");

  // ── Derived state ─────────────────────────────────────────────────────────
  const allColumns = table.getAllLeafColumns();
  const columnOrder = table.getState().columnOrder;
  const _columnPinning = table.getState().columnPinning;

  const orderedColumns = useMemo(() => {
    const leftPinned = allColumns.filter((c) => c.getIsPinned() === "left");
    const rightPinned = allColumns.filter((c) => c.getIsPinned() === "right");
    const center =
      columnOrder.length > 0
        ? columnOrder
            .map((id) => allColumns.find((c) => c.id === id))
            .filter(
              (c): c is Column<T, unknown> =>
                !!c && c.getIsPinned() !== "left" && c.getIsPinned() !== "right",
            )
        : allColumns.filter((c) => !c.getIsPinned());
    return [...leftPinned, ...center, ...rightPinned];
  }, [allColumns, columnOrder]);

  const isAllVisible = allColumns.filter((c) => c.getCanHide()).every((c) => c.getIsVisible());
  const isSomeVisible = allColumns.filter((c) => c.getCanHide()).some((c) => c.getIsVisible());
  const isSomePinned = allColumns.some((c) => c.getIsPinned());

  // Track initial column order for "Reset order"
  const initialOrderRef = useRef<ColumnOrderState | null>(null);
  if (initialOrderRef.current === null && columnOrder.length > 0) {
    initialOrderRef.current = [...columnOrder];
  }

  const hasOrderChanged = useMemo(() => {
    if (!initialOrderRef.current || columnOrder.length === 0) return false;
    if (initialOrderRef.current.length !== columnOrder.length) return true;
    return !initialOrderRef.current.every((id, i) => id === columnOrder[i]);
  }, [columnOrder]);

  // ── Header actions ────────────────────────────────────────────────────────
  const handleHideAll = useCallback(() => {
    for (const col of allColumns) {
      if (col.getCanHide()) col.toggleVisibility(false);
    }
  }, [allColumns]);

  const handleShowAll = useCallback(() => {
    for (const col of allColumns) {
      if (col.getCanHide()) col.toggleVisibility(true);
    }
  }, [allColumns]);

  const handleResetOrder = useCallback(() => {
    if (initialOrderRef.current) {
      table.setColumnOrder([...initialOrderRef.current]);
    }
  }, [table]);

  const handleUnpinAll = useCallback(() => {
    table.resetColumnPinning(true);
  }, [table]);

  // ── Drag-and-drop state ───────────────────────────────────────────────────
  const [hoveredColumnId, setHoveredColumnId] = useState<string | null>(null);
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);

  const handleDragStart = useCallback((e: DragEvent<HTMLButtonElement>, columnId: string) => {
    setDraggingColumnId(columnId);
    e.dataTransfer.setData("text/plain", columnId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragEnter = useCallback(
    (columnId: string) => {
      if (draggingColumnId && columnId !== draggingColumnId) {
        setHoveredColumnId(columnId);
      }
    },
    [draggingColumnId],
  );

  const handleDragEnd = useCallback(() => {
    if (draggingColumnId && hoveredColumnId) {
      const newOrder = [...columnOrder];
      const fromIdx = newOrder.indexOf(draggingColumnId);
      const toIdx = newOrder.indexOf(hoveredColumnId);
      if (fromIdx !== -1 && toIdx !== -1) {
        newOrder.splice(fromIdx, 1);
        newOrder.splice(toIdx, 0, draggingColumnId);
        table.setColumnOrder(newOrder);
      }
    }
    setDraggingColumnId(null);
    setHoveredColumnId(null);
  }, [draggingColumnId, hoveredColumnId, columnOrder, table]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7">
              <Columns3CogIcon className="size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("columns")}</TooltipContent>
      </Tooltip>

      <PopoverContent align="end" className="w-auto min-w-[280px] max-w-[420px] p-0">
        {/* Header action buttons — matches the app's flex row with even spacing */}
        <div className="flex items-center justify-between border-b border-border px-2 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs font-medium"
            disabled={!isSomeVisible}
            onClick={handleHideAll}
          >
            {t("columnPanel.hideAll")}
          </Button>
          {enableColumnOrdering && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs font-medium"
              disabled={!hasOrderChanged}
              onClick={handleResetOrder}
            >
              {t("columnPanel.resetOrder")}
            </Button>
          )}
          {enableColumnPinning && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs font-medium"
              disabled={!isSomePinned}
              onClick={handleUnpinAll}
            >
              {t("columnPanel.unpinAll")}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs font-medium"
            disabled={isAllVisible}
            onClick={handleShowAll}
          >
            {t("columnPanel.showAll")}
          </Button>
        </div>

        {/* Column list */}
        <div className="max-h-[400px] overflow-y-auto py-1">
          {orderedColumns.map((column) => (
            <ColumnManagementRow
              key={column.id}
              column={column}
              enableColumnOrdering={enableColumnOrdering}
              enableColumnPinning={enableColumnPinning}
              isDragging={draggingColumnId === column.id}
              isHovered={hoveredColumnId === column.id}
              onDragStart={handleDragStart}
              onDragEnter={handleDragEnter}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Column Row ────────────────────────────────────────────────────────────────

interface ColumnManagementRowProps<T> {
  column: Column<T, unknown>;
  enableColumnOrdering: boolean;
  enableColumnPinning: boolean;
  isDragging: boolean;
  isHovered: boolean;
  onDragStart: (e: DragEvent<HTMLButtonElement>, columnId: string) => void;
  onDragEnter: (columnId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: DragEvent) => void;
}

function ColumnManagementRow<T>({
  column,
  enableColumnOrdering,
  enableColumnPinning,
  isDragging,
  isHovered,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDragOver,
}: ColumnManagementRowProps<T>) {
  const t = useTranslations("dataTable");
  const isPinned = column.getIsPinned();
  const canPin = column.getCanPin();
  const canHide = column.getCanHide();
  const isVisible = column.getIsVisible();
  const displayColumnKeys: Record<string, string> = { select: "select", actions: "actions" };
  const rawColumnName =
    typeof column.columnDef.header === "string" ? column.columnDef.header : column.id;
  const columnName = displayColumnKeys[column.id]
    ? t(displayColumnKeys[column.id] as "select" | "actions")
    : rawColumnName.charAt(0).toUpperCase() + rawColumnName.slice(1);

  const switchId = `col-switch-${column.id}`;
  const menuItemRef = useRef<HTMLDivElement>(null);

  // Display columns (select, actions) can't be reordered — they have enableHiding: false
  const canOrder = canHide;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: DnD drop zone requires drag event handlers on container
    <div
      ref={menuItemRef}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 transition-colors hover:bg-accent",
        isDragging && "rounded-md border-2 border-dashed border-primary/50 bg-primary/5",
        isHovered && "rounded-md border-2 border-dashed border-primary bg-primary/5",
      )}
      onDragEnter={() => onDragEnter(column.id)}
      onDragOver={onDragOver}
    >
      {/* Drag handle — tooltip "Move" on hover, dashed border on source row */}
      {enableColumnOrdering &&
        (canOrder ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded opacity-50 transition-all hover:opacity-100 hover:bg-accent active:cursor-grabbing",
                  isDragging && "opacity-100",
                )}
                tabIndex={-1}
                draggable
                onDragStart={(e) => {
                  if (isPinned) column.pin(false);
                  onDragStart(e, column.id);
                }}
                onDragEnd={onDragEnd}
              >
                <GripVertical className="size-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Move</TooltipContent>
          </Tooltip>
        ) : (
          <div className="w-7 shrink-0" />
        ))}

      {/* Pin buttons — matches MRT_ColumnPinningButtons: 2 icons when unpinned, 1 when pinned, min-width 70px */}
      {enableColumnPinning && (
        <div className="flex shrink-0 items-center justify-center" style={{ minWidth: 70 }}>
          {canPin ? (
            isPinned ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex size-7 items-center justify-center rounded text-primary hover:bg-accent transition-colors"
                    onClick={() => column.pin(false)}
                  >
                    <Pin className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">{t("unpinColumn")}</TooltipContent>
              </Tooltip>
            ) : (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      onClick={() => column.pin("left")}
                    >
                      <Pin className="size-4 rotate-90" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{t("pinColumnLeft")}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      onClick={() => column.pin("right")}
                    >
                      <Pin className="size-4 -rotate-90" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{t("pinColumnRight")}</TooltipContent>
                </Tooltip>
              </>
            )
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex size-7 items-center justify-center rounded text-muted-foreground/40 cursor-default"
                  disabled
                >
                  <Pin className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">{t("unpinColumn")}</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {/* Switch + Label — matches MRT FormControlLabel + Switch */}
      <label
        htmlFor={switchId}
        className={cn(
          "flex flex-1 cursor-pointer items-center gap-2.5",
          !canHide && "cursor-default opacity-50",
        )}
      >
        <Switch
          id={switchId}
          checked={isVisible}
          onCheckedChange={(checked) => column.toggleVisibility(!!checked)}
          disabled={!canHide}
        />
        <span className="min-w-0 truncate text-sm select-none">{columnName}</span>
      </label>
    </div>
  );
}
