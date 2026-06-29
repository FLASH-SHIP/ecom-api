"use client";

import { Button } from "@ecom/ui/components/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@ecom/ui/components/dialog";
import { AlertTriangle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type React from "react";

type ConfirmDeleteModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
  title?: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
};

export default function ConfirmDeleteModal({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  title,
  description,
  confirmLabel,
  cancelLabel,
}: ConfirmDeleteModalProps) {
  const t = useTranslations();
  const _title = title ?? t("common.confirmDelete");
  const _description = description ?? t("common.confirmDeleteDesc");
  const _confirmLabel = confirmLabel ?? t("common.delete");
  const _cancelLabel = cancelLabel ?? t("common.cancel");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[35rem] p-0 overflow-hidden rounded-[0.875rem] border border-border border-t-[0.1875rem] border-t-destructive [&>button]:hidden bg-background">
        <div className="relative px-8 pt-10 text-center">
          <DialogTitle className="sr-only">{_title}</DialogTitle>
          <DialogClose asChild>
            <button
              type="button"
              className="absolute right-4 top-4 bg-transparent rounded-md p-1 hover:bg-muted cursor-pointer text-muted-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
          <div className="w-full flex justify-center items-center">
            <AlertTriangle className="size-16 text-destructive animate-pulse" />
          </div>
          <div className="mt-4 text-[1.375rem] font-semibold text-foreground">{_title}</div>
          <div className="mt-2 text-[1rem] text-muted-foreground">{_description}</div>
        </div>
        <div className="border-t border-border px-8 py-6 bg-muted/20">
          <div className="flex gap-4">
            <Button
              className="flex-1 h-[2.75rem] rounded-[0.625rem] bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer font-medium"
              onClick={onConfirm}
              disabled={loading}
            >
              {_confirmLabel}
            </Button>
            <DialogClose asChild>
              <Button
                className="flex-1 h-[2.75rem] rounded-[0.625rem] border border-input bg-background hover:bg-muted text-foreground cursor-pointer font-medium"
                type="button"
              >
                {_cancelLabel}
              </Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
