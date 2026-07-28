import { z } from "zod";

// ── Allowed operators ────────────────────────────────────────────────────────

const ALLOWED_OPERATORS = [
  "contains",
  "notContains",
  "startsWith",
  "endsWith",
  "equals",
  "notEquals",
  "between",
  "betweenInclusive",
  "greaterThan",
  "greaterThanOrEqual",
  "lessThan",
  "lessThanOrEqual",
  "empty",
  "notEmpty",
] as const;

export type FilterOperatorValue = (typeof ALLOWED_OPERATORS)[number];

// ── Zod schema for a single filter item ──────────────────────────────────────

export const filterItemSchema = z.object({
  fieldKey: z.string().min(1).max(100),
  operator: z.enum(ALLOWED_OPERATORS),
  value: z.string().max(1000),
  value2: z.string().max(1000).optional(),
});

export type FilterItem = z.infer<typeof filterItemSchema>;

// ── Reusable filters input schema ────────────────────────────────────────────

export const filtersInputSchema = z.array(filterItemSchema).max(20).optional().default([]);
