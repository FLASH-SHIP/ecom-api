"use client";

import { useCallback, useRef, useState } from "react";
import type { DataTableServerParams, SortState } from "../types";
import { loadTableState, saveTableState } from "../utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UseServerTableOptions<TInput> {
  /**
   * Unique table identifier used as the localStorage key suffix.
   * Format: `ecom_dt_<tableId>` — e.g. `"custom-fields"`, `"posts"`, `"users"`.
   * When provided, `pageSize`, `sort`, and `search` are persisted across
   * page reloads and browser sessions (like Botble's DataTables.js stateSave).
   *
   * Note: `page` is intentionally NOT persisted — users always start at page 1
   * on reload (standard web UX, consistent with Botble's behaviour).
   *
   * ### Pre-condition: No SSR
   * This hook reads `localStorage` synchronously inside `useState` lazy
   * initializers. This is safe ONLY when the host component is excluded from
   * server-side rendering — i.e. imported via `next/dynamic` with `ssr: false`.
   * Do NOT use `tableId` in a component that is SSR-rendered, as it will
   * cause a hydration mismatch.
   */
  tableId?: string;
  /** Fallback sort when no persisted state exists */
  defaultSort?: SortState;
  /** Fallback page size when no persisted state exists (default: 25) */
  defaultPageSize?: number;
  /**
   * Pure function that maps DataTable server params → tRPC query input.
   * Define it as a module-level constant (outside the component) so it is
   * referentially stable and does not cause unnecessary re-renders.
   */
  toQueryInput: (params: DataTableServerParams) => TInput;
}

export interface UseServerTableResult<TInput> {
  /** Current tRPC query input — pass directly to `trpc.xxx.useQuery(queryInput)` */
  queryInput: TInput;
  /**
   * Callback for `DataTable`'s `onServerChange` prop.
   * Updates `queryInput` and persists state to localStorage when `tableId` is set.
   * Guaranteed stable across renders — safe to use as a useEffect dependency.
   */
  onServerChange: (params: DataTableServerParams) => void;
  /**
   * Initial DataTable state resolved from localStorage (if available) or defaults.
   * Pass to `DataTable` as `initialState`.
   */
  initialState: Partial<DataTableServerParams>;
  /**
   * Stable React key — `"default"` when no stored state, `"restored"` when
   * localStorage had state that was eagerly applied on first render.
   * Pass this as the `key` prop on `<DataTable>` so DataTable's internal
   * useState hooks initialise with the correct `initialState`.
   *
   * @example
   * ```tsx
   * const { queryInput, onServerChange, initialState, tableKey } = useServerTable({ ... });
   * return <DataTable key={tableKey} initialState={initialState} ... />;
   * ```
   */
  tableKey: string;
}

const DEFAULT_SORT: SortState = { key: "id", direction: "desc" };

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Page-level hook for server-driven `DataTable` pages.
 *
 * ## Responsibilities
 * 1. Maintains the tRPC `queryInput` state derived from `DataTableServerParams`.
 * 2. Persists `pageSize`, `sort`, and `search` to `localStorage` on every change
 *    (matching Botble's DataTables.js `stateSave` behaviour).
 * 3. Restores persisted state eagerly — `localStorage` is read **synchronously**
 *    inside `useState` lazy initializers, so the very first `queryInput` already
 *    has the correct restored values. **Zero extra renders. Zero extra tRPC requests.**
 * 4. Returns `tableKey` — `"restored"` when localStorage had state (so DataTable
 *    remounts with the correct `initialState`), `"default"` otherwise.
 *
 * ## Pre-condition: host component must NOT be SSR-rendered
 * Reading `localStorage` inside `useState` lazy initializers causes a hydration
 * mismatch when the component is server-rendered (server has no localStorage).
 * The page must be imported via `next/dynamic` with `ssr: false`:
 *
 * ```tsx
 * // page.tsx (Server Component)
 * import dynamic from "next/dynamic";
 * const CustomFieldsContent = dynamic(() => import("./CustomFieldsContent"), { ssr: false });
 * export default function Page() { return <CustomFieldsContent />; }
 * ```
 *
 * ## What is / is NOT persisted
 * | State     | Persisted | Reason                                          |
 * |-----------|-----------|------------------------------------------------|
 * | `pageSize`| ✅ Yes    | User preference — stays across sessions         |
 * | `sort`    | ✅ Yes    | User preference — stays across sessions         |
 * | `search`  | ✅ Yes    | Convenient to restore active search             |
 * | `page`    | ❌ No     | Always reset to 1 on reload (same as Botble)    |
 * | `filters` | ❌ No     | Too complex; applied deliberately per session   |
 *
 * ## `onServerChange` stability
 * `defaultSort` is captured in a `useRef` so `onServerChange`'s `useCallback`
 * deps array only contains `tableId` (a primitive string). This guarantees the
 * callback is referentially stable for the component's lifetime, preventing
 * unnecessary `useEffect` re-runs inside `useDataTable`.
 *
 * @example
 * ```tsx
 * // Define mapper OUTSIDE the component (module-level) for referential stability
 * function toQueryInput(params: DataTableServerParams): ListGroupsInput {
 *   return {
 *     page: params.page,
 *     pageSize: params.pageSize,
 *     search: params.search,
 *     sortBy: params.sort.key,
 *     sortDir: params.sort.direction ?? "desc",
 *   };
 * }
 *
 * export default function CustomFieldsContent() {
 *   const { queryInput, onServerChange, initialState, tableKey } = useServerTable({
 *     tableId: "custom-fields",
 *     defaultSort: { key: "id", direction: "desc" },
 *     toQueryInput,
 *   });
 *   const { data } = trpc.viewer.customFields.listGroups.useQuery(queryInput);
 *   return (
 *     <DataTable
 *       key={tableKey}
 *       rows={data?.rows ?? []}
 *       initialState={initialState}
 *       onServerChange={onServerChange}
 *       serverTotalCount={data?.total}
 *     />
 *   );
 * }
 * ```
 */
export function useServerTable<TInput>({
  tableId,
  defaultSort = DEFAULT_SORT,
  defaultPageSize = 25,
  toQueryInput,
}: UseServerTableOptions<TInput>): UseServerTableResult<TInput> {
  // ── Stabilize defaultSort via ref ─────────────────────────────────────────
  // Callers often pass inline objects: `defaultSort={{ key: "id", direction: "desc" }}`.
  // A new object is created on every render, which would make onServerChange's
  // useCallback recreate on every render. By reading via a ref in the callback,
  // the useCallback deps array only needs `tableId` (a stable primitive).
  const defaultSortRef = useRef(defaultSort);
  defaultSortRef.current = defaultSort;

  // ── Step 1: Eagerly resolve initial state from localStorage ─────────────────────
  // The component is excluded from SSR (via `next/dynamic` with `ssr: false`),
  // so this lazy initializer ONLY runs in the browser — `localStorage` is always
  // available. Reading it here (vs in useEffect) means:
  //   - initialState is correct from the very first render
  //   - queryInput is correct from the very first render
  //   - Only ONE tRPC query is fired — with the correct restored params
  //   - No intermediate render with default values (no double-request)
  const [{ initialState, tableKey, queryInput: initialQueryInput }] = useState(
    (): { initialState: DataTableServerParams; tableKey: string; queryInput: TInput } => {
      // Dev-mode guard: warn if tableId is set but component is still being
      // server-rendered. This means the host page.tsx is missing `ssr: false`
      // in its dynamic() import, causing a localStorage hydration mismatch.
      if (process.env.NODE_ENV === "development" && tableId && typeof window === "undefined") {
        console.error(
          `[useServerTable] tableId="${tableId}" requires ssr:false but this component is being ` +
            "server-rendered. Wrap your page.tsx with:\n" +
            "  const Content = dynamic(() => import('./Content'), { ssr: false });",
        );
      }
      const defaults: DataTableServerParams = {
        search: "",
        filters: [],
        sort: defaultSort,
        page: 1,
        pageSize: defaultPageSize,
      };

      const saved = tableId ? loadTableState(tableId) : null;
      const resolved: DataTableServerParams = saved
        ? {
            search: saved.search,
            filters: [],
            sort: { key: saved.order[0][0], direction: saved.order[0][1] },
            // Restore page — matches Botble behaviour of returning to the last viewed page
            page: saved.page ?? 1,
            pageSize: saved.length,
          }
        : defaults;

      // "restored" when localStorage had state — DataTable will remount with this
      // initialState so its own useState hooks pick up the correct values.
      // "default" when no stored state — DataTable renders with defaults.
      const key = saved ? "restored" : "default";

      return { initialState: resolved, tableKey: key, queryInput: toQueryInput(resolved) };
    },
  );

  // ── Step 2: Mutable queryInput state (updated on every table interaction) ──
  const [queryInput, setQueryInput] = useState<TInput>(initialQueryInput);

  // ── Stabilize toQueryInput reference ─────────────────────────────────────
  const toQueryInputRef = useRef(toQueryInput);
  toQueryInputRef.current = toQueryInput;

  // ── Step 3: Update queryInput + persist on every table interaction ────────
  const onServerChange = useCallback(
    (params: DataTableServerParams) => {
      setQueryInput(toQueryInputRef.current(params));

      if (tableId) {
        saveTableState(tableId, {
          length: params.pageSize,
          // When sort is cleared (direction = null), persist the default sort direction
          // so next reload restores the correct column rather than having no sort at all
          order: [
            [params.sort.key, params.sort.direction ?? defaultSortRef.current.direction ?? "desc"],
          ],
          search: params.search,
          page: params.page,
        });
      }
    },
    // Only `tableId` is a dependency — defaultSortRef and toQueryInputRef are
    // stable ref objects. This callback is guaranteed stable for the component lifetime.
    [tableId],
  );

  return { queryInput, onServerChange, initialState, tableKey };
}
