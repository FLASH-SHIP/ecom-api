import { sendEmail } from "@ecom/emails";
import { JobQueue } from "../JobQueue";

export const EMAIL_QUEUE = "email";

interface EmailJobPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Register the email job handler.
 * Call this once during application startup.
 */
export function registerEmailWorker() {
  JobQueue.register(
    EMAIL_QUEUE,
    async (payload) => {
      const data = payload as unknown as EmailJobPayload;
      await sendEmail({
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text,
      });
    },
    3, // 3 retries
  );
}

/**
 * Dispatch an email to be sent in the background.
 */
export async function queueEmail(data: EmailJobPayload): Promise<string> {
  return JobQueue.dispatch(EMAIL_QUEUE, data as unknown as Record<string, unknown>);
}
