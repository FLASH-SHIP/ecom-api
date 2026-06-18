/**
 * StatusFilterBar — reusable tab-style status filter used across admin list pages.
 * Pure Tailwind toggle-button group.
 */
import { cn } from "@ecom/ui/lib/utils";

export interface StatusTab<T extends string> {
  key: T | "";
  label: string;
  count?: number;
}

interface StatusFilterBarProps<T extends string> {
  value: T | "";
  onChange: (value: T | "") => void;
  tabs: StatusTab<T>[];
  ariaLabel?: string;
}

export function StatusFilterBar<T extends string>({
  value,
  onChange,
  tabs,
  ariaLabel = "Status filter",
}: StatusFilterBarProps<T>) {
  return (
    <fieldset className="flex flex-wrap gap-1 border-none p-0" aria-label={ariaLabel}>
      {tabs.map(({ key, label, count }) => (
        <button
          key={key || "_all"}
          type="button"
          onClick={() => onChange(key as T | "")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
            value === key
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          {label}
          {count !== undefined && <span className="text-[0.75em] opacity-65">({count})</span>}
        </button>
      ))}
    </fieldset>
  );
}
