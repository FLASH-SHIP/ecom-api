"use client";

import { cn } from "@ecom/ui/lib/utils";
import { PackageOpen } from "lucide-react";
import * as React from "react";
import { Checkbox } from "./checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

export interface Column<T> {
  header: React.ReactNode;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
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
}: TableBaseProps<T>) {
  const selectableData = React.useMemo(() => data.filter((item) => item.id !== undefined), [data]);

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

  const colSpanCount = enableRowSelection ? columns.length + 1 : columns.length;

  return (
    <div className={cn("overflow-x-auto w-full", className)}>
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent border-b border-border">
            {enableRowSelection && (
              <TableHead className="w-12 px-4 text-center align-middle h-11">
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={isAllSelected ? true : isSomeSelected ? "indeterminate" : false}
                    onCheckedChange={handleSelectAllToggle}
                    aria-label="Select all rows"
                  />
                </div>
              </TableHead>
            )}
            {columns.map((col, idx) => (
              <TableHead
                // biome-ignore lint/suspicious/noArrayIndexKey: column headers are static
                key={idx}
                className={cn(
                  "font-bold text-foreground h-11 text-sm whitespace-nowrap align-middle",
                  col.headerClassName,
                )}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow className="hover:bg-transparent border-none">
              <TableCell colSpan={colSpanCount} className="text-center py-16 text-muted-foreground">
                <div className="flex flex-col items-center justify-center gap-2">
                  <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#0F798C] border-t-transparent" />
                  <span className="text-sm font-medium">Loading data...</span>
                </div>
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow className="hover:bg-transparent border-none">
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
            data.map((item) => (
              <TableRow
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  "border-b border-border transition-colors duration-150 hover:bg-muted/20",
                  onRowClick && "cursor-pointer",
                )}
              >
                {enableRowSelection && (
                  <TableCell
                    className="w-12 px-4 text-center align-middle"
                    onClick={(e) => e.stopPropagation()} // Prevent row click details modal
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
                {columns.map((col, colIdx) => {
                  const content = col.cell
                    ? col.cell(item)
                    : col.accessorKey
                      ? (item[col.accessorKey] as React.ReactNode)
                      : null;

                  return (
                    <TableCell
                      // biome-ignore lint/suspicious/noArrayIndexKey: row cells are stable within structured column definitions
                      key={colIdx}
                      className={cn(
                        "py-3.5 px-4 text-sm font-medium text-foreground align-middle",
                        col.className,
                      )}
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
