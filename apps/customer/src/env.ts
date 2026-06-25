import { z } from "zod";

// 1. Server-side validation schema (secrets not exposed to the browser)
const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required on server"),
  CUSTOMER_SESSION_CACHE_TTL_SEC: z.coerce.number().int().nonnegative().default(30),
  CUSTOMER_SESSION_MAX_AGE_DAYS: z.coerce.number().int().positive().default(30),
  CUSTOMER_SESSION_ABSOLUTE_TIMEOUT_DAYS: z.coerce.number().int().positive().default(90),
  CUSTOMER_SESSION_IDLE_TIMEOUT_DAYS: z.coerce.number().int().positive().default(7),
  CUSTOMER_MAX_SESSIONS_PER_USER: z.coerce.number().int().positive().default(10),
  JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 characters long"),
});

// 2. Client-side validation schema (public parameters exposed to the browser)
const clientSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url("NEXT_PUBLIC_API_URL must be a valid URL"),
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),
  NEXT_PUBLIC_WEB_URL: z.string().url("NEXT_PUBLIC_WEB_URL must be a valid URL"),
  NEXT_PUBLIC_CUSTOMER_URL: z.string().url("NEXT_PUBLIC_CUSTOMER_URL must be a valid URL"),
});

// Helper type merging both configurations
type Env = z.infer<typeof serverSchema> & z.infer<typeof clientSchema>;

const processEnv = {
  NODE_ENV: process.env.NODE_ENV,
  AUTH_SECRET: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  CUSTOMER_SESSION_CACHE_TTL_SEC: process.env.CUSTOMER_SESSION_CACHE_TTL_SEC,
  CUSTOMER_SESSION_MAX_AGE_DAYS: process.env.CUSTOMER_SESSION_MAX_AGE_DAYS,
  CUSTOMER_SESSION_ABSOLUTE_TIMEOUT_DAYS: process.env.CUSTOMER_SESSION_ABSOLUTE_TIMEOUT_DAYS,
  CUSTOMER_SESSION_IDLE_TIMEOUT_DAYS: process.env.CUSTOMER_SESSION_IDLE_TIMEOUT_DAYS,
  CUSTOMER_MAX_SESSIONS_PER_USER: process.env.CUSTOMER_MAX_SESSIONS_PER_USER,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_CUSTOMER_URL || process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_WEB_URL: process.env.NEXT_PUBLIC_WEB_URL,
  NEXT_PUBLIC_CUSTOMER_URL: process.env.NEXT_PUBLIC_CUSTOMER_URL || process.env.NEXT_PUBLIC_APP_URL,
  JWT_SECRET: process.env.JWT_SECRET,
};

// Validate client variables on both server and browser
const clientResult = clientSchema.safeParse(processEnv);
if (!clientResult.success) {
  console.error("❌ Invalid Customer public environment variables:");
  for (const [key, error] of Object.entries(clientResult.error.format())) {
    if (key !== "_errors") {
      console.error(`   - ${key}: ${(error as { _errors: string[] })._errors.join(", ")}`);
    }
  }
  throw new Error("Configuration validation failed");
}

export const publicEnv = clientResult.data;

// Validate server variables only when running on the server
let validatedServerEnv: z.infer<typeof serverSchema> | null = null;

if (typeof window === "undefined") {
  const serverResult = serverSchema.safeParse(processEnv);
  if (!serverResult.success) {
    console.error("❌ Invalid Customer server environment variables:");
    for (const [key, error] of Object.entries(serverResult.error.format())) {
      if (key !== "_errors") {
        console.error(`   - ${key}: ${(error as { _errors: string[] })._errors.join(", ")}`);
      }
    }
    throw new Error("Configuration validation failed");
  }
  validatedServerEnv = serverResult.data;
}

// Proxied env object providing type-safety and access guards
export const env = new Proxy({} as Env, {
  get(_target, prop) {
    const key = prop.toString();
    const isClient = typeof window !== "undefined";

    if (isClient && !key.startsWith("NEXT_PUBLIC_")) {
      throw new Error(
        `❌ Security Error: Attempted to access server-side environment variable "${key}" on the client!`,
      );
    }

    if (key.startsWith("NEXT_PUBLIC_")) {
      return publicEnv[key as keyof typeof publicEnv];
    }

    return validatedServerEnv?.[key as keyof typeof validatedServerEnv];
  },
});
export default env;
