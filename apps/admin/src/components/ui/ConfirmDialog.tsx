"use client";

import { Button } from "@ecom/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ecom/ui/components/dialog";
import { cn } from "@ecom/ui/lib/utils";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: "error" | "primary" | "warning";
  onConfirm: () => void;
  onCancel: () => void;
}

const colorMap = {
  error: {
    border: "border-t-destructive",
    icon: "text-destructive",
    button: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
  primary: {
    border: "border-t-primary",
    icon: "text-primary",
    button: "bg-primary text-primary-foreground hover:bg-primary/90",
  },
  warning: {
    border: "border-t-amber-500",
    icon: "text-amber-500",
    button: "bg-amber-500 text-white hover:bg-amber-600",
  },
};

/**
 * Confirmation dialog styled after Botble CMS:
 * - Colored top accent border
 * - Centered warning triangle icon
 * - Bold centered title
 * - Muted centered message
 * - Two equal-width action buttons (confirm left, cancel right)
 *
 * Replaces `window.confirm()` which is unreliable in Next.js apps:
 * Chrome may silently block it (return false) when called outside a trusted
 * user-gesture context (e.g., after React batching or in dev mode).
 *
 * @example
 * const { dialogProps, askConfirm } = useConfirm();
 *
 * <ConfirmDialog {...dialogProps} />
 *
 * // Trigger:
 * askConfirm({ message: "Xoá nhóm này?", onConfirm: () => doDelete(id) });
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmColor = "error",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const t = useTranslations("common");
  const resolvedTitle = title ?? t("confirmDeleteTitle");
  const resolvedConfirm = confirmLabel ?? t("delete");
  const resolvedCancel = cancelLabel ?? t("cancel");
  const colors = colorMap[confirmColor];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className={cn("min-w-[380px] border-t-[3px] pt-4 sm:max-w-sm", colors.border)}>
        <DialogHeader className="items-center flex flex-col gap-3 text-center">
          <AlertTriangle className={cn("size-12", colors.icon)} strokeWidth={1.5} />
          <DialogTitle id="confirm-dialog-title" className="text-lg font-bold">
            {resolvedTitle}
          </DialogTitle>
          <DialogDescription id="confirm-dialog-description" className="text-center">
            {message}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 flex gap-3 sm:flex-row">
          <Button
            id="confirm-dialog-confirm"
            onClick={onConfirm}
            className={cn("flex-1 font-semibold", colors.button)}
          >
            {resolvedConfirm}
          </Button>
          <DialogClose asChild>
            <Button
              id="confirm-dialog-cancel"
              variant="outline"
              onClick={onCancel}
              className="flex-1 font-medium"
            >
              {resolvedCancel}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
