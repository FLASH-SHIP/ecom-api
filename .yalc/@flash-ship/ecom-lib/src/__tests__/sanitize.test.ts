import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  sanitizeEmail,
  sanitizeHtml,
  sanitizePlainText,
  sanitizeSearchQuery,
  sanitizeSlug,
  sanitizeUrl,
  stripTags,
} from "../sanitize";

describe("stripTags", () => {
  it("should remove all HTML tags", () => {
    expect(stripTags("<b>bold</b>")).toBe("bold");
    expect(stripTags('<a href="x">link</a>')).toBe("link");
    expect(stripTags("no tags")).toBe("no tags");
  });

  it("should handle nested tags", () => {
    expect(stripTags("<div><p>text</p></div>")).toBe("text");
  });
});

describe("escapeHtml", () => {
  it("should escape special characters", () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;",
    );
  });

  it("should escape ampersands", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("should escape single quotes", () => {
    expect(escapeHtml("it's")).toBe("it&#39;s");
  });
});

describe("sanitizeHtml", () => {
  it("should remove script tags", () => {
    expect(sanitizeHtml('<p>safe</p><script>alert("xss")</script>')).toBe("<p>safe</p>");
  });

  it("should remove event handlers", () => {
    expect(sanitizeHtml('<img src="x" onerror="alert(1)">')).toBe('<img src="x">');
  });

  it("should remove javascript: protocol", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">click</a>')).toBe(
      '<a href="alert(1)">click</a>',
    );
  });

  it("should remove style tags", () => {
    expect(sanitizeHtml("<style>body{display:none}</style><p>ok</p>")).toBe("<p>ok</p>");
  });

  it("should remove iframe tags", () => {
    expect(sanitizeHtml('<iframe src="evil.com"></iframe><p>ok</p>')).toBe("<p>ok</p>");
  });
});

describe("sanitizePlainText", () => {
  it("should strip tags and normalize whitespace", () => {
    expect(sanitizePlainText("  <b>Hello</b>   World  ")).toBe("Hello World");
  });

  it("should handle empty string", () => {
    expect(sanitizePlainText("")).toBe("");
  });
});

describe("sanitizeSlug", () => {
  it("should lowercase and replace invalid chars", () => {
    expect(sanitizeSlug("Hello World!")).toBe("hello-world");
  });

  it("should collapse multiple hyphens", () => {
    expect(sanitizeSlug("foo---bar")).toBe("foo-bar");
  });

  it("should trim hyphens", () => {
    expect(sanitizeSlug("-foo-bar-")).toBe("foo-bar");
  });

  it("should limit length", () => {
    const long = "a".repeat(300);
    expect(sanitizeSlug(long).length).toBeLessThanOrEqual(200);
  });
});

describe("sanitizeEmail", () => {
  it("should trim and lowercase", () => {
    expect(sanitizeEmail("  User@Example.COM  ")).toBe("user@example.com");
  });
});

describe("sanitizeSearchQuery", () => {
  it("should strip tags and limit length", () => {
    expect(sanitizeSearchQuery('<script>alert("x")</script>hello')).toBe('alert("x")hello');
  });

  it("should respect max length", () => {
    expect(sanitizeSearchQuery("a".repeat(300), 100).length).toBe(100);
  });
});

describe("sanitizeUrl", () => {
  it("should accept valid http URLs", () => {
    expect(sanitizeUrl("https://example.com/path")).toBe("https://example.com/path");
  });

  it("should reject javascript: URLs", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
  });

  it("should reject invalid URLs", () => {
    expect(sanitizeUrl("not-a-url")).toBeNull();
  });

  it("should trim whitespace", () => {
    expect(sanitizeUrl("  https://example.com  ")).toBe("https://example.com/");
  });
});
