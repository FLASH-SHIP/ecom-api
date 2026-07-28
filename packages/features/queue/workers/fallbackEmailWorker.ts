import { sendEmail } from "@flash-ship/ecom-emails";
import { createLogger } from "@flash-ship/ecom-lib/logger";
import { prisma } from "@ecom/prisma";
import { JobQueue } from "../JobQueue";

const log = createLogger("FallbackEmailWorker");
export const FALLBACK_EMAIL_QUEUE = "fallback-email";

interface FallbackEmailJobPayload {
  notificationId: number;
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export function registerFallbackEmailWorker() {
  JobQueue.register(
    FALLBACK_EMAIL_QUEUE,
    async (payload) => {
      const data = payload as unknown as FallbackEmailJobPayload;

      // Check database to see if notification has been clicked
      const notification = await prisma.notification.findUnique({
        where: { id: data.notificationId },
        select: { clickedAt: true },
      });

      if (!notification) {
        log.info("Notification record not found, skipping fallback email", {
          notificationId: data.notificationId,
        });
        return;
      }

      if (notification.clickedAt) {
        log.info("Notification was clicked, skipping fallback email", {
          notificationId: data.notificationId,
        });
        return;
      }

      log.info("Notification not clicked. Sending fallback email to recipient", {
        notificationId: data.notificationId,
        to: data.to,
      });

      const success = await sendEmail({
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text,
      });

      if (!success) {
        throw new Error(`Failed to send fallback email to ${data.to}`);
      }
    },
    3, // 3 retries
  );
}

export async function queueFallbackEmail(
  data: FallbackEmailJobPayload,
  delayMs: number,
): Promise<string> {
  return JobQueue.dispatch(FALLBACK_EMAIL_QUEUE, data as unknown as Record<string, unknown>, {
    delay: delayMs,
    removeOnComplete: { age: 3600 }, // Purge completed jobs from Redis after 1 hour
    removeOnFail: { age: 86400 }, // Retain failed jobs for 24 hours to debug email failures
  });
}
