"use client";

import PerfectScrollbar from "perfect-scrollbar";
import "perfect-scrollbar/css/perfect-scrollbar.css";
import { cn } from "../lib/utils";
import type { HTMLAttributes, ReactNode } from "react";
import { forwardRef, useEffect, useRef } from "react";

export interface PerfectScrollProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  options?: PerfectScrollbar.Options;
}

/**
 * Drop-in scroll container using perfect-scrollbar (same as Fuse React theme).
 * Renders custom scrollbar DOM elements that show on hover — bypasses macOS
 * overlay scrollbar limitations.
 */
const PerfectScroll = forwardRef<HTMLDivElement, PerfectScrollProps>(
  ({ children, className, options, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const psRef = useRef<PerfectScrollbar | null>(null);

    useEffect(() => {
      if (!containerRef.current) return;

      psRef.current = new PerfectScrollbar(containerRef.current, {
        wheelPropagation: true,
        ...options,
      });

      return () => {
        if (psRef.current) {
          psRef.current.destroy();
          psRef.current = null;
        }
      };
    }, [options]);

    // Update perfect-scrollbar when children change
    useEffect(() => {
      psRef.current?.update();
    });

    return (
      <div
        ref={(el) => {
          containerRef.current = el;
          if (typeof ref === "function") {
            ref(el);
          } else if (ref) {
            ref.current = el;
          }
        }}
        className={cn("relative", className)}
        style={{ overflow: "hidden", ...props.style }}
        {...props}
      >
        {children}
      </div>
    );
  },
);
PerfectScroll.displayName = "PerfectScroll";

export { PerfectScroll };
