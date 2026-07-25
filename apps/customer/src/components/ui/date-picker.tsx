"use client";

import { Button } from "@ecom/ui/components/button";
import { Calendar } from "@ecom/ui/components/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@ecom/ui/components/popover";

import { cn } from "@ecom/ui/lib/utils";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import * as React from "react";

interface DatePickerProps {
  /** Selected date as YYYY-MM-DD string */
  value?: string;
  /** Callback with YYYY-MM-DD string or empty string */
  onChange?: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  disabledDays?: (date: Date) => boolean;
}

function DatePicker({
  value,
  onChange,
  placeholder = "dd/mm/yyyy",
  disabled,
  className,
  disabledDays,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = React.useMemo(() => {
    if (!value) return undefined;
    const d = parse(value, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {selectedDate ? format(selectedDate, "dd/MM/yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selectedDate}
          onSelect={(date) => {
            onChange?.(date ? format(date, "yyyy-MM-dd") : "");
            setOpen(false);
          }}
          disabled={disabledDays}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export type { DatePickerProps };
export { DatePicker };
