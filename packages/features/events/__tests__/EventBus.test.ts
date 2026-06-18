import { beforeEach, describe, expect, it, vi } from "vitest";

let eventBus: typeof import("../EventBus").eventBus;

describe("TypedEventBus", () => {
  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../EventBus");
    eventBus = mod.eventBus;
  });

  it("should emit and receive events with typed payloads", async () => {
    const handler = vi.fn();
    eventBus.on("post.published", handler);

    await eventBus.emit("post.published", {
      postId: 1,
      slug: "hello",
      authorId: 42,
    });

    expect(handler).toHaveBeenCalledWith({
      postId: 1,
      slug: "hello",
      authorId: 42,
    });
  });

  it("should execute handlers in priority order", async () => {
    const order: number[] = [];

    eventBus.on(
      "post.created",
      () => {
        order.push(2);
      },
      20,
    );
    eventBus.on(
      "post.created",
      () => {
        order.push(1);
      },
      10,
    );
    eventBus.on(
      "post.created",
      () => {
        order.push(3);
      },
      30,
    );

    await eventBus.emit("post.created", {
      postId: 1,
      authorId: 1,
      title: "Test",
    });

    expect(order).toEqual([1, 2, 3]);
  });

  it("should support once-listeners that auto-remove", async () => {
    const handler = vi.fn();
    eventBus.once("media.uploaded", handler);

    await eventBus.emit("media.uploaded", {
      fileId: 1,
      fileName: "test.jpg",
      size: 1024,
      uploadedBy: 1,
    });
    await eventBus.emit("media.uploaded", {
      fileId: 2,
      fileName: "test2.jpg",
      size: 2048,
      uploadedBy: 1,
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should return unsubscribe function", async () => {
    const handler = vi.fn();
    const unsub = eventBus.on("comment.created", handler);

    unsub();

    await eventBus.emit("comment.created", {
      commentId: 1,
      postId: 1,
      authorName: "Test",
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("should not crash on handler errors", async () => {
    eventBus.on("post.deleted", () => {
      throw new Error("boom");
    });
    const handler2 = vi.fn();
    eventBus.on("post.deleted", handler2);

    await eventBus.emit("post.deleted", {
      postId: 1,
      authorId: 1,
      permanent: false,
    });

    expect(handler2).toHaveBeenCalled();
  });

  it("should report registered events", () => {
    eventBus.on("post.created", () => {});
    eventBus.on("user.loggedIn", () => {});

    const events = eventBus.getRegisteredEvents();
    expect(events).toContain("post.created");
    expect(events).toContain("user.loggedIn");
  });

  it("should support off() to clear all handlers", () => {
    eventBus.on("cache.cleared", () => {});
    expect(eventBus.hasListeners("cache.cleared")).toBe(true);

    eventBus.off("cache.cleared");
    expect(eventBus.hasListeners("cache.cleared")).toBe(false);
  });
});
