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
  JWT_ADMIN_SECRET: z.string().min(8, "JWT_ADMIN_SECRET must be at least 8 characters long"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(8, "JWT_REFRESH_SECRET must be at least 8 characters long")
    .optional(),
  JWT_ACCESS_TOKEN_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_TOKEN_EXPIRES_IN: z.string().default("30d"),
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
