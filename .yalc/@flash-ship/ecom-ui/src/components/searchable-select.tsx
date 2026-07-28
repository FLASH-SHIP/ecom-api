"use client";

import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

import { cn } from "../lib/utils";
import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react";
import * as React from "react";

interface SearchableSelectOption {
  value: string;
  label: string;
  icon?: string;
  separatorAfter?: boolean;
}

interface SearchableSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  onOptionSelect?: (option: SearchableSelectOption) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
  /** Max height of the dropdown list. Use "none" to show all items. Default: "200px" */
  maxHeight?: string;
  serverSearch?: boolean;
  onSearchChange?: (search: string) => void;
  searchDebounceMs?: number;
  loading?: boolean;
}
function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled,
  className,
  allowClear = true,
  maxHeight = "200px",
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, search]);

  const handleSelect = (optionValue: string) => {
    onValueChange?.(optionValue === value ? "" : optionValue);
    setOpen(false);
    setSearch("");
  };

  const _handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onValueChange?.("");
    setOpen(false);
  };

  const showClear = allowClear && selectedOption && !disabled;

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setSearch("");
      }}
      modal={true}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selectedOption && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {selectedOption?.icon && (
              <span className="mr-1.5 inline-block w-4 text-center font-mono text-xs text-muted-foreground">
                {selectedOption.icon}
              </span>
            )}
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {showClear && (
              // biome-ignore lint/a11y/useSemanticElements: nested button is invalid HTML
              <span
                role="button"
                tabIndex={-1}
                aria-label="Clear selection"
                onPointerDownCapture={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onValueChange?.("");
                }}
                className="rounded-sm p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer inline-flex items-center justify-center"
              >
                <X className="size-3.5" />
              </span>
            )}
            <span
              aria-hidden="true"
              className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
            >
              <ChevronsUpDown className="size-3.5 shrink-0" />
            </span>
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="flex items-center border-b border-border px-2.5 py-2">
          <Search className="mr-2 size-3.5 shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Options list */}
        <div className="overflow-y-auto p-1" style={{ maxHeight }}>
          {filteredOptions.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">No results found.</div>
          ) : (
            filteredOptions.map((opt) => (
              <div key={opt.value}>
                <button
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                    value === opt.value && "font-medium",
                  )}
                >
                  <Check
                    className={cn(
                      "size-3.5 shrink-0",
                      value === opt.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {opt.icon && (
                    <span className="inline-block w-4 text-center font-mono text-xs text-muted-foreground">
                      {opt.icon}
                    </span>
                  )}
                  <span className="truncate">{opt.label}</span>
                </button>
                {opt.separatorAfter && <div className="my-1 h-px bg-border" />}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type { SearchableSelectOption, SearchableSelectProps };
export { SearchableSelect };
