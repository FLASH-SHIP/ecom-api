"use client";

import { Button } from "@ecom/ui/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "@ecom/ui/components/popover";

import { cn } from "@ecom/ui/lib/utils";
import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react";
import * as React from "react";

interface SearchableSelectOption {
  value: string;
  label: string;
  icon?: string;
  /** Optional image URL rendered as a thumbnail beside the label */
  image?: string | null;
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
  /** When true, disables local filtering — parent controls options via server-side search */
  serverSearch?: boolean;
  /** Called when the search input changes (debounced). Use with serverSearch to fetch filtered options. */
  onSearchChange?: (search: string) => void;
  /** Debounce delay in ms for onSearchChange. Default: 300 */
  searchDebounceMs?: number;
  /** Show a loading indicator in the dropdown */
  loading?: boolean;
}

// Memoized option item to prevent re-renders of the entire list when selection changes
const OptionItem = React.memo(function OptionItem({
  opt,
  isSelected,
  onSelect,
}: {
  opt: SearchableSelectOption;
  isSelected: boolean;
  onSelect: (value: string) => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(opt.value)}
        className={cn(
          "flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
          isSelected && "font-medium",
        )}
      >
        <Check className={cn("size-3.5 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
        {opt.image && (
          <img src={opt.image} alt={opt.label} className="size-7 shrink-0 object-contain" />
        )}
        {opt.icon && (
          <span className="inline-block w-4 text-center font-mono text-xs text-muted-foreground">
            {opt.icon}
          </span>
        )}
        <span className="truncate">{opt.label}</span>
      </button>
      {opt.separatorAfter && <div className="my-1 h-px bg-border" />}
    </div>
  );
});

function SearchableSelect({
  value,
  onValueChange,
  onOptionSelect,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled,
  className,
  allowClear = true,
  maxHeight = "200px",
  serverSearch = false,
  onSearchChange,
  searchDebounceMs = 300,
  loading = false,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const [recordedValue, setRecordedValue] = React.useState<string>("");
  const [lastSelectedLabel, setLastSelectedLabel] = React.useState<string>("");

  const selectedOption = options.find((opt) => opt.value === value);

  React.useEffect(() => {
    if (selectedOption) {
      setRecordedValue(selectedOption.value);
      setLastSelectedLabel(selectedOption.label);
    }
  }, [selectedOption]);

  const hasValue = !!value;
  const displayLabel =
    selectedOption?.label ??
    (value && value === recordedValue ? lastSelectedLabel : null) ??
    (hasValue ? value : placeholder);

  const resetSearch = React.useCallback(() => {
    setSearch("");
    onSearchChange?.("");
  }, [onSearchChange]);

  const handleSearchInput = React.useCallback(
    (val: string) => {
      setSearch(val);
      if (onSearchChange) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          onSearchChange(val);
        }, searchDebounceMs);
      }
    },
    [onSearchChange, searchDebounceMs],
  );

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const filteredOptions = React.useMemo(() => {
    if (serverSearch) return options;
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, search, serverSearch]);

  const handleSelect = React.useCallback(
    (optionValue: string) => {
      const isSelected = optionValue === value;
      const newValue = isSelected ? "" : optionValue;
      onValueChange?.(newValue);
      if (!isSelected) {
        const found = options.find((opt) => opt.value === optionValue);
        if (found) {
          onOptionSelect?.(found);
        }
      }
      setOpen(false);
      resetSearch();
    },
    [onValueChange, value, resetSearch, options, onOptionSelect],
  );

  const handleOpenChange = React.useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (isOpen) {
        // Auto-focus search input when dropdown opens
        requestAnimationFrame(() => searchInputRef.current?.focus());
      } else {
        resetSearch();
      }
    },
    [resetSearch],
  );

  const handleClear = React.useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onValueChange?.("");
    },
    [onValueChange],
  );

  const showClear = allowClear && selectedOption && !disabled;

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-9 lg:h-10 xl:h-11 2xl:h-[52px] w-full justify-between font-normal",
            !selectedOption && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {selectedOption?.image && (
              <img
                src={selectedOption.image}
                alt={selectedOption.label}
                className="size-7 shrink-0 object-contain"
              />
            )}
            {selectedOption?.icon && (
              <span className="mr-1.5 inline-block w-4 text-center font-mono text-xs text-muted-foreground">
                {selectedOption.icon}
              </span>
            )}
            {displayLabel}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {showClear && (
              // biome-ignore lint/a11y/useSemanticElements: nested button is invalid HTML
              <span
                role="button"
                tabIndex={-1}
                aria-label="Clear selection"
                onPointerDownCapture={handleClear}
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
            ref={searchInputRef}
            value={search}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder={searchPlaceholder}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && (
            <Loader2 className="ml-2 size-3.5 shrink-0 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Options list */}
        <div
          role="presentation"
          className="overflow-y-auto p-1"
          style={{ maxHeight }}
          onWheel={(e) => e.stopPropagation()}
        >
          {!loading && filteredOptions.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">No results found.</div>
          ) : (
            filteredOptions.map((opt, idx) => (
              <OptionItem
                // biome-ignore lint/suspicious/noArrayIndexKey: options may have duplicate values (e.g. same city name)
                key={`${opt.value}-${idx}`}
                opt={opt}
                isSelected={value === opt.value}
                onSelect={handleSelect}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type { SearchableSelectOption, SearchableSelectProps };
export { SearchableSelect };
