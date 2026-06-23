"use client";

import { formatDate } from "@admin/utils/func";
import { Checkbox } from "@ecom/ui/components/checkbox";
import { Undo2 } from "lucide-react";
import type { ReactNode } from "react";
import type { MediaItem, MediaListBackItemProps, MediaListItemProps } from "../model/media.model";
import { MediaItemType } from "../model/media.model";

/** Get a short type badge label from mime or type */
const getTypeBadge = (item: MediaItem): string => {
  if (item.type === MediaItemType.FOLDER) return "DIR";
  if (item.mime_type) {
    const sub = item.mime_type.split("/")[1]?.toUpperCase();
    return sub ?? item.type.toUpperCase();
  }
  return item.type.toUpperCase();
};

const MediaListItem = ({
  item,
  isSelected,
  onClick,
  onDoubleClick,
  onContextMenu,
}: MediaListItemProps): ReactNode => {
  return (
    <div
      role="row"
      tabIndex={0}
      onClick={(e) => {
        const isMulti = e.metaKey || e.ctrlKey;
        onClick(item, isMulti);
      }}
      onDoubleClick={() => onDoubleClick(item)}
      onContextMenu={(e) => onContextMenu(e, item)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onDoubleClick(item);
      }}
      className={`
        flex items-center gap-3 px-3 py-2 border-b cursor-pointer transition-colors select-none
        ${isSelected ? "bg-primary/5" : "hover:bg-accent/50"}
      `}
    >
      {/* Checkbox */}
      <Checkbox
        checked={isSelected}
        className="shrink-0"
        onClick={(e) => e.stopPropagation()}
        onCheckedChange={() => onClick(item)}
      />

      {/* Type badge */}
      <span className="text-[0.6875rem] font-semibold text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0 min-w-[2rem] text-center">
        {getTypeBadge(item)}
      </span>

      {/* Name */}
      <span className="flex-1 text-sm truncate" style={{ color: "var(--admin-text-color)" }}>
        {item.name}
      </span>

      {/* Size */}
      <span
        className="text-sm w-[5.625rem] text-right shrink-0"
        style={{ color: "var(--admin-text-color)" }}
      >
        {item.size ?? "-"}
      </span>

      {/* Date */}
      <span
        className="text-sm w-[10rem] text-right shrink-0"
        style={{ color: "var(--admin-text-color)" }}
      >
        {formatDate(item.created_at)}
      </span>
    </div>
  );
};

export default MediaListItem;

// ── Back row ────────────────────────────────────────────

export const MediaListBackItem = ({ onClick }: MediaListBackItemProps): ReactNode => {
  return (
    <div
      role="row"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
      className="flex items-center gap-3 px-3 py-2 border-b cursor-pointer hover:bg-accent/50 transition-colors select-none"
    >
      <Undo2 className="size-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">...</span>
    </div>
  );
};
