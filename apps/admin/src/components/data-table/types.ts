import type { ReactNode } from "react";

// ── Sort ─────────────────────────────────────────────────────────────────────

export type SortDirection = "asc" | "desc" | null;

export interface SortState {
  key: string;
  direction: SortDirection;
}

// ── Filter ────────────────────────────────────────────────────────────────────

export interface FilterOperator {
  value: string;
  /** i18n key suffix — resolved via dataTable.filter.operators.<value> */
  label: string;
}

export interface FilterFieldDef {
  key: string;
  label: string;
  /** "text" = free text, "number" = numeric, "select" = fixed options, "date" = date comparison */
  type?: "text" | "number" | "select" | "date";
  operators?: FilterOperator[];
  /** For type="select": available options */
  options?: { label: string; value: string }[];
}

export interface ActiveFilter {
  /** Stable unique ID for this filter row (crypto.randomUUID) */
  id: string;
  fieldKey: string;
  operator: string;
  value: string;
  /** Second value for between/betweenInclusive operators (max bound) */
  value2?: string;
}

// ── Server-driven mode ────────────────────────────────────────────────────────

/**
 * Parameters emitted by DataTable in server-driven mode.
 * The parent component maps these to its API query.
 */
export interface DataTableServerParams {
  search: string;
  filters: ActiveFilter[];
  sort: SortState;
  page: number;
  pageSize: number;
}

// ── Columns ───────────────────────────────────────────────────────────────────

export interface ColumnDef<T> {
  /** Unique key; also used for sort */
  key: string;
  label: string;
  sortable?: boolean;
  width?: string | number;
  align?: "left" | "center" | "right";
  render: (row: T, index: number) => ReactNode;
}

// ── Actions ───────────────────────────────────────────────────────────────────

export interface RowAction<T> {
  key: string;
  tooltip: string;
  icon: ReactNode;
  onClick: (row: T) => void;
  color?: "default" | "primary" | "error" | "warning" | "info" | "success";
  disabled?: (row: T) => boolean;
  hidden?: (row: T) => boolean;
}

export interface BulkActionItem<T> {
  key: string;
  label: string;
  onClick: (selectedRows: T[]) => void | Promise<void>;
  variant?: "default" | "danger";
  disabled?: boolean;
}

export interface BulkAction<T> {
  key: string;
  label: string;
  /** Sub-items → rendered as nested submenu (like Botble's "Thay đổi hàng loạt") */
  children?: BulkActionItem<T>[];
  /** Direct action (no children) */
  onClick?: (selectedRows: T[]) => void | Promise<void>;
  variant?: "default" | "danger";
}

// ── DataTable props ───────────────────────────────────────────────────────────

export interface DataTableProps<T extends { id: number | string }> {
  rows: T[];
  columns: ColumnDef<T>[];
  /** Inline icon buttons at end of each row */
  rowActions?: RowAction<T>[];
  /** Top-left "Hành động" dropdown items */
  bulkActions?: BulkAction<T>[];
  /** Fields available in the filter panel */
  filterFields?: FilterFieldDef[];
  isLoading?: boolean;
  searchPlaceholder?: string;
  /** Return true if row matches the search query (CLIENT mode only) */
  searchFn?: (row: T, query: string) => boolean;
  /** Return true if row matches all active filters (CLIENT mode only) */
  filterFn?: (row: T, filters: ActiveFilter[]) => boolean;
  /** Custom sort; defaults to locale-aware string / numeric sort (CLIENT mode only) */
  sortFn?: (a: T, b: T, sort: SortState) => number;
  /** Rendered in top-right of toolbar: Create button, Import, Reload, etc. */
  toolbarActions?: ReactNode;
  /** Shown when rows is empty after filtering */
  emptyState?: ReactNode;
  /** Default sort on mount */
  defaultSort?: SortState;
  /**
   * Pre-populate DataTable's internal state (search, filters, sort, page, pageSize).
   * Use with `useServerTable` so the DataTable starts in sync with the page's initial query.
   */
  initialState?: Partial<DataTableServerParams>;

  // ── Server-driven mode ───────────────────────────────────────────────────
  /**
   * When provided, DataTable runs in SERVER mode:
   * - rows are passed directly (already filtered/sorted by BE)
   * - search/filter/sort/page changes emit this callback (debounced for search)
   * - client-side searchFn / filterFn / sortFn are ignored
   */
  onServerChange?: (params: DataTableServerParams) => void;
  /** Total record count from the server (for pagination footer) */
  serverTotalCount?: number;
  /** Default page size (server mode). Default: 25 */
  defaultPageSize?: number;
}
