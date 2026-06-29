"use client";

import { FolderOpen, Images } from "lucide-react";
import type { ReactNode } from "react";
import type { MediaBreadcrumbProps } from "../model/media.model";
import { ButtonField } from "./Compat";

const MediaBreadcrumb = ({ segments, onNavigate }: MediaBreadcrumbProps): ReactNode => {
  return (
    <nav className="flex items-center gap-1 text-sm flex-wrap">
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const isRoot = index === 0;
        const Icon = isRoot ? Images : FolderOpen;

        return (
          <span key={segment.folderId ?? "root"} className="flex items-center gap-1">
            {index > 0 && <span className="text-muted-foreground mx-1">/</span>}
            <ButtonField
              variant="ghost"
              onClick={() => onNavigate(index)}
              disabled={isLast}
              className={`flex items-center gap-1 transition-colors h-auto px-1 py-0 ${
                isLast ? "font-medium cursor-default" : "cursor-pointer"
              }`}
              style={{
                color: isLast ? "var(--admin-text-color)" : "var(--admin-link-color)",
              }}
              onMouseEnter={(e) => {
                if (!isLast)
                  (e.currentTarget as HTMLElement).style.color = "var(--admin-link-hover-color)";
              }}
              onMouseLeave={(e) => {
                if (!isLast)
                  (e.currentTarget as HTMLElement).style.color = "var(--admin-link-color)";
              }}
            >
              <Icon className="size-4" />
              {segment.label}
            </ButtonField>
          </span>
        );
      })}
    </nav>
  );
};

export default MediaBreadcrumb;
