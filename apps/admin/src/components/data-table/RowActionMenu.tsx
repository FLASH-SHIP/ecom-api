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

function getActionColorClass(color: RowAction<unknown>["color"]): string {
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
          className="size-8 opacity-60 transition-opacity hover:opacity-100"
        >
          <EllipsisVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {visibleActions.map((action) => (
          <DropdownMenuItem
            key={action.key}
            disabled={action.disabled?.(row)}
            onClick={() => action.onClick(row)}
            className={getActionColorClass(action.color)}
          >
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.tooltip}
          </DropdownMenuItem>
        ))}
        {visibleActions.length > 0 && renderCustomItems && <DropdownMenuSeparator />}
        {renderCustomItems?.()}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
