"use client";

import { Dialog, DialogClose, DialogContent, DialogTitle } from "@ecom/ui/components/dialog";
import { Separator } from "@ecom/ui/components/separator";
import { Check, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { useMediaOptions } from "../api/hook";
import type { MediaItem } from "../model/media.model";
import { ButtonField } from "./Compat";

// ── Props ─────────────────────────────────────────────────────

export interface PropertiesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: MediaItem[];
  onSubmit: (selectedIds: string[], color: string) => void;
  loading?: boolean;
}

// ── Component ─────────────────────────────────────────────────

const PropertiesDialog = ({
  open,
  onOpenChange,
  items,
  onSubmit,
  loading = false,
}: PropertiesDialogProps): ReactNode => {
  const t = useTranslations("media");
  const tGlobal = useTranslations();
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Pre-select current folder color when dialog opens (only if all items share the same color)
  useEffect(() => {
    if (open && items.length > 0) {
      const firstColor = items[0].color ?? null;
      const allSame = items.every((item) => (item.color ?? null) === firstColor);
      setSelectedColor(allSame ? firstColor : null);
    }
  }, [open, items]);

  const { data: optionsData, isFetching: isLoadingOptions } = useMediaOptions();
  const colors = optionsData?.data?.folder_colors ?? [];

  const handleSubmit = useCallback(() => {
    if (!selectedColor) return;
    const ids = items.map((item) => item.id);
    onSubmit(ids, selectedColor);
  }, [selectedColor, items, onSubmit]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[34.375rem] p-0 overflow-hidden rounded-[0.875rem] border border-[#e5e7eb] [&>button]:hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-3">
          <DialogTitle
            className="text-[1.25rem] font-semibold"
            style={{ color: "var(--admin-text-color)" }}
          >
            {t("properties")}
          </DialogTitle>
          <DialogClose asChild>
            <ButtonField
              variant="ghost"
              size="icon"
              className="absolute right-6 top-4 rounded-md p-1 text-[#9ca3af] hover:bg-muted cursor-pointer h-auto w-auto"
              aria-label="Close"
              style={{ color: "var(--admin-text-color)" }}
            >
              <X className="size-4" />
            </ButtonField>
          </DialogClose>
        </div>

        <Separator />

        {/* Body */}
        <div className="px-6 pt-4 pb-6 flex flex-col gap-4">
          <span className="text-[0.875rem]" style={{ color: "var(--admin-text-color)" }}>
            {t("chooseColor")}
          </span>

          {isLoadingOptions ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => {
                const isActive = selectedColor === color;
                return (
                  <ButtonField
                    key={color}
                    variant="ghost"
                    onClick={() => setSelectedColor(isActive ? null : color)}
                    containerClassName="contents"
                    className="relative size-8 rounded-[0.375rem] cursor-pointer transition-transform hover:scale-110 focus:outline-none !p-0 !h-auto !w-auto"
                    style={{ backgroundColor: color }}
                    aria-label={`Color ${color}`}
                  >
                    {isActive ? (
                      <Check className="absolute inset-0 m-auto size-4 text-white drop-shadow-md" />
                    ) : null}
                  </ButtonField>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-3 border-t border-[#e5e7eb]">
          <DialogClose asChild>
            <ButtonField
              variant="outline"
              className="h-[2.5rem] px-6 rounded-[0.625rem] cursor-pointer"
              style={{ color: "var(--admin-text-color)" }}
            >
              {tGlobal("common.close")}
            </ButtonField>
          </DialogClose>
          <ButtonField
            onClick={handleSubmit}
            disabled={!selectedColor || loading}
            className="h-[2.5rem] px-6 rounded-[0.625rem] text-white cursor-pointer"
            style={
              !selectedColor || loading
                ? undefined
                : { backgroundColor: "var(--admin-primary-color)" }
            }
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : tGlobal("common.save")}
          </ButtonField>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PropertiesDialog;
