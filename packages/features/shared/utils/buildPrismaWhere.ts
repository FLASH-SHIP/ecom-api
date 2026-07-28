/**
 * Generic Prisma WHERE clause builder from DataTable filter items.
 *
 * Security:
 * - Only fields explicitly listed in `fieldConfig` are allowed (whitelist)
 * - Unknown fields are silently ignored (no error, no injection)
 * - Values are coerced per field type (string→number, string→Date)
 * - Max string length enforced at Zod schema level (filterSchema.ts)
 *
 * Performance:
 * - Single pass through filters array → O(n)
 * - No database calls — pure computation
 */

import type { FilterItem } from "@ecom/trpc-contract/server/shared/filterSchema";

// ── Field Config ─────────────────────────────────────────────────────────────

export interface FilterFieldConfig {
  /** Actual Prisma column name (e.g. "createdAt", "name") */
  prismaField: string;
  /** Data type for value coercion and operator validation */
  type: "string" | "number" | "date" | "enum";
}

export type FilterFieldConfigMap = Record<string, FilterFieldConfig>;

// ── Value coercion ───────────────────────────────────────────────────────────

function coerceValue(
  value: string,
  type: FilterFieldConfig["type"],
): string | number | Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  switch (type) {
    case "number": {
      const num = Number(trimmed);
      return Number.isNaN(num) ? null : num;
    }
    case "date": {
      const raw = new Date(trimmed);
      if (!Number.isNaN(raw.getTime())) return raw;

      const withTime = new Date(`${trimmed}T00:00:00.000Z`);
      return Number.isNaN(withTime.getTime()) ? null : withTime;
    }
    default:
      return trimmed;
  }
}

/** End of day: 23:59:59.999 UTC */
function endOfDay(d: Date): Date {
  return new Date(d.getTime() + 86_399_999);
}

/** Start of next day: 00:00:00.000 UTC */
function startOfNextDay(d: Date): Date {
  return new Date(d.getTime() + 86_400_000);
}

/** End of previous day: 23:59:59.999 UTC */
function endOfPreviousDay(d: Date): Date {
  return new Date(d.getTime() - 1);
}

// ── Operator → Prisma condition mapping ──────────────────────────────────────

type PrismaCondition = Record<string, unknown>;

// ── Null-check operators (no value needed) ───────────────────────────────────

function buildEmptyCondition(
  prismaField: string,
  type: FilterFieldConfig["type"],
): PrismaCondition {
  if (type === "string") {
    return { OR: [{ [prismaField]: null }, { [prismaField]: "" }] };
  }
  return { [prismaField]: null };
}

function buildNotEmptyCondition(
  prismaField: string,
  type: FilterFieldConfig["type"],
): PrismaCondition {
  if (type === "string") {
    return { NOT: { [prismaField]: null }, [prismaField]: { not: "" } };
  }
  return { NOT: { [prismaField]: null } };
}

// ── String pattern operators ─────────────────────────────────────────────────

function buildStringPatternCondition(
  prismaField: string,
  type: FilterFieldConfig["type"],
  operator: string,
  coerced: string | number | Date,
): PrismaCondition | null {
  if (type !== "string" && type !== "enum") return null;
  const str = String(coerced);

  switch (operator) {
    case "contains":
      return { [prismaField]: { contains: str, mode: "insensitive" } };
    case "notContains":
      return { NOT: { [prismaField]: { contains: str, mode: "insensitive" } } };
    case "startsWith":
      return { [prismaField]: { startsWith: str, mode: "insensitive" } };
    case "endsWith":
      return { [prismaField]: { endsWith: str, mode: "insensitive" } };
    default:
      return null;
  }
}

// ── Equality operators ───────────────────────────────────────────────────────

function buildEqualityCondition(
  prismaField: string,
  type: FilterFieldConfig["type"],
  operator: string,
  coerced: string | number | Date,
): PrismaCondition {
  const isDate = type === "date" && coerced instanceof Date;

  if (operator === "equals") {
    if (isDate) {
      return { [prismaField]: { gte: coerced, lte: endOfDay(coerced as Date) } };
    }
    return { [prismaField]: coerced };
  }

  // notEquals
  if (isDate) {
    return { NOT: { [prismaField]: { gte: coerced, lte: endOfDay(coerced as Date) } } };
  }
  return { [prismaField]: { not: coerced } };
}

// ── Comparison operators ─────────────────────────────────────────────────────

function buildComparisonCondition(
  prismaField: string,
  type: FilterFieldConfig["type"],
  operator: string,
  coerced: string | number | Date,
): PrismaCondition {
  const isDate = type === "date" && coerced instanceof Date;

  switch (operator) {
    case "greaterThan":
      return isDate
        ? { [prismaField]: { gte: startOfNextDay(coerced as Date) } }
        : { [prismaField]: { gt: coerced } };
    case "greaterThanOrEqual":
      return { [prismaField]: { gte: coerced } };
    case "lessThan":
      return isDate
        ? { [prismaField]: { lte: endOfPreviousDay(coerced as Date) } }
        : { [prismaField]: { lt: coerced } };
    case "lessThanOrEqual":
      return isDate
        ? { [prismaField]: { lte: endOfDay(coerced as Date) } }
        : { [prismaField]: { lte: coerced } };
    default:
      return { [prismaField]: { gte: coerced } };
  }
}

// ── Between operators ────────────────────────────────────────────────────────

function buildBetweenCondition(
  filter: FilterItem,
  config: FilterFieldConfig,
  coerced: string | number | Date,
): PrismaCondition | null {
  const { prismaField, type } = config;
  const coerced2 = filter.value2 ? coerceValue(filter.value2, type) : null;
  if (coerced2 === null) return null;

  const isInclusive = filter.operator === "betweenInclusive";

  if (type === "date" && coerced instanceof Date && coerced2 instanceof Date) {
    return {
      [prismaField]: {
        gte: isInclusive ? coerced : startOfNextDay(coerced),
        lte: isInclusive ? endOfDay(coerced2) : endOfPreviousDay(coerced2),
      },
    };
  }

  return {
    [prismaField]: isInclusive ? { gte: coerced, lte: coerced2 } : { gt: coerced, lt: coerced2 },
  };
}

// ── Main condition dispatcher ────────────────────────────────────────────────

const STRING_PATTERN_OPS = new Set(["contains", "notContains", "startsWith", "endsWith"]);
const EQUALITY_OPS = new Set(["equals", "notEquals"]);
const COMPARISON_OPS = new Set([
  "greaterThan",
  "greaterThanOrEqual",
  "lessThan",
  "lessThanOrEqual",
]);
const BETWEEN_OPS = new Set(["between", "betweenInclusive"]);

function buildCondition(filter: FilterItem, config: FilterFieldConfig): PrismaCondition | null {
  const { operator } = filter;

  if (operator === "empty") return buildEmptyCondition(config.prismaField, config.type);
  if (operator === "notEmpty") return buildNotEmptyCondition(config.prismaField, config.type);

  const coerced = coerceValue(filter.value, config.type);
  if (coerced === null) return null;

  if (STRING_PATTERN_OPS.has(operator)) {
    return buildStringPatternCondition(config.prismaField, config.type, operator, coerced);
  }
  if (EQUALITY_OPS.has(operator)) {
    return buildEqualityCondition(config.prismaField, config.type, operator, coerced);
  }
  if (COMPARISON_OPS.has(operator)) {
    return buildComparisonCondition(config.prismaField, config.type, operator, coerced);
  }
  if (BETWEEN_OPS.has(operator)) {
    return buildBetweenCondition(filter, config, coerced);
  }

  return null;
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Build a Prisma-compatible `where` clause from an array of filter items.
 *
 * @param filters - Array of filter items from the client
 * @param fieldConfig - Whitelist of allowed fields and their types
 * @returns Prisma `where` object with AND conditions
 *
 * @example
 * ```ts
 * const FIELD_CONFIG = {
 *   title: { prismaField: "title", type: "string" },
 *   id:    { prismaField: "id",    type: "number" },
 * } as const satisfies FilterFieldConfigMap;
 *
 * const where = buildPrismaWhere(input.filters, FIELD_CONFIG);
 * // where = { AND: [{ title: { contains: "foo", mode: "insensitive" } }] }
 * ```
 */
export function buildPrismaWhere(
  filters: FilterItem[],
  fieldConfig: FilterFieldConfigMap,
): Record<string, unknown> {
  const conditions: PrismaCondition[] = [];

  for (const filter of filters) {
    const config = fieldConfig[filter.fieldKey];
    if (!config) continue;

    const condition = buildCondition(filter, config);
    if (condition) {
      conditions.push(condition);
    }
  }

  if (conditions.length === 0) return {};
  // biome-ignore lint/style/noNonNullAssertion: guaranteed by length check above
  if (conditions.length === 1) return conditions[0]!;
  return { AND: conditions };
}
