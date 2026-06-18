"use client";

import type { BulkActionConfig, BulkChangeField } from "@admin/components/data-table/DataTable";
import { Button } from "@ecom/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ecom/ui/components/dropdown-menu";
import { ChevronDown, Trash2 } from "lucide-react";
import type { useTranslations } from "next-intl";

export function BulkActionDropdown<T>({
  config,
  selectedRows,
  clearSelection,
  onBulkChangeFieldSelect,
  t,
}: {
  config: BulkActionConfig<T>;
  selectedRows: T[];
  clearSelection: () => void;
  onBulkChangeFieldSelect: (field: BulkChangeField) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs">
          {t("bulkActions")} ({selectedRows.length})
          <ChevronDown className="ml-1 size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {config.bulkChangeFields?.map((field) => (
          <DropdownMenuItem key={field.key} onClick={() => onBulkChangeFieldSelect(field)}>
            {field.label}
          </DropdownMenuItem>
        ))}
        {config.bulkChangeFields && config.bulkChangeFields.length > 0 && config.onBulkDelete && (
          <DropdownMenuSeparator />
        )}
        {config.onBulkDelete && (
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => config.onBulkDelete?.(selectedRows, clearSelection)}
          >
            <Trash2 className="mr-2 size-4" />
            {t("bulkDelete")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
