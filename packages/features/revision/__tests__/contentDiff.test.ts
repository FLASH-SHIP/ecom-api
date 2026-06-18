import { describe, expect, it } from "vitest";
import { computeDiff } from "../utils/contentDiff";

describe("computeDiff", () => {
  it("should detect no changes in identical content", () => {
    const result = computeDiff("Hello\nWorld", "Hello\nWorld", "Title", "Title");
    expect(result.additions).toBe(0);
    expect(result.deletions).toBe(0);
    expect(result.titleChanged).toBe(false);
    expect(result.lines.every((l) => l.type === "unchanged")).toBe(true);
  });

  it("should detect added lines", () => {
    const result = computeDiff("Hello", "Hello\nWorld", "T", "T");
    expect(result.additions).toBe(1);
    expect(result.deletions).toBe(0);
    const added = result.lines.filter((l) => l.type === "added");
    expect(added[0].content).toBe("World");
  });

  it("should detect removed lines", () => {
    const result = computeDiff("Hello\nWorld", "Hello", "T", "T");
    expect(result.deletions).toBe(1);
    expect(result.additions).toBe(0);
  });

  it("should detect changed lines", () => {
    const result = computeDiff("Hello\nWorld", "Hello\nEarth", "T", "T");
    expect(result.additions).toBe(1);
    expect(result.deletions).toBe(1);
  });

  it("should detect title changes", () => {
    const result = computeDiff("content", "content", "Old Title", "New Title");
    expect(result.titleChanged).toBe(true);
    expect(result.oldTitle).toBe("Old Title");
    expect(result.newTitle).toBe("New Title");
  });

  it("should handle empty strings", () => {
    const result = computeDiff("", "Hello", "T", "T");
    expect(result.additions).toBeGreaterThanOrEqual(1);
    expect(result.lines.length).toBeGreaterThan(0);
  });

  it("should handle multi-line diffs", () => {
    const old = "Line 1\nLine 2\nLine 3\nLine 4";
    const updated = "Line 1\nLine 2 modified\nLine 3\nLine 4\nLine 5";
    const result = computeDiff(old, updated, "T", "T");
    expect(result.additions).toBeGreaterThan(0);
    expect(result.lines.length).toBeGreaterThan(0);
  });
});
