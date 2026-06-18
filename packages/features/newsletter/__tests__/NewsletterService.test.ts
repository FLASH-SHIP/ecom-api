import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Subscriber } from "../NewsletterService";
import { NewsletterService } from "../NewsletterService";

function createMockDeps() {
  return {
    findSubscriberByEmail: vi.fn(),
    createSubscriber: vi.fn(),
    updateSubscriber: vi.fn(),
    findActiveSubscribers: vi.fn().mockResolvedValue([]),
    countActiveSubscribers: vi.fn().mockResolvedValue(0),
  };
}

const mockSubscriber = (overrides: Partial<Subscriber> = {}): Subscriber => ({
  id: 1,
  email: "test@example.com",
  name: null,
  status: "active",
  subscribedAt: new Date(),
  unsubscribedAt: null,
  metadata: null,
  ...overrides,
});

describe("NewsletterService", () => {
  let deps: ReturnType<typeof createMockDeps>;
  let service: NewsletterService;

  beforeEach(() => {
    deps = createMockDeps();
    service = new NewsletterService(deps);
  });

  describe("subscribe", () => {
    it("should create new subscriber", async () => {
      deps.findSubscriberByEmail.mockResolvedValue(null);
      deps.createSubscriber.mockResolvedValue(mockSubscriber());

      const result = await service.subscribe("test@example.com");
      expect(result.status).toBe("active");
      expect(deps.createSubscriber).toHaveBeenCalled();
    });

    it("should return existing active subscriber without changes", async () => {
      deps.findSubscriberByEmail.mockResolvedValue(mockSubscriber());

      const result = await service.subscribe("test@example.com");
      expect(result.status).toBe("active");
      expect(deps.createSubscriber).not.toHaveBeenCalled();
    });

    it("should re-activate unsubscribed subscriber", async () => {
      deps.findSubscriberByEmail.mockResolvedValue(mockSubscriber({ status: "unsubscribed" }));
      deps.updateSubscriber.mockResolvedValue(mockSubscriber({ status: "active" }));

      const result = await service.subscribe("test@example.com");
      expect(result.status).toBe("active");
      expect(deps.updateSubscriber).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: "active" }),
      );
    });

    it("should normalize email", async () => {
      deps.findSubscriberByEmail.mockResolvedValue(null);
      deps.createSubscriber.mockResolvedValue(mockSubscriber());

      await service.subscribe("  TEST@EXAMPLE.COM  ");
      expect(deps.findSubscriberByEmail).toHaveBeenCalledWith("test@example.com");
    });
  });

  describe("unsubscribe", () => {
    it("should unsubscribe active subscriber", async () => {
      deps.findSubscriberByEmail.mockResolvedValue(mockSubscriber());
      deps.updateSubscriber.mockResolvedValue(mockSubscriber({ status: "unsubscribed" }));

      await service.unsubscribe("test@example.com");
      expect(deps.updateSubscriber).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ status: "unsubscribed" }),
      );
    });

    it("should throw when subscriber not found", async () => {
      deps.findSubscriberByEmail.mockResolvedValue(null);

      await expect(service.unsubscribe("notfound@example.com")).rejects.toThrow();
    });

    it("should be idempotent for already unsubscribed", async () => {
      deps.findSubscriberByEmail.mockResolvedValue(mockSubscriber({ status: "unsubscribed" }));

      await service.unsubscribe("test@example.com");
      expect(deps.updateSubscriber).not.toHaveBeenCalled();
    });
  });

  describe("getStats", () => {
    it("should return active subscriber count", async () => {
      deps.countActiveSubscribers.mockResolvedValue(42);
      const stats = await service.getStats();
      expect(stats.totalActive).toBe(42);
    });
  });
});
