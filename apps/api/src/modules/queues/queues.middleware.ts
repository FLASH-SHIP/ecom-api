import { verifyQueueDashboardToken } from "@flash-ship/ecom-lib/jwt";
import { Injectable, type NestMiddleware, UnauthorizedException } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;

  for (const cookie of cookieHeader.split(";")) {
    const parts = cookie.split("=");
    const name = parts[0]?.trim();
    const value = parts.slice(1).join("=").trim();
    if (name) {
      list[name] = decodeURIComponent(value);
    }
  }
  return list;
}

@Injectable()
export class QueueAuthMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies.ecom_queue_session;
    if (!sessionToken) {
      throw new UnauthorizedException("Missing queue dashboard session");
    }

    try {
      const payload = verifyQueueDashboardToken(sessionToken);
      if (payload.type !== "queue-dashboard-session") {
        throw new UnauthorizedException("Invalid queue session type");
      }
      next();
    } catch (_error) {
      throw new UnauthorizedException("Invalid or expired queue dashboard session");
    }
  }
}
