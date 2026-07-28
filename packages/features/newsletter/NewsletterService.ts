import { ErrorWithCode } from "@flash-ship/ecom-lib/errors";
import { createLogger } from "@flash-ship/ecom-lib/logger";

const log = createLogger("Newsletter");

export type SubscriptionStatus = "active" | "unsubscribed" | "bounced";

export interface Subscriber {
  id: number;
  email: string;
  name: string | null;
  status: SubscriptionStatus;
  subscribedAt: Date;
  unsubscribedAt: Date | null;
  metadata: Record<string, unknown> | null;
}

interface INewsletterDeps {
  findSubscriberByEmail: (email: string) => Promise<Subscriber | null>;
  createSubscriber: (data: { email: string; name?: string }) => Promise<Subscriber>;
  updateSubscriber: (id: number, data: Partial<Subscriber>) => Promise<Subscriber>;
  findActiveSubscribers: (options?: { page?: number; perPage?: number }) => Promise<Subscriber[]>;
  countActiveSubscribers: () => Promise<number>;
}

/**
 * Newsletter service — subscriber management.
 *
 * Handles subscribe, unsubscribe, and subscriber list.
 * Actual email sending should be delegated to an email service.
 *
 * Inspired by Ghost Newsletter and Buttondown.
 */
export class NewsletterService {
  private deps: INewsletterDeps;
  constructor(deps: INewsletterDeps) {
    this.deps = deps;
  }

  /**
   * Subscribe an email address.
   */
  async subscribe(email: string, name?: string): Promise<Subscriber> {
    const normalized = email.trim().toLowerCase();

    const existing = await this.deps.findSubscriberByEmail(normalized);

    if (existing) {
      if (existing.status === "active") {
        return existing;
      }

      // Re-subscribe
      const updated = await this.deps.updateSubscriber(existing.id, {
        status: "active",
        unsubscribedAt: null,
      });

      log.info("Subscriber re-activated", { email: normalized });
      return updated;
    }

    const subscriber = await this.deps.createSubscriber({ email: normalized, name });
    log.info("New subscriber", { email: normalized });
    return subscriber;
  }

  /**
   * Unsubscribe an email address.
   */
  async unsubscribe(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const subscriber = await this.deps.findSubscriberByEmail(normalized);

    if (!subscriber) {
      throw ErrorWithCode.Factory.NotFound("Subscriber not found");
    }

    if (subscriber.status === "unsubscribed") {
      return;
    }

    await this.deps.updateSubscriber(subscriber.id, {
      status: "unsubscribed",
      unsubscribedAt: new Date(),
    });

    log.info("Subscriber unsubscribed", { email: normalized });
  }

  /**
   * Get subscriber stats.
   */
  async getStats(): Promise<{ totalActive: number }> {
    const totalActive = await this.deps.countActiveSubscribers();
    return { totalActive };
  }

  /**
   * List active subscribers.
   */
  async listSubscribers(options?: { page?: number; perPage?: number }): Promise<Subscriber[]> {
    return this.deps.findActiveSubscribers(options);
  }
}
