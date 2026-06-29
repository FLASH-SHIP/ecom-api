"use client";

import { Button } from "@ecom/ui/components/button";
import { useEffect, useState } from "react";

interface StickyPublishBarProps {
  /**
   * Ref of the publish sidebar element to observe.
   */
  publishCardRef: React.RefObject<HTMLDivElement | null>;
  /**
   * The display name of the object currently being managed (e.g. title of post, display name of role)
   */
  title?: string;
  /**
   * Status text or namespace title (e.g. "Sửa vai trò", "Chỉnh sửa bài viết")
   */
  label?: string;
  /**
   * Whether mutation or submission is currently loading
   */
  isPending?: boolean;
  /**
   * Callback when the main Save button is clicked
   */
  onSave?: () => void;
  /**
   * Custom label for the Save button
   */
  saveLabel?: string;
  /**
   * Custom elements or extra buttons to display inside the pill
   */
  children?: React.ReactNode;
}

export function StickyPublishBar({
  publishCardRef,
  title,
  label,
  isPending = false,
  onSave,
  saveLabel = "Lưu",
  children,
}: StickyPublishBarProps) {
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const card = publishCardRef.current;
    if (!card) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      {
        threshold: 0,
        rootMargin: "-64px 0px 0px 0px", // matches h-16 (64px) header height on desktop
      },
    );

    observer.observe(card);
    return () => observer.disconnect();
  }, [publishCardRef]);

  if (!isSticky) return null;

  return (
    <div className="fixed top-2 md:top-3 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 bg-background/95 backdrop-blur-md p-1.5 pl-3 pr-2 rounded-full border border-border/80 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
      <span className="text-xs text-muted-foreground mr-1 hidden sm:inline-block max-w-[150px] truncate">
        {label ? `${label}: ` : ""}
        {title}
      </span>
      <div className="h-4 w-px bg-border mr-1 hidden sm:inline-block" />

      {onSave && (
        <Button
          type="submit"
          size="sm"
          onClick={() => {
            if (onSave) {
              onSave();
            }
          }}
          disabled={isPending}
          className="text-xs h-7 px-3 font-semibold rounded-full"
        >
          {saveLabel}
        </Button>
      )}

      {children}
    </div>
  );
}
