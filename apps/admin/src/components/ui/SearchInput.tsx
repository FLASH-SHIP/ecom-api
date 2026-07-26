"use client";

import { useDebounce } from "@admin/lib/hooks/useDebounce";
import { Input } from "@ecom/ui/components/input";
import { cn } from "@ecom/ui/lib/utils";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

export interface SearchInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minChars?: number;
  debounceMs?: number;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
}

export function SearchInput({
  value: externalValue = "",
  onChange,
  placeholder = "Search...",
  minChars = 2,
  debounceMs = 300,
  autoFocus = false,
  className,
  inputClassName,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(externalValue);
  const debouncedValue = useDebounce(internalValue, debounceMs);

  // Sync internal value when external value changes (e.g. form reset or clear from parent)
  useEffect(() => {
    setInternalValue(externalValue);
  }, [externalValue]);

  // Handle debounced search with minChars check
  useEffect(() => {
    const trimmed = debouncedValue.trim();

    // 1. Reset search if empty
    if (trimmed.length === 0) {
      if (externalValue !== "") {
        onChange("");
      }
      return;
    }

    // 2. Only trigger search if length >= minChars
    if (trimmed.length >= minChars && trimmed !== externalValue) {
      onChange(trimmed);
    }
  }, [debouncedValue, minChars, externalValue, onChange]);

  const handleClear = () => {
    setInternalValue("");
    onChange("");
  };

  return (
    <div className={cn("relative flex-1", className)}>
      <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn("h-10 pl-8 pr-8 text-sm", inputClassName)}
      />
      {internalValue ? (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
