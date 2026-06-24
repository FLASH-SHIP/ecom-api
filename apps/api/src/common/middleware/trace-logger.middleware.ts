import { randomUUID } from "node:crypto";
import { loggerContext } from "@ecom/lib/logger";
import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

@Injectable()
export class TraceLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const traceId = (req.headers["x-trace-id"] as string) || randomUUID();
    res.setHeader("x-trace-id", traceId);

    loggerContext.run({ traceId }, () => {
      next();
    });
  }
}
