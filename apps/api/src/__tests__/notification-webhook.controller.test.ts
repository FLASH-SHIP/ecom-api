import { createHmac } from "node:crypto";
import { BadRequestException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import * as jwt from "jsonwebtoken";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationWebhookController } from "../modules/notification/notification-webhook.controller";

const mockNotificationServiceInstance = {
  addToBlacklist: vi.fn().mockResolvedValue({ id: 1 }),
  addToBlacklistBulk: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@ecom/features/di/containers/NotificationService", () => ({
  getNotificationService: vi.fn(() => mockNotificationServiceInstance),
}));

describe("NotificationWebhookController", () => {
  let controller: NotificationWebhookController;
  let mockConfigService: ConfigService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === "NOTIFICATION_WEBHOOK_SECRET") return "whsec_dGVzdHNlY3JldA=="; // valid base64 dGVzdHNlY3JldA== (testsecret)
        if (key === "NODE_ENV") return "production";
        return null;
      }),
    } as unknown as ConfigService;

    controller = new NotificationWebhookController(mockConfigService);
  });

  it("should verify Svix signature and process bounce event from Resend", async () => {
    const secret = "whsec_dGVzdHNlY3JldA==";
    const body = {
      type: "email.bounced",
      data: {
        to: "bounce@example.com",
      },
    };
    const rawBody = JSON.stringify(body);
    const msgId = "msg_123";
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const toSign = `${msgId}.${timestamp}.${rawBody}`;
    const cleanSecret = secret.slice(6); // dGVzdHNlY3JldA==
    const secretBuffer = Buffer.from(cleanSecret, "base64");
    const hmac = createHmac("sha256", secretBuffer);
    hmac.update(toSign);
    const signatureHex = hmac.digest("hex");
    const signature = `v1,${signatureHex}`;

    const result = await controller.handleWebhook(msgId, timestamp, signature, body);

    expect(result).toEqual({ processedCount: 1 });
    expect(mockNotificationServiceInstance.addToBlacklistBulk).toHaveBeenCalledWith([
      { email: "bounce@example.com", reason: "bounce" },
    ]);
  });

  it("should fail validation if signature is invalid in production", async () => {
    const body = { type: "email.bounced", data: { to: "bounce@example.com" } };
    await expect(
      controller.handleWebhook("msg_123", "123456", "v1,invalidsig", body),
    ).rejects.toThrow(BadRequestException);
  });

  it("should bypass signature check in development if headers are missing", async () => {
    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === "NODE_ENV") return "development";
        return null;
      }),
    } as unknown as ConfigService;
    controller = new NotificationWebhookController(mockConfigService);

    const body = {
      type: "email.complained",
      data: {
        to: ["spam@example.com"],
      },
    };

    const result = await controller.handleWebhook("", "", "", body);
    expect(result).toEqual({ processedCount: 1 });
    expect(mockNotificationServiceInstance.addToBlacklistBulk).toHaveBeenCalledWith([
      { email: "spam@example.com", reason: "complaint" },
    ]);
  });

  it("should support SendGrid webhook payload format", async () => {
    const secret = "whsec_dGVzdHNlY3JldA==";
    const body = [
      { event: "bounce", email: "bounce1@example.com" },
      { event: "spamreport", email: "complaint1@example.com" },
    ];
    const rawBody = JSON.stringify(body);
    const msgId = "msg_123";
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const toSign = `${msgId}.${timestamp}.${rawBody}`;
    const cleanSecret = secret.slice(6);
    const secretBuffer = Buffer.from(cleanSecret, "base64");
    const hmac = createHmac("sha256", secretBuffer);
    hmac.update(toSign);
    const signatureHex = hmac.digest("hex");
    const signature = `v1,${signatureHex}`;

    const result = await controller.handleWebhook(msgId, timestamp, signature, body);
    expect(result).toEqual({ processedCount: 2 });
    expect(mockNotificationServiceInstance.addToBlacklistBulk).toHaveBeenCalledWith([
      { email: "bounce1@example.com", reason: "bounce" },
      { email: "complaint1@example.com", reason: "complaint" },
    ]);
  });

  it("should support Amazon SES webhook payload format", async () => {
    const secret = "whsec_dGVzdHNlY3JldA==";
    const body = {
      notificationType: "Bounce",
      bounce: {
        bouncedRecipients: [{ emailAddress: "ses-bounce@example.com" }],
      },
    };
    const rawBody = JSON.stringify(body);
    const msgId = "msg_123";
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const toSign = `${msgId}.${timestamp}.${rawBody}`;
    const cleanSecret = secret.slice(6);
    const secretBuffer = Buffer.from(cleanSecret, "base64");
    const hmac = createHmac("sha256", secretBuffer);
    hmac.update(toSign);
    const signatureHex = hmac.digest("hex");
    const signature = `v1,${signatureHex}`;

    const result = await controller.handleWebhook(msgId, timestamp, signature, body);
    expect(result).toEqual({ processedCount: 1 });
    expect(mockNotificationServiceInstance.addToBlacklistBulk).toHaveBeenCalledWith([
      { email: "ses-bounce@example.com", reason: "bounce" },
    ]);
  });

  it("should validate and discard malformed emails", async () => {
    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === "NODE_ENV") return "development";
        return null;
      }),
    } as unknown as ConfigService;
    controller = new NotificationWebhookController(mockConfigService);

    const body = [
      { event: "bounce", email: "valid@example.com" },
      { event: "bounce", email: "invalid-email" },
      { event: "bounce", email: "another.valid@domain.co.uk" },
      { event: "bounce", email: "spaces in@email.com" },
    ];

    const result = await controller.handleWebhook("", "", "", body);
    expect(result).toEqual({ processedCount: 2 });
    expect(mockNotificationServiceInstance.addToBlacklistBulk).toHaveBeenCalledWith([
      { email: "valid@example.com", reason: "bounce" },
      { email: "another.valid@domain.co.uk", reason: "bounce" },
    ]);
  });

  describe("handleUnsubscribe", () => {
    it("should successfully process unsubscribe and register to blacklist", async () => {
      const email = "unsubscribe-user@example.com";
      const token = jwt.sign({ email }, "dev-jwt-secret");

      const result = await controller.handleUnsubscribe(token);

      expect(result).toContain("Hủy đăng ký thành công");
      expect(result).toContain(email);
      expect(mockNotificationServiceInstance.addToBlacklist).toHaveBeenCalledWith(
        email,
        "complaint",
      );
    });

    it("should fail if token is missing", async () => {
      await expect(controller.handleUnsubscribe("")).rejects.toThrow(BadRequestException);
    });

    it("should fail if token is invalid or expired", async () => {
      await expect(controller.handleUnsubscribe("invalid-token")).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
