"use client";

import { Badge } from "@ecom/ui/components/badge";
import { cn } from "@ecom/ui/lib/utils";
import { useTranslations } from "next-intl";

interface StatusBadgeProps {
  status: string;
}

const statusStyles: Record<string, string> = {
  published: "bg-green-600 text-white hover:bg-green-600",
  pending: "bg-amber-500 text-white hover:bg-amber-500",
  draft: "bg-gray-500 text-white hover:bg-gray-500",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations("customFields.status");
  const label = (() => {
    try {
      return t(status as Parameters<typeof t>[0]);
    } catch {
      return status;
    }
  })();
  return (
    <Badge
      variant="secondary"
      className={cn(
        "min-w-[80px] justify-center rounded-md border-0 px-1.5 py-0.5 text-xs font-medium",
        statusStyles[status] ?? "",
      )}
    >
      {label}
    </Badge>
  );
}
