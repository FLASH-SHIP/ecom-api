import { describe, expect, it, vi } from "vitest";
import type { WebhookRepository } from "../../repositories/WebhookRepository";
import { WebhookService } from "../WebhookService";

function createMockRepo() {
  return {
    findMany: vi.fn(),
    findById: vi.fn(),
    findByEvent: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    createLog: vi.fn(),
    findLogs: vi.fn(),
  } as unknown as WebhookRepository & Record<string, ReturnType<typeof vi.fn>>;
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
      };
      repo.findByEvent.mockResolvedValue([mockWebhook]);
      repo.createLog.mockResolvedValue({ id: 1 });

      // Mock fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });
      vi.stubGlobal("fetch", mockFetch);

      await service.dispatch("post.published", { id: 1, title: "Test" });

      // Wait for async dispatch
      await new Promise((resolve) => setTimeout(resolve, 100));

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
});
