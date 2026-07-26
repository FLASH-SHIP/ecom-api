"use client";

import { Button } from "@ecom/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ecom/ui/components/dropdown-menu";
import { EllipsisVertical } from "lucide-react";
import type { ReactNode } from "react";
import type { RowAction } from "./types";

function getActionColorClass(color?: string | null): string {
  if (color === "error") return "text-destructive";
  if (color === "warning") return "text-amber-600";
  if (color === "success") return "text-emerald-600";
  if (color === "primary") return "text-primary";
  return "";
}

export function RowActionMenu<T>({
  row,
  actions,
  renderCustomItems,
}: {
  row: T;
  actions?: RowAction<T>[];
  renderCustomItems?: () => ReactNode;
}) {
  const visibleActions = actions?.filter((a) => !a.hidden?.(row)) ?? [];
  const hasContent = visibleActions.length > 0 || !!renderCustomItems;
  if (!hasContent) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 cursor-pointer opacity-60 transition-opacity hover:opacity-100"
        >
          <EllipsisVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {visibleActions.map((action) => {
          const actionIcon =
            typeof action.icon === "function"
              ? (action.icon as (r: T) => ReactNode)(row)
              : action.icon;
          const rawColor = action.color;
          const actionColor =
            typeof rawColor === "function"
              ? (rawColor as (r: T) => string)(row)
              : (rawColor as string | undefined);

          return (
            <DropdownMenuItem
              key={action.key}
              disabled={action.disabled?.(row)}
              onClick={() => action.onClick(row)}
              className={getActionColorClass(actionColor)}
            >
              {actionIcon && <span className="mr-2">{actionIcon}</span>}
              {typeof action.tooltip === "function"
                ? (action.tooltip as (row: T) => string)(row)
                : action.tooltip}
            </DropdownMenuItem>
          );
        })}
        {visibleActions.length > 0 && renderCustomItems && <DropdownMenuSeparator />}
        {renderCustomItems?.()}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
