import { describe, expect, it, vi } from "vitest";
import { WebhookService } from "../WebhookService";

// biome-ignore lint/suspicious/noExplicitAny: vitest mock repository requires any casting to bypass private property class assignability checks
function createMockRepo(): any {
  return {
    findMany: vi.fn(),
    findById: vi.fn(),
    findByEvent: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    createLog: vi.fn(),
    findLogs: vi.fn(),
    cascadeDeleteOwner: vi.fn(),
    incrementFailureCount: vi.fn(),
    resetFailureCount: vi.fn(),
    rotateSecret: vi.fn(),
  };
}

describe("WebhookService", () => {
  describe("getAvailableEvents", () => {
    it("should return a list of available events", () => {
      const repo = createMockRepo();
      const service = new WebhookService({ webhookRepo: repo });

      const events = service.getAvailableEvents();
      expect(events).toBeInstanceOf(Array);
      expect(events.length).toBeGreaterThan(0);
      expect(events).toContain("post.published");
      expect(events).toContain("member.registered");
    });
  });

  describe("getWebhook", () => {
    it("should return webhook when found", async () => {
      const repo = createMockRepo();
      const service = new WebhookService({ webhookRepo: repo });

      const mockWebhook = { id: 1, name: "Test", url: "https://example.com" };
      repo.findById.mockResolvedValue(mockWebhook);

      const result = await service.getWebhook(1);
      expect(result).toEqual(mockWebhook);
    });

    it("should throw NotFound when webhook does not exist", async () => {
      const repo = createMockRepo();
      const service = new WebhookService({ webhookRepo: repo });

      repo.findById.mockResolvedValue(null);

      await expect(service.getWebhook(999)).rejects.toThrow("Webhook not found");
    });
  });

  describe("createWebhook", () => {
    it("should create a webhook", async () => {
      const repo = createMockRepo();
      const service = new WebhookService({ webhookRepo: repo });

      repo.create.mockResolvedValue({ id: 1, name: "My Webhook" });

      const result = await service.createWebhook({
        name: "My Webhook",
        url: "https://example.com/hook",
        events: ["post.published"],
      });

      expect(result).toEqual({ id: 1, name: "My Webhook" });
      expect(repo.create).toHaveBeenCalledWith({
        name: "My Webhook",
        url: "https://example.com/hook",
        events: ["post.published"],
      });
    });
  });

  describe("updateWebhook", () => {
    it("should update an existing webhook", async () => {
      const repo = createMockRepo();
      const service = new WebhookService({ webhookRepo: repo });

      repo.findById.mockResolvedValue({ id: 1, name: "Old Name" });
      repo.update.mockResolvedValue({ id: 1, name: "New Name" });

      const result = await service.updateWebhook(1, { name: "New Name" });
      expect(result).toEqual({ id: 1, name: "New Name" });
    });

    it("should throw NotFound when updating non-existent webhook", async () => {
      const repo = createMockRepo();
      const service = new WebhookService({ webhookRepo: repo });

      repo.findById.mockResolvedValue(null);

      await expect(service.updateWebhook(999, { name: "Test" })).rejects.toThrow(
        "Webhook not found",
      );
    });
  });

  describe("deleteWebhook", () => {
    it("should delete a webhook", async () => {
      const repo = createMockRepo();
      const service = new WebhookService({ webhookRepo: repo });

      repo.findById.mockResolvedValue({ id: 1, name: "Test" });
      repo.remove.mockResolvedValue({ id: 1 });

      await service.deleteWebhook(1);
      expect(repo.remove).toHaveBeenCalledWith(1);
    });

    it("should throw NotFound when deleting non-existent webhook", async () => {
      const repo = createMockRepo();
      const service = new WebhookService({ webhookRepo: repo });

      repo.findById.mockResolvedValue(null);

      await expect(service.deleteWebhook(999)).rejects.toThrow("Webhook not found");
    });
  });

  describe("dispatch", () => {
    it("should skip dispatch when no subscribers", async () => {
      const repo = createMockRepo();
      const service = new WebhookService({ webhookRepo: repo });

      repo.findByEvent.mockResolvedValue([]);

      await service.dispatch("post.published", { id: 1 });
      expect(repo.createLog).not.toHaveBeenCalled();
    });

    it("should dispatch to subscribed webhooks", async () => {
      const repo = createMockRepo();
      const service = new WebhookService({ webhookRepo: repo });

      const mockWebhook = {
        id: 1,
        url: "https://httpbin.org/post",
        secret: null,
        retries: 1,
        timeout: 5,
        isActive: true,
        apiVersion: "2026-07-16",
      };
      repo.findById.mockResolvedValue(mockWebhook);
      repo.createLog.mockResolvedValue({ id: 1 });

      // Mock fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: () => Promise.resolve("OK"),
      });
      vi.stubGlobal("fetch", mockFetch);

      await service.executeWebhookDelivery(1, "post.published", { id: 1, title: "Test" });

      expect(mockFetch).toHaveBeenCalled();
      vi.unstubAllGlobals();
    });
  });

  describe("getWebhookLogs", () => {
    it("should return logs for a webhook", async () => {
      const repo = createMockRepo();
      const service = new WebhookService({ webhookRepo: repo });

      const mockLogs = [{ id: 1, event: "post.published", success: true, createdAt: new Date() }];
      repo.findLogs.mockResolvedValue(mockLogs);

      const result = await service.getWebhookLogs(1);
      expect(result).toEqual(mockLogs);
    });
  });

  describe("rotateWebhookSecret", () => {
    it("should rotate secret and pass old secret", async () => {
      const repo = createMockRepo();
      const service = new WebhookService({ webhookRepo: repo });

      repo.findById.mockResolvedValue({ id: 1, secret: "old_secret_val" });
      repo.rotateSecret.mockResolvedValue({ id: 1, secret: "new_secret_val" });

      const newSecret = await service.rotateWebhookSecret(1);
      expect(newSecret).toBeDefined();
      expect(repo.rotateSecret).toHaveBeenCalledWith(1, expect.any(String), "old_secret_val");
    });
  });

  describe("buildWebhookHeaders - dual signatures", () => {
    it("should generate dual signatures if within 15-minute grace period", async () => {
      const repo = createMockRepo();
      const service = new WebhookService({ webhookRepo: repo });

      // biome-ignore lint/suspicious/noExplicitAny: access private buildWebhookHeaders method for test purposes
      const headers = await (service as any).buildWebhookHeaders(
        "order.created",
        "2026-07-16T12:00:00.000Z",
        '{"id":"evt_123"}',
        "new_sec",
        "old_sec",
        new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
      );

      expect(headers["X-Webhook-Signature"]).toBeDefined();
      expect(headers["X-Webhook-Signature-Legacy"]).toBeDefined();
      expect(headers["X-Webhook-Signature"]).not.toEqual(headers["X-Webhook-Signature-Legacy"]);
    });

    it("should NOT generate legacy signature if beyond 15 minutes", async () => {
      const repo = createMockRepo();
      const service = new WebhookService({ webhookRepo: repo });

      // biome-ignore lint/suspicious/noExplicitAny: access private buildWebhookHeaders method for test purposes
      const headers = await (service as any).buildWebhookHeaders(
        "order.created",
        "2026-07-16T12:00:00.000Z",
        '{"id":"evt_123"}',
        "new_sec",
        "old_sec",
        new Date(Date.now() - 20 * 60 * 1000), // 20 mins ago
      );

      expect(headers["X-Webhook-Signature"]).toBeDefined();
      expect(headers["X-Webhook-Signature-Legacy"]).toBeUndefined();
    });
  });
});
