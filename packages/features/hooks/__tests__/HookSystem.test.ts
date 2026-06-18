import { beforeEach, describe, expect, it, vi } from "vitest";

// Reset module between tests
let hooks: typeof import("../HookSystem").hooks;

describe("HookSystem", () => {
  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../HookSystem");
    hooks = mod.hooks;
  });

  it("should execute actions in priority order", async () => {
    const order: number[] = [];

    hooks.addAction(
      "test.action",
      () => {
        order.push(2);
      },
      20,
    );
    hooks.addAction(
      "test.action",
      () => {
        order.push(1);
      },
      10,
    );
    hooks.addAction(
      "test.action",
      () => {
        order.push(3);
      },
      30,
    );

    await hooks.doAction("test.action");
    expect(order).toEqual([1, 2, 3]);
  });

  it("should apply filters and transform value", async () => {
    hooks.addFilter<string>("test.filter", (value) => `${value}-filtered`);
    hooks.addFilter<string>("test.filter", (value) => `${value}-again`);

    const result = await hooks.applyFilters("test.filter", "hello");
    expect(result).toBe("hello-filtered-again");
  });

  it("should not crash on action errors", async () => {
    hooks.addAction("test.error", () => {
      throw new Error("boom");
    });
    hooks.addAction("test.error", () => {});

    await expect(hooks.doAction("test.error")).resolves.not.toThrow();
  });

  it("should return original value when no filters registered", async () => {
    const result = await hooks.applyFilters("nonexistent", "original");
    expect(result).toBe("original");
  });

  it("should report registered hooks", () => {
    hooks.addAction("test.a", () => {});
    hooks.addFilter("test.f", (v) => v);

    const registered = hooks.getRegisteredHooks();
    expect(registered.actions).toContain("test.a");
    expect(registered.filters).toContain("test.f");
  });

  it("should remove actions/filters", () => {
    hooks.addAction("test.remove", () => {});
    expect(hooks.hasAction("test.remove")).toBe(true);

    hooks.removeAction("test.remove");
    expect(hooks.hasAction("test.remove")).toBe(false);
  });
});
