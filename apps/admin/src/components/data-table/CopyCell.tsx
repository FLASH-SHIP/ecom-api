"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@ecom/ui/components/tooltip";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useCallback, useState } from "react";

export function CopyCell({ children, value }: { children: ReactNode; value: unknown }) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations("dataTable");

  const handleCopy = useCallback(async () => {
    const text = value == null ? "" : String(value);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API not available (e.g. insecure context)
    }
  }, [value]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: copy-on-click is a convenience enhancement, not primary interaction */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: click-to-copy cell wrapper */}
        <div
          className="group/copy inline-flex items-center gap-1 cursor-pointer"
          onClick={handleCopy}
        >
          <span className="min-w-0">{children}</span>
          {copied ? (
            <Check className="size-3.5 shrink-0 text-emerald-500" />
          ) : (
            <Copy className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover/copy:opacity-50 text-muted-foreground" />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">
        {copied ? t("copiedToClipboard") : t("clickToCopy")}
      </TooltipContent>
    </Tooltip>
  );
}
