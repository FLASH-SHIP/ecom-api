import { createHmac } from "node:crypto";
import { getNotificationService } from "@ecom/features/di/containers/NotificationService";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import * as jwt from "jsonwebtoken";

function verifySvixSignature(params: {
  secret: string;
  body: string;
  id: string;
  timestamp: string;
  signature: string;
}): boolean {
  if (!params.secret || !params.body || !params.id || !params.timestamp || !params.signature) {
    return false;
  }

  const timestampMs = Number(params.timestamp) * 1000;
  const now = Date.now();
  if (Math.abs(now - timestampMs) > 300000) {
    return false;
  }

  const toSign = `${params.id}.${params.timestamp}.${params.body}`;
  const cleanSecret = params.secret.startsWith("whsec_") ? params.secret.slice(6) : params.secret;

  let secretBuffer: Buffer;
  try {
    secretBuffer = Buffer.from(cleanSecret, "base64");
    if (secretBuffer.toString("base64") !== cleanSecret) {
      secretBuffer = Buffer.from(cleanSecret, "utf-8");
    }
  } catch {
    secretBuffer = Buffer.from(cleanSecret, "utf-8");
  }

  const hmac = createHmac("sha256", secretBuffer);
  hmac.update(toSign);
  const signatureHex = hmac.digest("hex");

  const parts = params.signature.split(" ");
  for (const part of parts) {
    const [version, signature] = part.split(",");
    if (version === "v1" && signature === signatureHex) {
      return true;
    }
  }

  return false;
}

@ApiTags("Notification Webhooks")
@Controller({
  path: "webhooks/notifications",
  version: "1",
})
export class NotificationWebhookController {
  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Handle third-party ESP webhooks for bounces and complaints" })
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Webhook parses multiple ESP payloads
  async handleWebhook(
    @Headers("svix-id") svixId: string,
    @Headers("svix-timestamp") svixTimestamp: string,
    @Headers("svix-signature") svixSignature: string,
    // biome-ignore lint/suspicious/noExplicitAny: Webhook payload structure varies per ESP
    @Body() body: any,
  ) {
    const secret =
      this.configService.get<string>("NOTIFICATION_WEBHOOK_SECRET") || "whsec_devsecret";

    // Standard Signature Verification (highly secure)
    const rawBody = JSON.stringify(body);
    const isValid = verifySvixSignature({
      secret,
      body: rawBody,
      id: svixId,
      timestamp: svixTimestamp,
      signature: svixSignature,
    });

    // In development mode, we allow bypass if headers are missing to ease local manual/Postman testing
    const isDev = this.configService.get<string>("NODE_ENV") === "development";
    if (!isValid && (!isDev || (svixId && svixSignature))) {
      throw new BadRequestException("Invalid webhook signature");
    }

    const svc = getNotificationService();
    const emailsToBlacklist: { email: string; reason: string }[] = [];

    // Parse different ESP webhook payload types:
    // 1. Resend
    if (body.type === "email.bounced" && body.data?.to) {
      const recipientEmails = Array.isArray(body.data.to) ? body.data.to : [body.data.to];
      for (const email of recipientEmails) {
        emailsToBlacklist.push({ email, reason: "bounce" });
      }
    } else if (body.type === "email.complained" && body.data?.to) {
      const recipientEmails = Array.isArray(body.data.to) ? body.data.to : [body.data.to];
      for (const email of recipientEmails) {
        emailsToBlacklist.push({ email, reason: "complaint" });
      }
    }
    // 2. SendGrid (SendGrid sends webhook events as an array of events)
    else if (Array.isArray(body)) {
      for (const item of body) {
        if (item.event === "bounce" && item.email) {
          emailsToBlacklist.push({ email: item.email, reason: "bounce" });
        } else if (item.event === "spamreport" && item.email) {
          emailsToBlacklist.push({ email: item.email, reason: "complaint" });
        }
      }
    }
    // 3. Amazon SES (Simple Email Service via SNS Notification)
    else if (body.notificationType === "Bounce" && body.bounce?.bouncedRecipients) {
      for (const rec of body.bounce.bouncedRecipients) {
        if (rec.emailAddress) {
          emailsToBlacklist.push({ email: rec.emailAddress, reason: "bounce" });
        }
      }
    } else if (body.notificationType === "Complaint" && body.complaint?.complainedRecipients) {
      for (const rec of body.complaint.complainedRecipients) {
        if (rec.emailAddress) {
          emailsToBlacklist.push({ email: rec.emailAddress, reason: "complaint" });
        }
      }
    }

    // High-performance email validation filter to block malformed payload entries
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validatedEmails = emailsToBlacklist.filter(({ email }) => EMAIL_REGEX.test(email));

    // Batch register using optimized transactional bulk service method
    if (validatedEmails.length > 0) {
      await svc.addToBlacklistBulk(validatedEmails);
    }

    return { processedCount: validatedEmails.length };
  }

  @Get("unsubscribe")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Unsubscribe from promotional emails" })
  async handleUnsubscribe(@Query("token") token: string) {
    if (!token) {
      throw new BadRequestException("Token is required");
    }

    try {
      const jwtSecret = this.configService.get<string>("JWT_SECRET") || "dev-jwt-secret";
      const decoded = jwt.verify(token, jwtSecret) as { email: string };
      if (!decoded.email) {
        throw new BadRequestException("Invalid token payload");
      }

      const svc = getNotificationService();
      await svc.addToBlacklist(decoded.email, "complaint");

      return `
        <html>
          <head>
            <title>Unsubscribed Successfully</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8fafc; }
              .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); text-align: center; max-width: 400px; width: 100%; border: 1px solid #e2e8f0; }
              h1 { color: #1e293b; font-size: 20px; margin-bottom: 12px; }
              p { color: #64748b; font-size: 14px; line-height: 1.5; margin-bottom: 24px; }
              .badge { background: #fee2e2; color: #ef4444; font-weight: 600; padding: 4px 12px; border-radius: 9999px; font-size: 12px; display: inline-block; margin-bottom: 16px; text-transform: uppercase; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="badge">Unsubscribed</div>
              <h1>Hủy đăng ký thành công</h1>
              <p>Địa chỉ email <strong>${decoded.email}</strong> đã được gỡ khỏi danh sách nhận thư quảng cáo của chúng tôi.</p>
              <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">Bạn vẫn sẽ nhận được các email giao dịch quan trọng (như mã xác thực OTP, hóa đơn và đặt lại mật khẩu).</p>
            </div>
          </body>
        </html>
      `;
    } catch (_err) {
      throw new BadRequestException("Token is invalid or expired");
    }
  }
}
