"use client";

import type { BulkChangeField } from "@admin/components/data-table/DataTable";
import { DATE_DISPLAY_PLACEHOLDER, formatDateForApi } from "@admin/utils/dateFormat";
import { Button } from "@ecom/ui/components/button";
import { DatePicker } from "@ecom/ui/components/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ecom/ui/components/dialog";
import { Input } from "@ecom/ui/components/input";
import { SearchableSelect } from "@ecom/ui/components/searchable-select";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface BulkChangeDialogProps {
  open: boolean;
  field: BulkChangeField | null;
  onClose: () => void;
  onSubmit: (fieldKey: string, value: string) => void;
}

export function BulkChangeDialog({ open, field, onClose, onSubmit }: BulkChangeDialogProps) {
  const t = useTranslations("dataTable");
  const [value, setValue] = useState("");
  const [dateValue, setDateValue] = useState("");

  const handleClose = () => {
    setValue("");
    setDateValue("");
    onClose();
  };

  const handleSubmit = () => {
    if (!field) return;

    let submitValue = value;
    if (field.type === "date" && dateValue) {
      const parsed = new Date(dateValue);
      submitValue = Number.isNaN(parsed.getTime()) ? dateValue : formatDateForApi(parsed);
    }

    if (submitValue.trim()) {
      onSubmit(field.key, submitValue);
      handleClose();
    }
  };

  if (!field) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("bulkChangeTitle")}</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          {field.type === "text" && (
            <Input
              autoFocus
              placeholder={t("bulkChangeValue")}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />
          )}

          {field.type === "select" && (
            <SearchableSelect
              value={value}
              onValueChange={setValue}
              options={field.options ?? []}
              placeholder={t("bulkChangeSelect")}
            />
          )}

          {field.type === "date" && (
            <DatePicker
              value={dateValue}
              onChange={(val) => setDateValue(val)}
              placeholder={DATE_DISPLAY_PLACEHOLDER}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose}>
            {t("bulkChangeCancel")}
          </Button>
          <Button size="sm" onClick={handleSubmit}>
            {t("bulkChangeSave")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
