import { describe, expect, it } from "vitest";
import { BaseTransformer } from "../transformers/BaseTransformer";

class MockTransformer extends BaseTransformer<number, string> {
  transform(item: number): string {
    return `item-${item}`;
  }
}

describe("BaseTransformer", () => {
  const transformer = new MockTransformer();

  it("should transform a single item", () => {
    expect(transformer.transformItem(5)).toBe("item-5");
  });

  it("should transform a collection of items", () => {
    expect(transformer.transformCollection([1, 2, 3])).toEqual(["item-1", "item-2", "item-3"]);
  });

  it("should transform paginated results", () => {
    const paginated = {
      data: [10, 20],
      meta: {
        total: 100,
        page: 1,
        perPage: 2,
        extraMeta: "test",
      },
    };

    const result = transformer.transformPaginated(paginated);

    expect(result.data).toEqual(["item-10", "item-20"]);
    expect(result.meta).toEqual({
      total: 100,
      page: 1,
      perPage: 2,
      extraMeta: "test",
    });
  });
});
