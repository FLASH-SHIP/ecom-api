/**
 * Shared DataTable utilities.
 * Import directly from "@admin/components/data-table/utils" for tree-shaking.
 */

import type { FilterOperatorValue } from "@ecom/trpc/server/shared/filterSchema";
import type { ActiveFilter } from "./types";

// ── Filter conversion ─────────────────────────────────────────────────────────

const NO_VALUE_OPS = new Set(["empty", "notEmpty"]);

/**
 * Convert ActiveFilter[] from the DataTable UI into the tRPC filter input shape.
 * Handles empty/notEmpty operators that don't require a value.
 */
export function toFilterInput(
  filters: ActiveFilter[],
): Array<{ fieldKey: string; operator: FilterOperatorValue; value: string; value2?: string }> {
  return filters
    .filter((f) => {
      if (!f.fieldKey) return false;
      if (NO_VALUE_OPS.has(f.operator)) return true;
      return f.value.trim().length > 0;
    })
    .map((f) => ({
      fieldKey: f.fieldKey,
      operator: f.operator as FilterOperatorValue,
      value: NO_VALUE_OPS.has(f.operator) ? "__empty__" : f.value.trim(),
      ...(f.value2?.trim() ? { value2: f.value2.trim() } : {}),
    }));
}

// ── localStorage persistence (Botble-compatible format) ───────────────────────

/**
 * What we persist to localStorage.
 *
 * Matching Botble's localStorage schema as closely as possible:
 * - Key format: `ecom_dt_<tableId>`  (Botble: `DataTables_<id>_<path>`)
 * - `length`   = pageSize           (Botble field name)
 * - `order`    = [[sortKey, dir]]   (Botble uses [[colIndex, dir]] — we use key)
 * - `search`   = search term string (Botble wraps in an object; we keep it simple)
 * - `page`     = current page       (Botble persists the current page number)
 */
export interface PersistedTableState {
  /** pageSize — named `length` to match Botble's DataTables.js convention */
  length: number;
  /** Sort state — [[colKey, "asc"|"desc"]] (Botble uses col index; we use string key) */
  order: [[string, "asc" | "desc"]];
  /** Search term string */
  search: string;
  /** Current page — persisted so users return to the same page on reload (Botble behaviour) */
  page: number;
}

const STORAGE_PREFIX = "ecom_dt_";

/**
 * Load persisted DataTable state from localStorage.
 * Returns null when no state exists, JSON is corrupt, or window is unavailable (SSR).
 * No TTL — matches Botble's behaviour (state persists indefinitely).
 */
export function loadTableState(tableId: string): PersistedTableState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tableId}`);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!isValidState(data)) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Save DataTable state to localStorage.
 * Silently ignores errors (private browsing, storage quota exceeded, SSR).
 */
export function saveTableState(tableId: string, state: PersistedTableState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${tableId}`, JSON.stringify(state));
  } catch {
    // Ignore write errors (quota exceeded, private browsing)
  }
}

/** Remove persisted state for a given key. */
export function clearTableState(tableId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${tableId}`);
  } catch {
    // Ignore
  }
}

// ── Private helpers ───────────────────────────────────────────────────────────

function isValidState(data: unknown): data is PersistedTableState {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.length === "number" &&
    d.length > 0 &&
    typeof d.search === "string" &&
    Array.isArray(d.order) &&
    Array.isArray(d.order[0]) &&
    typeof d.order[0][0] === "string" &&
    (d.order[0][1] === "asc" || d.order[0][1] === "desc")
    // `page` is optional for backwards-compat with existing stored state
  );
}
