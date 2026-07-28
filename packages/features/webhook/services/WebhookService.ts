import { randomUUID } from "node:crypto";
import { promises as dnsPromises } from "node:dns";
import { URL } from "node:url";
import { eventBus } from "@ecom/features/events/EventBus";
import { queueWebhookDelivery } from "@ecom/features/queue/workers/webhookWorker";
import type { WebhookRepository } from "@ecom/features/webhook/repositories/WebhookRepository";
import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";
import { createLogger } from "@flash-ship/ecom-lib/logger";

const log = createLogger("WebhookService");

function isIpAddressPrivate(ip: string): boolean {
  if (
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("169.254.")
  ) {
    return true;
  }

  if (ip.startsWith("172.")) {
    const parts = ip.split(".");
    const secondOctetStr = parts[1];
    if (secondOctetStr !== undefined) {
      const secondOctet = parseInt(secondOctetStr, 10);
      if (secondOctet >= 16 && secondOctet <= 31) {
        return true;
      }
    }
  }

  if (ip === "::1" || ip === "0:0:0:0:0:0:0:1") {
    return true;
  }

  const lowerIp = ip.toLowerCase();
  if (lowerIp.startsWith("fe80:") || lowerIp.startsWith("fc00:") || lowerIp.startsWith("fd")) {
    return true;
  }

  return false;
}

async function isPrivateUrl(urlStr: string): Promise<boolean> {
  try {
    const urlObj = new URL(urlStr);
    const hostname = urlObj.hostname;

    if (hostname === "localhost" || !hostname.includes(".")) {
      return true;
    }

    const addresses = await dnsPromises.lookup(hostname, { all: true });
    return addresses.some((addr) => isIpAddressPrivate(addr.address));
  } catch (_err) {
    return true;
  }
}

export interface IWebhookServiceDeps {
  webhookRepo: WebhookRepository;
}

export class WebhookService {
  private static AVAILABLE_EVENTS = [
    "ping",
    "order.created",
    "order.status_updated",
    "order.checkpoint_added",
    "member.registered",
    "post.created",
    "post.updated",
    "post.published",
    "post.deleted",
    "page.created",
    "page.updated",
    "page.published",
    "page.deleted",
  ] as const;

  private deps: IWebhookServiceDeps;

  constructor(deps: IWebhookServiceDeps) {
    this.deps = deps;
  }

  getAvailableEvents() {
    return [...WebhookService.AVAILABLE_EVENTS];
  }

  async listWebhooks(owner?: { ownerId: string; ownerType: string }) {
    return this.deps.webhookRepo.findMany(owner);
  }

  async getWebhook(id: number) {
    const webhook = await this.deps.webhookRepo.findById(id);
    if (!webhook) throw ErrorWithCode.Factory.NotFound("Webhook not found");
    return webhook;
  }

  async createWebhook(data: {
    name: string;
    url: string;
    secret?: string | null;
    events: string[];
    retries?: number;
    timeout?: number;
    ownerId?: string | null;
    ownerType?: string | null;
    apiVersion?: string;
  }) {
    return this.deps.webhookRepo.create(data);
  }

  async updateWebhook(
    id: number,
    data: {
      name?: string;
      url?: string;
      secret?: string | null;
      events?: string[];
      isActive?: boolean;
      retries?: number;
      timeout?: number;
      apiVersion?: string;
    },
  ) {
    const webhook = await this.deps.webhookRepo.findById(id);
    if (!webhook) throw ErrorWithCode.Factory.NotFound("Webhook not found");
    return this.deps.webhookRepo.update(id, data);
  }

  async deleteWebhook(id: number) {
    const webhook = await this.deps.webhookRepo.findById(id);
    if (!webhook) throw ErrorWithCode.Factory.NotFound("Webhook not found");
    return this.deps.webhookRepo.remove(id);
  }

  async getWebhookLogs(webhookId: number) {
    return this.deps.webhookRepo.findLogs(webhookId);
  }

  async rotateWebhookSecret(id: number): Promise<string> {
    const webhook = await this.deps.webhookRepo.findById(id);
    if (!webhook) throw ErrorWithCode.Factory.NotFound("Webhook not found");
    const newSecret = `whsec_${randomUUID().replace(/-/g, "")}`;
    await this.deps.webhookRepo.rotateSecret(id, newSecret, webhook.secret);
    return newSecret;
  }

  /**
   * Dispatch an event to all subscribed webhooks.
   * Pushes jobs to BullMQ for asynchronous background execution.
   */
  async dispatch(
    event: string,
    payload: Record<string, unknown>,
    owner?: { ownerId: string; ownerType: string },
  ) {
    const webhooks = await this.deps.webhookRepo.findByEvent(event, owner);
    if (webhooks.length === 0) return;

    log.info("Enqueuing webhook event to BullMQ", {
      event,
      subscriberCount: webhooks.length,
      owner,
    });

    for (const webhook of webhooks) {
      const eventId = `evt_${randomUUID().replace(/-/g, "")}`;
      await queueWebhookDelivery({
        webhookId: webhook.id,
        event,
        payload,
        eventId,
      }).catch((err) => {
        log.error("Failed to enqueue webhook delivery job", {
          webhookId: webhook.id,
          event,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }
  }

  /**
   * Execute the actual delivery of a webhook (called by BullMQ worker).
   */
  async executeWebhookDelivery(
    webhookId: number,
    event: string,
    rawPayload: Record<string, unknown>,
    attempt = 1,
    eventId?: string,
  ) {
    const webhook = await this.deps.webhookRepo.findById(webhookId);
    if (!webhook?.isActive) {
      return;
    }

    const finalEventId = eventId || `evt_${randomUUID().replace(/-/g, "")}`;
    const timestamp = new Date().toISOString();

    // Map/construct the Thin Payload based on apiVersion
    const resourcePayload = this.formatPayloadForVersion(event, webhook.apiVersion, rawPayload);

    const bodyObj = {
      id: finalEventId,
      event,
      apiVersion: webhook.apiVersion,
      timestamp,
      resource: resourcePayload,
    };

    const body = JSON.stringify(bodyObj);

    const headers = await this.buildWebhookHeaders(
      event,
      timestamp,
      body,
      webhook.secret,
      webhook.oldSecret,
      webhook.secretUpdatedAt,
    );

    const result = await this.performSingleDeliveryAttempt(
      webhook.url,
      headers,
      body,
      webhook.timeout,
    );

    const statusCode = result.statusCode;
    const responseText = result.responseText;
    const lastError = result.error;
    const success = result.success;

    // Write Log for this specific attempt
    await this.deps.webhookRepo
      .createLog({
        webhookId: webhook.id,
        event,
        payload: bodyObj,
        response: responseText,
        statusCode,
        success,
        attempts: attempt,
        error: success ? undefined : lastError,
      })
      .catch((err) => {
        log.error("Failed to write webhook delivery log", { webhookId, error: err.message });
      });

    if (success) {
      await this.handlePostDeliveryStatus(webhook, true);
    } else {
      await this.handleRetryOrDeactivation(
        webhook,
        event,
        rawPayload,
        attempt,
        result,
        finalEventId,
      );
    }
  }

  private async handleRetryOrDeactivation(
    webhook: {
      id: number;
      name: string;
      url: string;
      ownerId: string | null;
      ownerType: string | null;
      failureCount: number;
      isActive: boolean;
      retries: number;
    },
    event: string,
    rawPayload: Record<string, unknown>,
    attempt: number,
    result: { statusCode?: number; retryAfter?: string | null },
    eventId: string,
  ) {
    if (attempt < webhook.retries) {
      const delay = this.getBackoffDelay(result.statusCode, result.retryAfter, attempt, webhook.id);
      log.info(`Enqueuing retry attempt ${attempt + 1} with delay ${delay}ms for webhook`, {
        webhookId: webhook.id,
      });
      await queueWebhookDelivery(
        {
          webhookId: webhook.id,
          event,
          payload: rawPayload,
          attempt: attempt + 1,
          eventId,
        },
        { delay },
      ).catch((err) => {
        log.error("Failed to enqueue webhook retry job", {
          webhookId: webhook.id,
          error: err.message,
        });
      });
    } else {
      // Final attempt failed, handle auto-deactivation
      await this.handlePostDeliveryStatus(webhook, false);
    }
  }

  private getBackoffDelay(
    status: number | undefined,
    retryAfter: string | null | undefined,
    attempt: number,
    webhookId: number,
  ): number {
    let baseDelay = Math.min(attempt * 2000, 900000);
    if ((status === 429 || status === 503) && retryAfter) {
      const numericDelay = parseInt(retryAfter, 10);
      if (!Number.isNaN(numericDelay) && numericDelay > 0) {
        baseDelay = Math.min(numericDelay * 1000, 900000);
        log.info(
          `Rate limit / Backpressure hit. Delayed retry for ${numericDelay}s (capped to 15m)`,
          {
            webhookId,
          },
        );
      }
    }

    // Add ±10% randomized jitter to prevent thundering herd effect
    const jitter = (Math.random() - 0.5) * 0.2 * baseDelay;
    return Math.max(1000, Math.min(baseDelay + jitter, 900000));
  }

  private async handlePostDeliveryStatus(
    webhook: {
      id: number;
      name: string;
      url: string;
      ownerId: string | null;
      ownerType: string | null;
      failureCount: number;
      isActive: boolean;
    },
    success: boolean,
  ) {
    if (success) {
      if (webhook.failureCount > 0) {
        await this.deps.webhookRepo.resetFailureCount(webhook.id).catch(() => {});
      }
    } else {
      const updated = await this.deps.webhookRepo
        .incrementFailureCount(webhook.id)
        .catch(() => null);
      if (updated && updated.failureCount >= 50 && updated.isActive) {
        await this.deps.webhookRepo.update(webhook.id, { isActive: false }).catch(() => {});
        log.warn(`Webhook auto-deactivated due to 50 consecutive delivery failures`, {
          webhookId: webhook.id,
          url: webhook.url,
        });

        eventBus
          .emit("webhook.deactivated", {
            webhookId: webhook.id,
            name: webhook.name,
            url: webhook.url,
            ownerId: webhook.ownerId,
            ownerType: webhook.ownerType,
            reason: "50 consecutive delivery failures",
          })
          .catch(() => {});
      }
    }
  }

  private async buildWebhookHeaders(
    event: string,
    timestamp: string,
    body: string,
    secret: string | null,
    oldSecret?: string | null,
    secretUpdatedAt?: Date | null,
  ): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Event": event,
      "X-Webhook-Timestamp": timestamp,
    };

    const { createHmac } = await import("node:crypto");

    if (secret) {
      const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
      headers["X-Webhook-Signature"] = signature;
    }

    if (oldSecret && secretUpdatedAt) {
      const fifteenMinutesInMs = 15 * 60 * 1000;
      const elapsed = Date.now() - new Date(secretUpdatedAt).getTime();
      if (elapsed < fifteenMinutesInMs && elapsed >= 0) {
        const legacySignature = createHmac("sha256", oldSecret)
          .update(`${timestamp}.${body}`)
          .digest("hex");
        headers["X-Webhook-Signature-Legacy"] = legacySignature;
      }
    }

    return headers;
  }

  private async performSingleDeliveryAttempt(
    url: string,
    headers: Record<string, string>,
    body: string,
    timeout: number,
  ): Promise<{
    success: boolean;
    statusCode?: number;
    responseText?: string;
    error?: string;
    retryAfter?: string | null;
  }> {
    try {
      const privateCheck = await isPrivateUrl(url);
      if (privateCheck) {
        return {
          success: false,
          error: "SSRF Protection: Private or loopback IP addresses are not allowed.",
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);

      // SEC-11: Disable automatic HTTP Redirects (redirect: "error") to mitigate SSRF
      const res = await fetch(url, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
        redirect: "error",
      });

      clearTimeout(timeoutId);
      const statusCode = res.status;
      const responseText = await res.text().catch(() => "");
      const retryAfter = res.headers.get("retry-after");

      if (res.ok) {
        return { success: true, statusCode, responseText, retryAfter };
      }

      return {
        success: false,
        statusCode,
        responseText,
        retryAfter,
        error: `HTTP ${statusCode}: ${responseText.slice(0, 200)}`,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Format payload into thin resource reference structure based on event type.
   */
  private formatPayloadForVersion(
    event: string,
    _apiVersion: string,
    rawPayload: Record<string, unknown>,
  ) {
    if (event === "ping") {
      return {
        ping: "pong",
      };
    }

    if (event.startsWith("order.")) {
      return {
        id: rawPayload.id || String(rawPayload.orderId || ""),
        type: "order",
        status: rawPayload.status || rawPayload.orderStatus || "",
        orderCode: rawPayload.orderCode || rawPayload.code || "",
      };
    }

    // Fallback thin payload
    return {
      id: rawPayload.id || "",
      type: event.split(".")[0] || "unknown",
    };
  }
}
