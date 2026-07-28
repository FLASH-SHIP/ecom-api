import { createLogger } from "@flash-ship/ecom-lib/logger";

const log = createLogger("PushNotificationService");

interface FCMResponse {
  responses: Array<{
    success: boolean;
    error?: {
      code: string;
      message: string;
    };
  }>;
  successCount: number;
  failureCount: number;
}

export class PushNotificationService {
  private firebaseAdmin: unknown = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(options?: { serviceAccountJson?: string }) {
    this.initializationPromise = this.initialize(options?.serviceAccountJson);
  }

  private async initialize(serviceAccountJsonParam?: string) {
    const serviceAccountJson = serviceAccountJsonParam;
    if (!serviceAccountJson) {
      log.warn(
        "FIREBASE_SERVICE_ACCOUNT_JSON is not configured. Push notifications will be logged to console instead.",
      );
      return;
    }

    try {
      // Dynamic import to prevent crash if dependency is not installed yet
      const admin = await import("firebase-admin");
      const serviceAccount = JSON.parse(serviceAccountJson);

      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      }

      this.firebaseAdmin = admin;
      this.isInitialized = true;
      log.info("Firebase Admin SDK initialized successfully for Push Notifications.");
    } catch (error: unknown) {
      log.error(
        "Failed to initialize Firebase Admin SDK. Ensure 'firebase-admin' is installed and JSON credentials are valid.",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  /**
   * Sends multicast push notifications to multiple FCM tokens.
   * Returns list of invalid tokens that should be cleaned up.
   */
  async sendPushNotification(
    tokens: string[],
    payload: { title: string; body: string; data?: Record<string, string> },
  ): Promise<{ successCount: number; failureCount: number; invalidTokens: string[] }> {
    await this.initializationPromise;

    if (tokens.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }

    if (!this.isInitialized || !this.firebaseAdmin) {
      log.info("[MOCK PUSH DISPATCH] - Logging push payload to console:", {
        recipientCount: tokens.length,
        tokens,
        payload,
      });
      // In development/mock mode, treat all dispatches as successful
      return { successCount: tokens.length, failureCount: 0, invalidTokens: [] };
    }

    try {
      // Safely access messaging from dynamically imported admin
      const admin = this.firebaseAdmin as typeof import("firebase-admin");
      const messaging = admin.messaging();
      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data || {},
        tokens: tokens,
      };

      const response = (await messaging.sendEachForMulticast(message)) as FCMResponse;
      const invalidTokens: string[] = [];

      response.responses.forEach((res, idx) => {
        if (!res.success && res.error) {
          const errorCode = res.error.code;
          const token = tokens[idx];

          log.warn(`FCM delivery failed for token at index ${idx}`, {
            error: res.error.message,
            code: errorCode,
          });

          // Clean up invalid/unregistered tokens
          if (
            errorCode === "messaging/registration-token-not-registered" ||
            errorCode === "messaging/invalid-registration-token" ||
            errorCode === "messaging/invalid-argument" ||
            res.error.message.includes("is not a valid FCM registration token")
          ) {
            if (token) invalidTokens.push(token);
          }
        }
      });

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
      };
    } catch (error: unknown) {
      log.error("FCM multicast push dispatch failed entirely", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { successCount: 0, failureCount: tokens.length, invalidTokens: [] };
    }
  }
}
