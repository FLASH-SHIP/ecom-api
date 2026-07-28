"use client";

import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "../lib/utils";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon, XIcon } from "lucide-react";
import * as React from "react";
import type { DateRange } from "react-day-picker";

interface DateRangePickerProps {
  /** Start date as YYYY-MM-DD string */
  valueFrom?: string;
  /** End date as YYYY-MM-DD string */
  valueTo?: string;
  /** Callback with YYYY-MM-DD strings */
  onChange?: (from: string, to: string) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
  disableFuture?: boolean;
  maxDays?: number;
  className?: string;
}

function parseDateStr(val: string | undefined): Date | undefined {
  if (!val) return undefined;
  const d = parse(val, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
}

/**
 * "awaiting-from" → user hasn't picked anything yet, next click = from
 * "awaiting-to"   → from is picked, next click = to (then commit & close)
 */
type SelectionStep = "awaiting-from" | "awaiting-to";

function DateRangePicker({
  valueFrom,
  valueTo,
  onChange,
  onClear,
  placeholder = "dd/mm/yyyy — dd/mm/yyyy",
  disabled,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<SelectionStep>("awaiting-from");

  // Internal range shown while the popover is open
  const [localRange, setLocalRange] = React.useState<DateRange | undefined>(undefined);

  // Committed range from parent props
  const committedRange: DateRange | undefined = React.useMemo(() => {
    const from = parseDateStr(valueFrom);
    if (!from) return undefined;
    return { from, to: parseDateStr(valueTo) };
  }, [valueFrom, valueTo]);

  // When the popover opens, seed localRange from committed and reset step
  const handleOpenChange = React.useCallback(
    (isOpen: boolean) => {
      // Block external close while in mid-selection
      if (!isOpen && step === "awaiting-to") return;

      setOpen(isOpen);
      if (isOpen) {
        setLocalRange(committedRange);
        setStep("awaiting-from");
      } else {
        setLocalRange(undefined);
        setStep("awaiting-from");
      }
    },
    [committedRange, step],
  );

  // Display whichever range is relevant
  const displayRange = open ? localRange : committedRange;

  const displayText = React.useMemo(() => {
    if (!displayRange?.from) return placeholder;
    const fromStr = format(displayRange.from, "dd/MM/yyyy");
    if (!displayRange.to) return fromStr;
    return `${fromStr} — ${format(displayRange.to, "dd/MM/yyyy")}`;
  }, [displayRange, placeholder]);

  const handleDayClick = React.useCallback(
    (day: Date) => {
      if (step === "awaiting-from") {
        // First click: set from, clear to
        setLocalRange({ from: day, to: undefined });
        setStep("awaiting-to");
      } else {
        // Second click: set to (ensure from <= to)
        const from = localRange?.from;
        if (!from) return;

        let finalFrom: Date;
        let finalTo: Date;
        if (day < from) {
          finalFrom = day;
          finalTo = from;
        } else {
          finalFrom = from;
          finalTo = day;
        }
        setLocalRange({ from: finalFrom, to: finalTo });
        onChange?.(format(finalFrom, "yyyy-MM-dd"), format(finalTo, "yyyy-MM-dd"));
        setStep("awaiting-from");
        setOpen(false);
      }
    },
    [step, localRange, onChange],
  );

  // Prevent Radix auto-close events while mid-selection
  const preventCloseWhilePending = React.useCallback(
    (e: Event) => {
      if (step === "awaiting-to") {
        e.preventDefault();
      }
    },
    [step],
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !displayRange?.from && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 size-4 shrink-0" />
          <span className="truncate flex-1">{displayText}</span>
          {committedRange?.from && !disabled && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear date range"
              className="ml-1 shrink-0 rounded-sm opacity-50 hover:opacity-100 transition-opacity focus:outline-none focus:ring-1 focus:ring-ring"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onClear?.();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  e.preventDefault();
                  onClear?.();
                }
              }}
            >
              <XIcon className="size-3.5" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        onInteractOutside={preventCloseWhilePending}
        onFocusOutside={preventCloseWhilePending}
      >
        <Calendar
          mode="range"
          captionLayout="dropdown"
          selected={localRange}
          onDayClick={handleDayClick}
          numberOfMonths={2}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export type { DateRangePickerProps };
export { DateRangePicker };
