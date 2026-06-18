import { createLogger } from "@ecom/lib/logger";

const log = createLogger("Shutdown");

type ShutdownHandler = () => Promise<void> | void;

/**
 * Graceful shutdown manager.
 *
 * Registers cleanup handlers that are executed in order when the process
 * receives SIGINT or SIGTERM. Ensures DB connections, Redis, and file handles
 * are properly closed before exit.
 *
 * Inspired by NestJS app.enableShutdownHooks() and Laravel's terminating callbacks.
 *
 * Usage:
 *   import { gracefulShutdown } from "@ecom/features/shutdown/GracefulShutdown";
 *
 *   gracefulShutdown.register("Database", async () => {
 *     await prisma.$disconnect();
 *   });
 *
 *   gracefulShutdown.register("Redis", async () => {
 *     await disconnectRedis();
 *   });
 *
 *   gracefulShutdown.enable();
 */
class GracefulShutdownManager {
  private handlers: { name: string; handler: ShutdownHandler }[] = [];
  private isShuttingDown = false;
  private enabled = false;
  private timeoutMs = 10_000; // 10 seconds max shutdown time

  /**
   * Register a cleanup handler with a descriptive name.
   * Handlers are executed in registration order.
   */
  register(name: string, handler: ShutdownHandler): void {
    this.handlers.push({ name, handler });
  }

  /**
   * Set the maximum time to wait for all handlers before force-exiting.
   */
  setTimeout(ms: number): void {
    this.timeoutMs = ms;
  }

  /**
   * Enable signal listeners for graceful shutdown.
   * Call this once during application bootstrap.
   */
  enable(): void {
    if (this.enabled) return;
    this.enabled = true;

    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        log.warn("Shutdown already in progress, ignoring duplicate signal");
        return;
      }

      this.isShuttingDown = true;
      log.info(`Received ${signal}, starting graceful shutdown...`);

      // Set a hard timeout to force exit
      const forceExit = setTimeout(() => {
        log.error("Shutdown timed out, forcing exit");
        process.exit(1);
      }, this.timeoutMs);
      forceExit.unref();

      let hasErrors = false;

      for (const { name, handler } of this.handlers) {
        try {
          log.info(`Shutting down: ${name}...`);
          await handler();
          log.info(`${name} shut down successfully`);
        } catch (err) {
          hasErrors = true;
          log.error(`Error shutting down ${name}`, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      clearTimeout(forceExit);

      if (hasErrors) {
        log.warn("Shutdown completed with errors");
        process.exit(1);
      } else {
        log.info("Graceful shutdown completed");
        process.exit(0);
      }
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }

  /**
   * Get the list of registered handlers (for debugging).
   */
  getRegisteredHandlers(): string[] {
    return this.handlers.map((h) => h.name);
  }

  /**
   * Check if shutdown is in progress.
   */
  isInProgress(): boolean {
    return this.isShuttingDown;
  }
}

// Singleton
export const gracefulShutdown = new GracefulShutdownManager();
