import type { WebhookRepository } from "@ecom/features/webhook/repositories/WebhookRepository";
import { ErrorWithCode } from "@ecom/lib/errors";
import { createLogger } from "@ecom/lib/logger";

const log = createLogger("WebhookService");

export interface IWebhookServiceDeps {
  webhookRepo: WebhookRepository;
}

/**
 * Event Registry — extensible webhook system.
 * Register events, dispatch to subscribed webhooks with retry logic.
 */
export class WebhookService {
  private static AVAILABLE_EVENTS = [
    "post.created",
    "post.updated",
    "post.published",
    "post.deleted",
    "page.created",
    "page.updated",
    "page.published",
    "page.deleted",
    "category.created",
    "category.updated",
    "category.deleted",
    "member.registered",
    "member.updated",
    "member.deleted",
    "comment.created",
    "comment.approved",
    "comment.deleted",
    "contact.submitted",
    "contact.replied",
    "media.uploaded",
    "media.deleted",
    "user.created",
    "user.updated",
  ] as const;

  private deps: IWebhookServiceDeps;

  constructor(deps: IWebhookServiceDeps) {
    this.deps = deps;
  }

  getAvailableEvents() {
    return [...WebhookService.AVAILABLE_EVENTS];
  }

  async listWebhooks() {
    return this.deps.webhookRepo.findMany();
  }

  async getWebhook(id: number) {
    const webhook = await this.deps.webhookRepo.findById(id);
    if (!webhook) throw ErrorWithCode.Factory.NotFound("Webhook not found");
    return webhook;
  }

  async createWebhook(data: {
    name: string;
    url: string;
    secret?: string;
    events: string[];
    retries?: number;
    timeout?: number;
  }) {
    return this.deps.webhookRepo.create(data);
  }

  async updateWebhook(
    id: number,
    data: {
      name?: string;
      url?: string;
      secret?: string;
      events?: string[];
      isActive?: boolean;
      retries?: number;
      timeout?: number;
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

  /**
   * Dispatch an event to all subscribed webhooks.
   * Fire-and-forget — errors are logged but don't block the caller.
   */
  async dispatch(event: string, payload: Record<string, unknown>) {
    const webhooks = await this.deps.webhookRepo.findByEvent(event);
    if (webhooks.length === 0) return;

    log.info("Dispatching webhook event", {
      event,
      subscriberCount: webhooks.length,
    });

    for (const webhook of webhooks) {
      this.sendWebhook(webhook, event, payload).catch((err) => {
        log.warn("Webhook dispatch failed", {
          webhookId: webhook.id,
          event,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }
  }

  private async sendWebhook(
    webhook: { id: number; url: string; secret: string | null; retries: number; timeout: number },
    event: string,
    payload: Record<string, unknown>,
  ) {
    const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Event": event,
    };

    if (webhook.secret) {
      const { createHmac } = await import("node:crypto");
      const signature = createHmac("sha256", webhook.secret).update(body).digest("hex");
      headers["X-Webhook-Signature"] = signature;
    }

    let lastError: string | undefined;
    let statusCode: number | undefined;
    let responseText: string | undefined;

    for (let attempt = 1; attempt <= webhook.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), webhook.timeout * 1000);

        const res = await fetch(webhook.url, {
          method: "POST",
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        statusCode = res.status;
        responseText = await res.text().catch(() => "");

        if (res.ok) {
          await this.deps.webhookRepo.createLog({
            webhookId: webhook.id,
            event,
            payload,
            response: responseText,
            statusCode,
            success: true,
            attempts: attempt,
          });
          return;
        }

        lastError = `HTTP ${statusCode}: ${responseText.slice(0, 200)}`;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }

      // Exponential backoff between retries
      if (attempt < webhook.retries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      }
    }

    await this.deps.webhookRepo.createLog({
      webhookId: webhook.id,
      event,
      payload,
      response: responseText,
      statusCode,
      success: false,
      attempts: webhook.retries,
      error: lastError,
    });
  }
}
