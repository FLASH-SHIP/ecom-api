import { describe, expect, it } from "vitest";
import { normalizePagination, paginate } from "../pagination";

describe("pagination", () => {
  describe("paginate()", () => {
    it("should return correct meta for first page", () => {
      const result = paginate(["a", "b", "c"], 10, 1, 3);

      expect(result.data).toEqual(["a", "b", "c"]);
      expect(result.meta).toEqual({
        total: 10,
        page: 1,
        perPage: 3,
        lastPage: 4,
        hasNextPage: true,
        hasPrevPage: false,
      });
    });

    it("should return correct meta for last page", () => {
      const result = paginate(["j"], 10, 4, 3);

      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPrevPage).toBe(true);
      expect(result.meta.lastPage).toBe(4);
    });

    it("should handle empty results", () => {
      const result = paginate([], 0, 1, 20);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.lastPage).toBe(1);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPrevPage).toBe(false);
    });

    it("should handle single page", () => {
      const result = paginate([1, 2, 3], 3, 1, 20);

      expect(result.meta.lastPage).toBe(1);
      expect(result.meta.hasNextPage).toBe(false);
    });
  });

  describe("normalizePagination()", () => {
    it("should return defaults when no input", () => {
      const result = normalizePagination();

      expect(result.page).toBe(1);
      expect(result.perPage).toBe(20);
      expect(result.skip).toBe(0);
    });

    it("should calculate skip correctly", () => {
      const result = normalizePagination({ page: 3, perPage: 10 });

      expect(result.skip).toBe(20);
    });

    it("should cap perPage at MAX_PER_PAGE", () => {
      const result = normalizePagination({ perPage: 999 });

      expect(result.perPage).toBe(100);
    });

    it("should not allow page < 1", () => {
      const result = normalizePagination({ page: -5 });

      expect(result.page).toBe(1);
      expect(result.skip).toBe(0);
    });
  });
});
