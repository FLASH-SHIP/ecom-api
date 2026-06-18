import type { ActiveFilter, FilterFieldDef } from "./types";

// ── Operators that require no value ──────────────────────────────────────────

const NO_VALUE_OPS = new Set(["empty", "notEmpty"]);
const BETWEEN_OPS = new Set(["between", "betweenInclusive"]);

// ── Validation result ────────────────────────────────────────────────────────

export interface FilterValidation {
  isValid: boolean;
  /** Which part of the filter row has the error */
  errorField?: "value" | "value2" | "both";
}

// ── Per-filter validation ────────────────────────────────────────────────────

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: validation logic branches across operator types (no-value, between, single) and value types
export function validateFilter(
  filter: ActiveFilter,
  fieldDefs: FilterFieldDef[],
): FilterValidation {
  // Incomplete row — not an error, just skip-able
  if (!filter.fieldKey || !filter.operator) {
    return { isValid: false };
  }

  // Operators that require no value at all
  if (NO_VALUE_OPS.has(filter.operator)) {
    return { isValid: true };
  }

  const field = fieldDefs.find((f) => f.key === filter.fieldKey);
  const fieldType = field?.type ?? "text";

  // Between operators need both value and value2
  if (BETWEEN_OPS.has(filter.operator)) {
    const v1Valid = isValueValid(filter.value, fieldType);
    const v2Valid = isValueValid(filter.value2, fieldType);

    if (!v1Valid && !v2Valid) return { isValid: false, errorField: "both" };
    if (!v1Valid) return { isValid: false, errorField: "value" };
    if (!v2Valid) return { isValid: false, errorField: "value2" };

    // For number between: min should be <= max
    if (fieldType === "number") {
      const n1 = Number(filter.value);
      const n2 = Number(filter.value2);
      if (n1 > n2) return { isValid: false, errorField: "both" };
    }

    return { isValid: true };
  }

  // Single-value operators
  if (!isValueValid(filter.value, fieldType)) {
    return { isValid: false, errorField: "value" };
  }

  return { isValid: true };
}

// ── Value validation by type ─────────────────────────────────────────────────

function isValueValid(
  value: string | undefined,
  fieldType: "text" | "number" | "select" | "date",
): boolean {
  if (!value?.trim()) return false;

  switch (fieldType) {
    case "number":
      return !Number.isNaN(Number(value.trim()));
    case "date": {
      const d = new Date(value.trim());
      return !Number.isNaN(d.getTime());
    }
    default:
      return true;
  }
}

// ── Filter-list level: extract only valid, submittable filters ───────────────

export function getValidFilters(
  filters: ActiveFilter[],
  fieldDefs: FilterFieldDef[],
): ActiveFilter[] {
  return filters.filter((f) => validateFilter(f, fieldDefs).isValid);
}

// ── Check if a filter is "complete enough" to apply ──────────────────────────
// A filter row is considered "incomplete" (not an error) if no field is selected.
// A filter row is "invalid" if a field is selected but the value is wrong/missing.

export function isFilterIncomplete(filter: ActiveFilter): boolean {
  return !filter.fieldKey || !filter.operator;
}
