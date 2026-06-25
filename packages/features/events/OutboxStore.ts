import { prisma } from "@ecom/prisma";
import type { EventMap } from "./EventBus";
import { eventBus } from "./EventBus";

// biome-ignore lint/complexity/noStaticOnlyClass: grouping namespaces for outbox writes
export class OutboxStore {
  /**
   * Save an event into the outbox table.
   * If run within a transaction, it automatically participates.
   * If running in test mode, it dispatches the event immediately via EventBus to bypass DB unless overridden.
   */
  static async publish<K extends keyof EventMap>(event: K, payload: EventMap[K]): Promise<void> {
    if (process.env.NODE_ENV === "test" && !process.env.TEST_OUTBOX_FORCE_WRITE) {
      // Direct in-memory dispatch to satisfy unit tests and avoid DB connection
      await eventBus.emit(event, payload);
      return;
    }

    await prisma.outboxEvent.create({
      data: {
        event,
        // biome-ignore lint/suspicious/noExplicitAny: prisma payload requires JSON serialization
        payload: JSON.parse(JSON.stringify(payload)) as any,
        status: "PENDING",
      },
    });
  }
}
