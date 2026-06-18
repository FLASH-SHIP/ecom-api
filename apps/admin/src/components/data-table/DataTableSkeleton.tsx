"use client";

import { Skeleton } from "@ecom/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ecom/ui/components/table";

interface DataTableSkeletonProps {
  columnCount?: number;
  rowCount?: number;
  hasCheckbox?: boolean;
  hasActions?: boolean;
}

export function DataTableSkeleton({
  columnCount = 4,
  rowCount = 5,
  hasCheckbox = true,
  hasActions = true,
}: DataTableSkeletonProps) {
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Skeleton className="h-8 w-48" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="size-8" />
      </div>

      {/* Table skeleton */}
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            {hasCheckbox && (
              <TableHead style={{ width: 40 }}>
                <Skeleton className="size-4" />
              </TableHead>
            )}
            {Array.from({ length: columnCount }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton headers never reorder
              <TableHead key={`h-${i}`}>
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
            {hasActions && (
              <TableHead style={{ width: 60 }}>
                <Skeleton className="h-4 w-12" />
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rowCount }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows never reorder
            <TableRow key={`r-${i}`}>
              {hasCheckbox && (
                <TableCell>
                  <Skeleton className="size-4" />
                </TableCell>
              )}
              {Array.from({ length: columnCount }).map((_, j) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton cells never reorder
                <TableCell key={`c-${i}-${j}`}>
                  <Skeleton className="h-4 w-3/4" />
                </TableCell>
              ))}
              {hasActions && (
                <TableCell>
                  <Skeleton className="h-4 w-8" />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Footer skeleton */}
      <div className="flex items-center justify-between border-t border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-[70px]" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex items-center gap-1">
          <Skeleton className="size-8" />
          <Skeleton className="size-8" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="size-8" />
          <Skeleton className="size-8" />
        </div>
      </div>
    </div>
  );
}
