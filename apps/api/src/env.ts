import { z } from "zod";

export const apiEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection URL"),
  DATABASE_REPLICA_URL: z
    .string()
    .url("DATABASE_REPLICA_URL must be a valid connection URL")
    .optional(),
  DATABASE_REPLICA_URLS: z
    .string()
    .optional()
    .describe("Comma-separated list of database replica URLs"),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  REDIS_URL: z.string().url("REDIS_URL must be a valid connection URL"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default("/api/v1"),
  API_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  WEB_URL: z.string().url("WEB_URL must be a valid URL").default("http://localhost:3000"),
  CUSTOMER_APP_URL: z
    .string()
    .url("CUSTOMER_APP_URL must be a valid URL")
    .default("http://localhost:3001"),
  ADMIN_URL: z.string().url("ADMIN_URL must be a valid URL").default("http://localhost:4001"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 characters long"),
  JWT_SECRET_FALLBACK: z.string().min(8).optional(),
  JWT_ADMIN_SECRET: z.string().min(8, "JWT_ADMIN_SECRET must be at least 8 characters long"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(8, "JWT_REFRESH_SECRET must be at least 8 characters long")
    .optional(),
  JWT_CUSTOMER_REFRESH_SECRET: z
    .string()
    .min(8, "JWT_CUSTOMER_REFRESH_SECRET must be at least 8 characters long")
    .optional(),
  JWT_ADMIN_REFRESH_SECRET: z
    .string()
    .min(8, "JWT_ADMIN_REFRESH_SECRET must be at least 8 characters long")
    .optional(),
  AUTH_SECRET: z.string().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  JWT_ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_TOKEN_EXPIRES_IN: z.string().default("30d"),
  SENTRY_DSN: z.string().optional(),
  REDIS_CLUSTER_NODES: z.string().optional(),
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  JWT_ACTIVE_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(780),
  SWAGGER_ADMIN_USER: z.string().default("admin"),
  SWAGGER_ADMIN_PASSWORD: z.string().default("admin123"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("debug"),
  LOG_REQUESTS: z
    .preprocess(
      (val) => {
        if (typeof val === "string") return val.toLowerCase();
        return val;
      },
      z.enum(["true", "false"]).default("true"),
    )
    .transform((val) => val === "true"),
  LOG_PURGE_REQUEST_DAYS: z.coerce.number().int().positive().default(30),
  LOG_PURGE_AUDIT_DAYS: z.coerce.number().int().positive().default(90),
  LOG_PURGE_CRON: z.string().default("0 2 * * *"),
  LOG_PURGE_AUDIT_KEEP_LATEST: z
    .preprocess(
      (val) => {
        if (typeof val === "string") return val.toLowerCase();
        return val;
      },
      z.enum(["true", "false"]).default("true"),
    )
    .transform((val) => val === "true"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z
    .preprocess(
      (val) => {
        if (typeof val === "string") return val.toLowerCase();
        return val;
      },
      z.enum(["true", "false"]).default("false"),
    )
    .transform((val) => val === "true"),
  MAIL_FROM: z.string().email("MAIL_FROM must be a valid email address").optional(),
  STORAGE_DISK: z.enum(["local", "s3"]).default("local"),
  STORAGE_S3_BUCKET: z.string().optional(),
  STORAGE_S3_REGION: z.string().optional(),
  STORAGE_S3_ENDPOINT: z.string().optional(),
  STORAGE_S3_CDN_URL: z.string().optional(),
  STORAGE_S3_ACCESS_KEY: z.string().optional(),
  STORAGE_S3_SECRET_KEY: z.string().optional(),
  SYSTEM_MAINTENANCE_KEY: z
    .string()
    .min(8, "SYSTEM_MAINTENANCE_KEY must be at least 8 characters long")
    .optional(),
  API_KEYS_LIMIT_PER_OWNER: z.coerce.number().int().positive().default(10),

  // Notification & Delivery System Settings
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  EMAIL_PROVIDER_PRIMARY: z.enum(["resend", "ses", "smtp"]).default("smtp"),
  EMAIL_PROVIDER_SECONDARY: z.enum(["resend", "ses", "smtp"]).default("resend"),
  RESEND_API_KEY: z.string().optional(),
  AWS_SES_ACCESS_KEY_ID: z.string().optional(),
  AWS_SES_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_SES_REGION: z.string().default("ap-southeast-1"),
  NOTIFICATION_DEDUPLICATION_TTL_SEC: z.coerce.number().int().positive().default(86400),
  NOTIFICATION_DEBOUNCE_WINDOW_SEC: z.coerce.number().int().positive().default(120),
  NOTIFICATION_SMART_ROUTING_FALLBACK_SEC: z.coerce.number().int().positive().default(600),
  NOTIFICATION_READ_PURGE_DAYS: z.coerce.number().int().positive().default(14),
  NOTIFICATION_UNREAD_PURGE_DAYS: z.coerce.number().int().positive().default(45),
  NOTIFICATION_DEVICE_TOKEN_EXPIRY_DAYS: z.coerce.number().int().positive().default(90),
  NOTIFICATION_DND_DEFAULT_START: z.string().default("22:00"),
  NOTIFICATION_DND_DEFAULT_END: z.string().default("06:00"),
  NOTIFICATION_TIMEZONE: z.string().default("Asia/Ho_Chi_Minh"),
  NOTIFICATION_MAX_TOKENS_PER_OWNER: z.coerce.number().int().positive().default(10),
  NOTIFICATION_WEBHOOK_SECRET: z.string().default("whsec_devsecret"),

  // External Wallet Configuration
  EXTERNAL_WALLET_API_BASE_URL: z.string().default("https://dev-api.ecomexpress.vn"),
  EXTERNAL_WALLET_SECRET_KEY: z.string().default(""),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function validate(config: Record<string, unknown>) {
  const result = apiEnvSchema.safeParse(config);

  if (!result.success) {
    console.error("❌ Invalid API environment variables:");
    for (const [key, error] of Object.entries(result.error.format())) {
      if (key !== "_errors") {
        console.error(`   - ${key}: ${(error as { _errors: string[] })._errors.join(", ")}`);
      }
    }
    throw new Error("Configuration validation failed");
  }

  return result.data;
}
