"use client";

import { Badge } from "@ecom/ui/components/badge";
import { cn } from "@ecom/ui/lib/utils";
import { useTranslations } from "next-intl";

type Status = "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";

const statusStyles: Record<Status, string> = {
  DRAFT: "bg-gray-500 text-white hover:bg-gray-500",
  PENDING: "bg-amber-500 text-white hover:bg-amber-500",
  PUBLISHED: "bg-green-600 text-white hover:bg-green-600",
  ARCHIVED: "bg-red-500 text-white hover:bg-red-500",
};

export function PostStatusBadge({ status }: { status: Status }) {
  const t = useTranslations("posts.status");
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-md border-0 px-1.5 py-0.5 text-xs font-medium",
        statusStyles[status] ?? "",
      )}
    >
      {t(status)}
    </Badge>
  );
}
