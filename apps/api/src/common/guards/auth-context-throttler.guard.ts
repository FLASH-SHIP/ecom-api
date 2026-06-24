import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import type { ThrottlerRequest } from "@nestjs/throttler/dist/throttler.guard.interface";
import type { Request } from "express";

@Injectable()
export class AuthContextThrottlerGuard extends ThrottlerGuard {
  /**
   * Tracker key is built based on authentication context.
   * Tracks by IP for anonymous visitors, and token/key for authenticated actors.
   */
  // biome-ignore lint/suspicious/noExplicitAny: base class override requires Record<string, any>
  protected override async getTracker(req: Record<string, any>): Promise<string> {
    const expressReq = req as unknown as Request;
    const authHeader = expressReq.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader;
    }

    const rawIp =
      expressReq.headers["cf-connecting-ip"] ||
      expressReq.headers["x-forwarded-for"] ||
      expressReq.headers["x-real-ip"] ||
      expressReq.ip ||
      "";

    const ipString = (Array.isArray(rawIp) ? rawIp[0] : String(rawIp)) || "";
    const clientIp = ipString.split(",")[0]?.trim() || "";

    return clientIp;
  }

  /**
   * Adjust rate limits dynamically based on actor tiers.
   */
  protected override async handleRequest(requestProps: ThrottlerRequest): Promise<boolean> {
    const { context } = requestProps;
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers.authorization;

    let dynamicLimit = requestProps.limit;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      if (token.startsWith("ecom_")) {
        // High limit for automation / scripts / integrations
        dynamicLimit = 1000;
      } else {
        // Elevated limit for standard mobile/extension users
        dynamicLimit = 300;
      }
    } else {
      // Standard low limit for public anonymous traffic
      dynamicLimit = 60;
    }

    return super.handleRequest({
      ...requestProps,
      limit: dynamicLimit,
    });
  }
}
