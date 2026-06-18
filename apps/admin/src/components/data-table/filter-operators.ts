import type { FilterOperator } from "./types";

// ── Operator Icon Mapping (matches the admin theme) ─────────────────────────

export const OPERATOR_ICONS: Record<string, string> = {
  contains: "∋",
  notContains: "∌",
  startsWith: "a⋯",
  endsWith: "⋯z",
  equals: "=",
  notEquals: "≠",
  between: "⇿",
  betweenInclusive: "⬌",
  greaterThan: ">",
  greaterThanOrEqual: "≥",
  lessThan: "<",
  lessThanOrEqual: "≤",
  empty: "∅",
  notEmpty: "∅̸",
};

// Operators that are the last item in their visual group (separator rendered after them)
export const OPERATOR_GROUP_ENDS = new Set([
  "endsWith",
  "notEquals",
  "betweenInclusive",
  "lessThanOrEqual",
]);

// ── Operator Definitions ─────────────────────────────────────────────────────

function op(value: string): FilterOperator {
  return { value, label: value };
}

// ── Default Operators by Field Type ──────────────────────────────────────────

export const TEXT_OPERATORS: FilterOperator[] = [
  op("contains"),
  op("notContains"),
  op("startsWith"),
  op("endsWith"),
  op("equals"),
  op("notEquals"),
  op("between"),
  op("betweenInclusive"),
  op("greaterThan"),
  op("greaterThanOrEqual"),
  op("lessThan"),
  op("lessThanOrEqual"),
  op("empty"),
  op("notEmpty"),
];

export const NUMBER_OPERATORS: FilterOperator[] = [
  op("equals"),
  op("notEquals"),
  op("between"),
  op("betweenInclusive"),
  op("greaterThan"),
  op("greaterThanOrEqual"),
  op("lessThan"),
  op("lessThanOrEqual"),
  op("empty"),
  op("notEmpty"),
];

export const DATE_OPERATORS: FilterOperator[] = [
  op("equals"),
  op("between"),
  op("betweenInclusive"),
  op("greaterThan"),
  op("greaterThanOrEqual"),
  op("lessThan"),
  op("lessThanOrEqual"),
  op("empty"),
  op("notEmpty"),
];

export const SELECT_OPERATORS: FilterOperator[] = [
  op("equals"),
  op("notEquals"),
  op("empty"),
  op("notEmpty"),
];

// ── Helper: get default operators for a field type ───────────────────────────

export function getDefaultOperators(
  fieldType: "text" | "number" | "select" | "date" | undefined,
): FilterOperator[] {
  switch (fieldType) {
    case "number":
      return NUMBER_OPERATORS;
    case "date":
      return DATE_OPERATORS;
    case "select":
      return SELECT_OPERATORS;
    default:
      return TEXT_OPERATORS;
  }
}
