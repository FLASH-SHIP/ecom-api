import { describe, expect, it } from "vitest";
import { buildPrismaWhere, type FilterFieldConfigMap } from "../buildPrismaWhere";

// ── Test field config ────────────────────────────────────────────────────────

const FIELDS: FilterFieldConfigMap = {
  title: { prismaField: "title", type: "string" },
  name: { prismaField: "name", type: "string" },
  id: { prismaField: "id", type: "number" },
  amount: { prismaField: "amount", type: "number" },
  status: { prismaField: "status", type: "enum" },
  createdAt: { prismaField: "createdAt", type: "date" },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function filter(fieldKey: string, operator: string, value: string, value2?: string) {
  // biome-ignore lint/suspicious/noExplicitAny: test helper
  return { fieldKey, operator, value, ...(value2 != null ? { value2 } : {}) } as any;
}

function utcDate(yyyy_mm_dd: string): Date {
  return new Date(`${yyyy_mm_dd}T00:00:00.000Z`);
}

function endOfDay(yyyy_mm_dd: string): Date {
  return new Date(utcDate(yyyy_mm_dd).getTime() + 86_399_999);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("buildPrismaWhere", () => {
  // ── Empty / edge cases ───────────────────────────────────────────────────

  describe("edge cases", () => {
    it("returns {} for empty filters array", () => {
      expect(buildPrismaWhere([], FIELDS)).toEqual({});
    });

    it("ignores unknown fields (security: no injection)", () => {
      const result = buildPrismaWhere([filter("hackField", "equals", "DROP TABLE")], FIELDS);
      expect(result).toEqual({});
    });

    it("ignores filters with empty value (except empty/notEmpty)", () => {
      const result = buildPrismaWhere(
        [filter("title", "contains", ""), filter("title", "contains", "   ")],
        FIELDS,
      );
      expect(result).toEqual({});
    });

    it("ignores invalid number values", () => {
      const result = buildPrismaWhere([filter("id", "equals", "not-a-number")], FIELDS);
      expect(result).toEqual({});
    });

    it("ignores invalid date values", () => {
      const result = buildPrismaWhere([filter("createdAt", "equals", "not-a-date")], FIELDS);
      expect(result).toEqual({});
    });

    it("returns single condition without AND wrapper for 1 filter", () => {
      const result = buildPrismaWhere([filter("title", "equals", "hello")], FIELDS);
      expect(result).toEqual({ title: "hello" });
      expect(result).not.toHaveProperty("AND");
    });

    it("wraps multiple conditions in AND", () => {
      const result = buildPrismaWhere(
        [filter("title", "equals", "hello"), filter("id", "equals", "42")],
        FIELDS,
      );
      expect(result).toEqual({
        AND: [{ title: "hello" }, { id: 42 }],
      });
    });
  });

  // ── String operators ─────────────────────────────────────────────────────

  describe("string operators", () => {
    it("contains → case-insensitive LIKE", () => {
      expect(buildPrismaWhere([filter("title", "contains", "hello")], FIELDS)).toEqual({
        title: { contains: "hello", mode: "insensitive" },
      });
    });

    it("notContains → NOT contains", () => {
      expect(buildPrismaWhere([filter("title", "notContains", "hello")], FIELDS)).toEqual({
        NOT: { title: { contains: "hello", mode: "insensitive" } },
      });
    });

    it("startsWith", () => {
      expect(buildPrismaWhere([filter("title", "startsWith", "he")], FIELDS)).toEqual({
        title: { startsWith: "he", mode: "insensitive" },
      });
    });

    it("endsWith", () => {
      expect(buildPrismaWhere([filter("title", "endsWith", "lo")], FIELDS)).toEqual({
        title: { endsWith: "lo", mode: "insensitive" },
      });
    });

    it("equals (string) → exact match", () => {
      expect(buildPrismaWhere([filter("title", "equals", "exact")], FIELDS)).toEqual({
        title: "exact",
      });
    });

    it("notEquals (string)", () => {
      expect(buildPrismaWhere([filter("title", "notEquals", "bad")], FIELDS)).toEqual({
        title: { not: "bad" },
      });
    });

    it("startsWith returns null for number type", () => {
      expect(buildPrismaWhere([filter("id", "startsWith", "1")], FIELDS)).toEqual({});
    });

    it("contains works on enum type", () => {
      expect(buildPrismaWhere([filter("status", "contains", "PUB")], FIELDS)).toEqual({
        status: { contains: "PUB", mode: "insensitive" },
      });
    });
  });

  // ── Number operators ─────────────────────────────────────────────────────

  describe("number operators", () => {
    it("equals (number) → coerces string to number", () => {
      expect(buildPrismaWhere([filter("id", "equals", "42")], FIELDS)).toEqual({ id: 42 });
    });

    it("notEquals (number)", () => {
      expect(buildPrismaWhere([filter("id", "notEquals", "42")], FIELDS)).toEqual({
        id: { not: 42 },
      });
    });

    it("greaterThan (number)", () => {
      expect(buildPrismaWhere([filter("id", "greaterThan", "10")], FIELDS)).toEqual({
        id: { gt: 10 },
      });
    });

    it("greaterThanOrEqual (number)", () => {
      expect(buildPrismaWhere([filter("id", "greaterThanOrEqual", "10")], FIELDS)).toEqual({
        id: { gte: 10 },
      });
    });

    it("lessThan (number)", () => {
      expect(buildPrismaWhere([filter("id", "lessThan", "10")], FIELDS)).toEqual({
        id: { lt: 10 },
      });
    });

    it("lessThanOrEqual (number)", () => {
      expect(buildPrismaWhere([filter("id", "lessThanOrEqual", "10")], FIELDS)).toEqual({
        id: { lte: 10 },
      });
    });

    it("between (number, exclusive)", () => {
      expect(buildPrismaWhere([filter("amount", "between", "10", "100")], FIELDS)).toEqual({
        amount: { gt: 10, lt: 100 },
      });
    });

    it("betweenInclusive (number)", () => {
      expect(buildPrismaWhere([filter("amount", "betweenInclusive", "10", "100")], FIELDS)).toEqual(
        { amount: { gte: 10, lte: 100 } },
      );
    });

    it("between without value2 → ignored", () => {
      expect(buildPrismaWhere([filter("amount", "between", "10")], FIELDS)).toEqual({});
    });

    it("handles decimal numbers", () => {
      expect(buildPrismaWhere([filter("amount", "equals", "3.14")], FIELDS)).toEqual({
        amount: 3.14,
      });
    });

    it("handles negative numbers", () => {
      expect(buildPrismaWhere([filter("amount", "equals", "-5")], FIELDS)).toEqual({ amount: -5 });
    });
  });

  // ── Date operators ───────────────────────────────────────────────────────

  describe("date operators", () => {
    it("equals (date) → gte midnight, lte end of day", () => {
      const result = buildPrismaWhere([filter("createdAt", "equals", "2024-06-15")], FIELDS);
      expect(result).toEqual({
        createdAt: {
          gte: utcDate("2024-06-15"),
          lte: endOfDay("2024-06-15"),
        },
      });
    });

    it("notEquals (date) → NOT in day range", () => {
      const result = buildPrismaWhere([filter("createdAt", "notEquals", "2024-06-15")], FIELDS);
      expect(result).toEqual({
        NOT: {
          createdAt: {
            gte: utcDate("2024-06-15"),
            lte: endOfDay("2024-06-15"),
          },
        },
      });
    });

    it("greaterThan (date) → gte start of next day", () => {
      const result = buildPrismaWhere([filter("createdAt", "greaterThan", "2024-06-15")], FIELDS);
      const nextDay = new Date(utcDate("2024-06-15").getTime() + 86_400_000);
      expect(result).toEqual({ createdAt: { gte: nextDay } });
    });

    it("greaterThanOrEqual (date) → gte midnight", () => {
      const result = buildPrismaWhere(
        [filter("createdAt", "greaterThanOrEqual", "2024-06-15")],
        FIELDS,
      );
      expect(result).toEqual({ createdAt: { gte: utcDate("2024-06-15") } });
    });

    it("lessThan (date) → lte end of previous day", () => {
      const result = buildPrismaWhere([filter("createdAt", "lessThan", "2024-06-15")], FIELDS);
      const endPrev = new Date(utcDate("2024-06-15").getTime() - 1);
      expect(result).toEqual({ createdAt: { lte: endPrev } });
    });

    it("lessThanOrEqual (date) → lte end of day", () => {
      const result = buildPrismaWhere(
        [filter("createdAt", "lessThanOrEqual", "2024-06-15")],
        FIELDS,
      );
      expect(result).toEqual({
        createdAt: { lte: endOfDay("2024-06-15") },
      });
    });

    it("between (date, exclusive)", () => {
      const result = buildPrismaWhere(
        [filter("createdAt", "between", "2024-01-01", "2024-12-31")],
        FIELDS,
      );
      expect(result).toEqual({
        createdAt: {
          gte: new Date(utcDate("2024-01-01").getTime() + 86_400_000),
          lte: new Date(utcDate("2024-12-31").getTime() - 1),
        },
      });
    });

    it("betweenInclusive (date)", () => {
      const result = buildPrismaWhere(
        [filter("createdAt", "betweenInclusive", "2024-01-01", "2024-12-31")],
        FIELDS,
      );
      expect(result).toEqual({
        createdAt: {
          gte: utcDate("2024-01-01"),
          lte: endOfDay("2024-12-31"),
        },
      });
    });

    it("handles full ISO 8601 datetime strings", () => {
      const result = buildPrismaWhere(
        [filter("createdAt", "greaterThanOrEqual", "2024-06-15T10:30:00.000Z")],
        FIELDS,
      );
      expect(result).toEqual({
        createdAt: { gte: new Date("2024-06-15T10:30:00.000Z") },
      });
    });

    it("trims whitespace from date values", () => {
      const result = buildPrismaWhere([filter("createdAt", "equals", "  2024-06-15  ")], FIELDS);
      expect(result).toEqual({
        createdAt: {
          gte: utcDate("2024-06-15"),
          lte: endOfDay("2024-06-15"),
        },
      });
    });
  });

  // ── Empty / NotEmpty operators ──────────────────────────────────────────

  describe("empty / notEmpty operators", () => {
    it("empty (string) → null OR empty string", () => {
      expect(buildPrismaWhere([filter("title", "empty", "__empty__")], FIELDS)).toEqual({
        OR: [{ title: null }, { title: "" }],
      });
    });

    it("empty (number) → null", () => {
      expect(buildPrismaWhere([filter("id", "empty", "__empty__")], FIELDS)).toEqual({ id: null });
    });

    it("empty (date) → null", () => {
      expect(buildPrismaWhere([filter("createdAt", "empty", "__empty__")], FIELDS)).toEqual({
        createdAt: null,
      });
    });

    it("notEmpty (string) → NOT null AND not empty string", () => {
      expect(buildPrismaWhere([filter("title", "notEmpty", "__empty__")], FIELDS)).toEqual({
        NOT: { title: null },
        title: { not: "" },
      });
    });

    it("notEmpty (number) → NOT null", () => {
      expect(buildPrismaWhere([filter("id", "notEmpty", "__empty__")], FIELDS)).toEqual({
        NOT: { id: null },
      });
    });

    it("notEmpty (date) → NOT null", () => {
      expect(buildPrismaWhere([filter("createdAt", "notEmpty", "__empty__")], FIELDS)).toEqual({
        NOT: { createdAt: null },
      });
    });

    it("empty works regardless of value content", () => {
      expect(buildPrismaWhere([filter("id", "empty", "")], FIELDS)).toEqual({ id: null });
    });
  });

  // ── Enum operators ─────────────────────────────────────────────────────

  describe("enum operators", () => {
    it("equals (enum) → exact match", () => {
      expect(buildPrismaWhere([filter("status", "equals", "PUBLISHED")], FIELDS)).toEqual({
        status: "PUBLISHED",
      });
    });

    it("notEquals (enum)", () => {
      expect(buildPrismaWhere([filter("status", "notEquals", "DRAFT")], FIELDS)).toEqual({
        status: { not: "DRAFT" },
      });
    });

    it("empty (enum) → null", () => {
      expect(buildPrismaWhere([filter("status", "empty", "__empty__")], FIELDS)).toEqual({
        status: null,
      });
    });
  });

  // ── Incompatible operator+type combinations ────────────────────────────

  describe("incompatible operator+type", () => {
    it("startsWith on number → ignored", () => {
      expect(buildPrismaWhere([filter("id", "startsWith", "1")], FIELDS)).toEqual({});
    });

    it("endsWith on number → ignored", () => {
      expect(buildPrismaWhere([filter("id", "endsWith", "1")], FIELDS)).toEqual({});
    });

    it("notContains on number → ignored", () => {
      expect(buildPrismaWhere([filter("id", "notContains", "1")], FIELDS)).toEqual({});
    });

    it("contains on number → ignored", () => {
      expect(buildPrismaWhere([filter("id", "contains", "1")], FIELDS)).toEqual({});
    });
  });

  // ── Multiple filters combined ──────────────────────────────────────────

  describe("combined filters", () => {
    it("combines valid filters, skips invalid ones", () => {
      const result = buildPrismaWhere(
        [
          filter("title", "contains", "test"),
          filter("unknownField", "equals", "hack"),
          filter("id", "greaterThan", "5"),
          filter("status", "equals", "PUBLISHED"),
        ],
        FIELDS,
      );
      expect(result).toEqual({
        AND: [
          { title: { contains: "test", mode: "insensitive" } },
          { id: { gt: 5 } },
          { status: "PUBLISHED" },
        ],
      });
    });

    it("handles duplicate field filters (both applied via AND)", () => {
      const result = buildPrismaWhere(
        [filter("id", "greaterThanOrEqual", "10"), filter("id", "lessThanOrEqual", "100")],
        FIELDS,
      );
      expect(result).toEqual({
        AND: [{ id: { gte: 10 } }, { id: { lte: 100 } }],
      });
    });
  });
});
