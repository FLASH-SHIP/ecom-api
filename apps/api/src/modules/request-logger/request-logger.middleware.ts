import { prisma } from "@ecom/prisma";
import { createLogger, loggerContext } from "@flash-ship/ecom-lib/logger";
import type { NestMiddleware } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

const log = createLogger("RequestLogger");

/**
 * HTTP request logging middleware — Botble pattern.
 *
 * Only persists requests that result in an error (status >= 400).
 * This mirrors Botble CMS's LogRequest middleware behaviour:
 * - 2xx/3xx are high-volume, low-signal → skip to keep the table small
 * - 4xx/5xx are actionable: broken links, auth failures, server errors
 *
 * Uses the `finish` event (fired after headers are flushed) so the DB write
 * is completely out of the request critical path — zero latency impact.
 *
 * Disable via LOG_REQUESTS=false in .env.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (process.env.LOG_REQUESTS === "false") {
      next();
      return;
    }

    // Record before calling next() so duration includes full handler time
    const startedAt = Date.now();

    res.on("finish", () => {
      // Only log error responses (Botble pattern: status >= 400)
      if (res.statusCode < 400) return;

      const userId = req.apiUser?.id;
      const duration = Date.now() - startedAt;
      const traceId = loggerContext.getStore()?.traceId;

      prisma.requestLog
        .create({
          data: {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration,
            ipAddress: req.ip ?? req.socket.remoteAddress,
            userAgent: req.headers["user-agent"],
            referer: req.headers.referer,
            userId: typeof userId === "number" ? userId : undefined,
            metadata: traceId ? { traceId } : undefined,
          },
          select: { id: true },
        })
        .catch((err: unknown) => {
          // Non-blocking: DB write failure must never crash the server
          log.warn("Failed to persist request log", {
            url: req.originalUrl,
            status: res.statusCode,
            error: err instanceof Error ? err.message : String(err),
          });
        });
    });

    next();
  }
}
