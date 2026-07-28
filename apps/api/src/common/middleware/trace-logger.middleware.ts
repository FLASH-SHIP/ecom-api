import { randomUUID } from "node:crypto";
import { loggerContext } from "@flash-ship/ecom-lib/logger";
import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

@Injectable()
export class TraceLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const traceId = (req.headers["x-trace-id"] as string) || randomUUID();
    res.setHeader("x-trace-id", traceId);

    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];

    loggerContext.run({ traceId, ipAddress, userAgent }, () => {
      next();
    });
  }
}
