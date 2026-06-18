import { describe, expect, it } from "vitest";
import { BrokenLinkChecker } from "../BrokenLinkChecker";

const mockDeps = {
  findContentWithLinks: async () => [],
};

describe("BrokenLinkChecker", () => {
  describe("extractUrls", () => {
    const checker = new BrokenLinkChecker(mockDeps);

    it("should extract href URLs", () => {
      const html = '<a href="https://example.com/page">Link</a>';
      expect(checker.extractUrls(html)).toEqual(["https://example.com/page"]);
    });

    it("should extract src URLs", () => {
      const html = '<img src="https://cdn.example.com/image.png">';
      expect(checker.extractUrls(html)).toEqual(["https://cdn.example.com/image.png"]);
    });

    it("should deduplicate URLs", () => {
      const html = '<a href="https://example.com">A</a><a href="https://example.com">B</a>';
      expect(checker.extractUrls(html)).toEqual(["https://example.com"]);
    });

    it("should ignore relative URLs", () => {
      const html = '<a href="/relative/path">Link</a>';
      expect(checker.extractUrls(html)).toEqual([]);
    });

    it("should handle multiple URLs", () => {
      const html =
        '<a href="https://a.com">A</a><img src="https://b.com/img.jpg"><a href="https://c.com">C</a>';
      expect(checker.extractUrls(html)).toHaveLength(3);
    });

    it("should handle empty content", () => {
      expect(checker.extractUrls("")).toEqual([]);
    });

    it("should handle single-quoted attributes", () => {
      const html = "<a href='https://example.com'>Link</a>";
      expect(checker.extractUrls(html)).toEqual(["https://example.com"]);
    });
  });
});
