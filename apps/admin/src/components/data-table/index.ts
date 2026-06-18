// Public API for the DataTable system — components, types, utils, and hooks.

// ── Components ───────────────────────────────────────────────────────────────
export type {
  BulkAction,
  BulkActionConfig,
  BulkChangeField,
  DataTableProps,
  RowAction,
} from "./DataTable";
export { DataTable } from "./DataTable";
export { DataTableSkeleton } from "./DataTableSkeleton";
export { FilterPanel } from "./FilterPanel";
// ── Hooks ────────────────────────────────────────────────────────────────────
export type { UseServerTableResult } from "./hooks/useServerTable";
export { useServerTable } from "./hooks/useServerTable";
// ── Types ────────────────────────────────────────────────────────────────────
export type {
  ActiveFilter,
  BulkActionItem,
  ColumnDef,
  DataTableServerParams,
  FilterFieldDef,
  FilterOperator,
  SortDirection,
  SortState,
} from "./types";

// ── Utils ────────────────────────────────────────────────────────────────────
export type { PersistedTableState } from "./utils";
export {
  clearTableState,
  loadTableState,
  saveTableState,
  toFilterInput,
} from "./utils";
