import { signQueueDashboardSession, verifyQueueDashboardToken } from "@ecom/lib/jwt";
import { getRedisClient } from "@ecom/lib/redis";
import { Controller, Get, Query, Res, UnauthorizedException } from "@nestjs/common";
import type { Response } from "express";

@Controller("queues")
export class QueuesController {
  @Get("sso")
  async handleSSO(@Query("token") token: string, @Res() res: Response) {
    if (!token) {
      throw new UnauthorizedException("Missing SSO token");
    }

    try {
      const payload = verifyQueueDashboardToken(token);
      if (payload.type !== "queue-dashboard-sso") {
        throw new UnauthorizedException("Invalid token type");
      }

      // Prevent token replay attacks using Redis one-time check
      if (payload.jti) {
        const redis = getRedisClient();
        const key = `sso_token:${payload.jti}`;
        const wasUsed = await redis.get(key);
        if (wasUsed) {
          throw new UnauthorizedException("SSO token has already been used");
        }
        // Mark token as used, set expiry to 60s matching the token TTL
        await redis.set(key, "used", "EX", 60);
      }

      // Generate a new queue dashboard session token
      const sessionToken = signQueueDashboardSession({
        userId: payload.userId,
        email: payload.email,
      });

      // Set the HTTP-only cookie scoped strictly to /api/v2/queues
      const isProd = process.env.NODE_ENV === "production";
      res.cookie("ecom_queue_session", sessionToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        path: "/api/v2/queues",
        maxAge: 2 * 60 * 60 * 1000, // 2 hours
      });

      // Redirect to dashboard (with trailing slash)
      return res.redirect("/api/v2/queues/dashboard/");
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException("Invalid or expired SSO token");
    }
  }
}
