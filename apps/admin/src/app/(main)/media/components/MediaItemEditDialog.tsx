"use client";

import { Checkbox } from "@ecom/ui/components/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@ecom/ui/components/dialog";
import { Folder, Loader2 } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import type { MediaItem } from "../model/media.model";
import { MediaItemType } from "../model/media.model";
import { ButtonField, InputField } from "./Compat";

// ── Helper: lấy label ngắn cho file type (PNG, MP3, PDF, ...) ───
export const getFileTypeLabel = (item: MediaItem): string => {
  if (item.type === MediaItemType.FOLDER) return "";
  const ext = item.basename?.split(".").pop()?.toUpperCase();
  if (ext) return ext;
  if (!item.mime_type) return "FILE";
  const m = item.mime_type.toLowerCase();
  if (m.startsWith("image/")) return m.split("/")[1]?.toUpperCase() || "IMG";
  if (m.startsWith("video/")) return "VIDEO";
  if (m.startsWith("audio/")) return "MP3";
  if (m === "application/pdf") return "PDF";
  if (m.includes("word")) return "DOC";
  if (m.includes("sheet") || m.includes("excel")) return "XLS";
  if (m.includes("presentation") || m.includes("powerpoint")) return "PPT";
  if (m.includes("zip") || m.includes("rar")) return "ZIP";
  if (m === "text/csv") return "CSV";
  if (m.startsWith("text/")) return "TXT";
  return "FILE";
};

// ── Config cho từng mode ───────────────────────────────────────
export interface MediaItemEditField {
  /** Key dùng để lưu state — mỗi item một giá trị */
  key: string;
  /** Placeholder input */
  placeholder?: string;
  /** Lấy giá trị ban đầu từ item */
  getInitialValue: (item: MediaItem) => string;
}

export interface MediaItemEditCheckbox {
  /** Key dùng để lưu state */
  key: string;
  /** Label hiện bên checkbox — nhận item để hiện text tuỳ folder/file */
  getLabel: (item: MediaItem) => string;
}

export interface MediaItemEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: MediaItem[];
  /** Dialog title */
  title: string;
  /** Field input config */
  field: MediaItemEditField;
  /** Optional checkbox config (e.g. rename physical file) */
  checkbox?: MediaItemEditCheckbox;
  /** Called with map of item._uid → { fieldValue, checkboxValue } khi submit */
  onSubmit: (data: Record<string, { value: string; checked: boolean }>, items: MediaItem[]) => void;
  /** Loading state */
  loading?: boolean;
}

const MediaItemEditDialog = ({
  open,
  onOpenChange,
  items,
  title,
  field,
  checkbox,
  onSubmit,
  loading = false,
}: MediaItemEditDialogProps): ReactNode => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  // Reset khi dialog mở hoặc items thay đổi
  useEffect(() => {
    if (open && items.length > 0) {
      const initValues: Record<string, string> = {};
      const initChecks: Record<string, boolean> = {};
      items.forEach((item) => {
        initValues[item._uid] = field.getInitialValue(item);
        initChecks[item._uid] = false;
      });
      setValues(initValues);
      setChecks(initChecks);
    }
  }, [open, items, field]);

  const handleValueChange = useCallback((uid: string, v: string) => {
    setValues((prev) => ({ ...prev, [uid]: v }));
  }, []);

  const handleSubmit = useCallback(() => {
    const data: Record<string, { value: string; checked: boolean }> = {};
    items.forEach((item) => {
      data[item._uid] = {
        value: values[item._uid]?.trim() ?? "",
        checked: checks[item._uid] ?? false,
      };
    });
    onSubmit(data, items);
  }, [items, values, checks, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !loading) {
        handleSubmit();
      }
    },
    [handleSubmit, loading],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[35rem]">
        <DialogHeader>
          <DialogTitle style={{ color: "var(--admin-text-color)" }}>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 pt-2 max-h-[25rem] overflow-y-auto">
          {items.map((item) => {
            const isFolder = item.type === MediaItemType.FOLDER;
            const label = getFileTypeLabel(item);

            return (
              <div key={item._uid}>
                {/* Input with file type icon */}
                <div className="flex items-center border border-[#e5e7eb] rounded-lg overflow-hidden">
                  <div className="flex items-center justify-center px-3 min-w-[3.25rem] h-[2.75rem] bg-[#f9fafb] border-r border-[#e5e7eb]">
                    {isFolder ? (
                      <Folder className="size-5 text-[#6b7280]" />
                    ) : (
                      <span className="text-xs font-semibold text-[#6b7280] uppercase">
                        {label}
                      </span>
                    )}
                  </div>
                  <InputField
                    containerClassName="flex-1"
                    className="border-0 shadow-none h-[2.75rem] focus-visible:ring-0"
                    placeholder={field.placeholder}
                    value={values[item._uid] || ""}
                    onValueChange={(v) => handleValueChange(item._uid, v)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    autoFocus={items.length === 1}
                  />
                </div>

                {/* `rendering-conditional-render` — ternary */}
                {checkbox ? (
                  <label
                    className="flex items-center gap-2 mt-2 cursor-pointer text-[0.875rem]"
                    style={{ color: "var(--admin-secondary-color)" }}
                  >
                    <Checkbox
                      checked={checks[item._uid] ?? false}
                      onCheckedChange={(v) =>
                        setChecks((prev) => ({ ...prev, [item._uid]: Boolean(v) }))
                      }
                      disabled={loading}
                    />
                    {checkbox.getLabel(item)}
                  </label>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#e5e7eb]">
          <ButtonField
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-[2.5rem] min-w-[6.25rem] rounded-[0.5rem] border border-[#e5e7eb] bg-white hover:bg-[#f9fafb] cursor-pointer"
            style={{ color: "var(--admin-text-color)" }}
          >
            Close
          </ButtonField>
          <ButtonField
            onClick={handleSubmit}
            disabled={loading}
            className="h-[2.5rem] min-w-[7.5rem] rounded-[0.5rem] text-white cursor-pointer"
            style={loading ? undefined : { backgroundColor: "var(--admin-primary-color)" }}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Save changes"}
          </ButtonField>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MediaItemEditDialog;
