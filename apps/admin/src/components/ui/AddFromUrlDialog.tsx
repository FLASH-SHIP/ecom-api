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
import { Input } from "@ecom/ui/components/input";
import { Label } from "@ecom/ui/components/label";
import { Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

interface AddFromUrlDialogProps {
  open: boolean;
  title?: string;
  label?: string;
  placeholder?: string;
  onSubmit: (url: string) => void;
  onCancel: () => void;
}

/**
 * Modal dialog for entering a URL, replacing native `window.prompt()`.
 *
 * Uses the same shadcn Dialog primitives as the rest of the admin UI
 * for a consistent look-and-feel.
 *
 * Designed for reuse across any feature that needs a URL input
 * (post featured image, banner image, page images, rich-text editor, etc.).
 *
 * @example
 * const { dialogProps, askUrl } = useAddFromUrl();
 *
 * <AddFromUrlDialog {...dialogProps} />
 *
 * // Trigger:
 * askUrl({ onSubmit: (url) => setImage(url) });
 */
export function AddFromUrlDialog({
  open,
  title,
  label,
  placeholder,
  onSubmit,
  onCancel,
}: AddFromUrlDialogProps) {
  const t = useTranslations("common");
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const resolvedTitle = title ?? t("addFromUrlTitle");
  const resolvedLabel = label ?? t("addFromUrlLabel");
  const resolvedPlaceholder = placeholder ?? t("addFromUrlPlaceholder");

  // Reset input when dialog opens
  useEffect(() => {
    if (open) {
      setUrl("");
      // Focus input after dialog animation completes
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleSubmit = () => {
    const trimmed = url.trim();
    if (trimmed) {
      onSubmit(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-5 text-primary" />
            {resolvedTitle}
          </DialogTitle>
          <DialogDescription>{t("addFromUrlDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="add-from-url-input">{resolvedLabel}</Label>
          <Input
            ref={inputRef}
            id="add-from-url-input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={resolvedPlaceholder}
            autoComplete="off"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("cancel")}
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit} disabled={!url.trim()}>
            {t("addFromUrlAdd")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
