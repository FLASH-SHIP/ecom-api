import { AsyncLocalStorage } from "node:async_hooks";

type LogLevel = "debug" | "info" | "warn" | "error";

export const loggerContext = new AsyncLocalStorage<{ traceId: string; userId?: number }>();

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel | undefined) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

const COLOR_RESET = "\x1b[0m";
const COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // Cyan
  info: "\x1b[32m", // Green
  warn: "\x1b[33m", // Yellow
  error: "\x1b[31m", // Red
};

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "authorization",
  "cookie",
  "secret",
  "key",
  "hashedkey",
  "tokenhash",
  "refreshtokenhash",
  "jwt",
  "smtp_pass",
  "smtp_user",
]);

/**
 * Mask sensitive data keys recursively.
 */
export function maskSensitiveData(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map(maskSensitiveData);
  }

  if (data instanceof Error) {
    return data;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    let isSensitive = false;
    for (const sensitive of SENSITIVE_KEYS) {
      if (lowerKey.includes(sensitive)) {
        isSensitive = true;
        break;
      }
    }

    if (isSensitive) {
      result[key] = "[MASKED]";
    } else if (typeof value === "object") {
      result[key] = maskSensitiveData(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function formatMessage(
  level: LogLevel,
  module: string,
  message: string,
  data?: Record<string, unknown>,
): string {
  const timestamp = new Date().toISOString();
  const store = loggerContext.getStore();
  const traceId = store?.traceId;
  const userId = store?.userId;
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    const color = COLORS[level];
    const levelStr = level.toUpperCase();
    const moduleColor = "\x1b[35m"; // Magenta
    const traceColor = "\x1b[90m"; // Dark grey
    const traceSegment = traceId ? ` ${traceColor}[${traceId}]${COLOR_RESET}` : "";
    const userSegment = userId ? ` [User:${userId}]` : "";
    return `${timestamp} ${color}[${levelStr}]${COLOR_RESET} ${moduleColor}[${module}]${COLOR_RESET}${traceSegment}${userSegment} ${message}`;
  }

  return JSON.stringify({
    timestamp,
    level: level.toUpperCase(),
    module,
    traceId,
    userId,
    message,
    ...data,
  });
}

/**
 * Create a scoped logger for a specific module.
 *
 * @example
 * const log = createLogger("AuthService");
 * log.info("User logged in", { userId: 1 });
 * log.error("Login failed", { email: "user@example.com" });
 */
export function createLogger(module: string) {
  return {
    debug: (message: string, data?: Record<string, unknown>) => {
      if (shouldLog("debug")) {
        const maskedData = data ? (maskSensitiveData(data) as Record<string, unknown>) : undefined;
        const isDev = process.env.NODE_ENV !== "production";
        if (isDev) {
          console.debug(formatMessage("debug", module, message), maskedData ?? "");
        } else {
          console.debug(formatMessage("debug", module, message, maskedData));
        }
      }
    },
    info: (message: string, data?: Record<string, unknown>) => {
      if (shouldLog("info")) {
        const maskedData = data ? (maskSensitiveData(data) as Record<string, unknown>) : undefined;
        const isDev = process.env.NODE_ENV !== "production";
        if (isDev) {
          console.info(formatMessage("info", module, message), maskedData ?? "");
        } else {
          console.info(formatMessage("info", module, message, maskedData));
        }
      }
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      if (shouldLog("warn")) {
        const maskedData = data ? (maskSensitiveData(data) as Record<string, unknown>) : undefined;
        const isDev = process.env.NODE_ENV !== "production";
        if (isDev) {
          console.warn(formatMessage("warn", module, message), maskedData ?? "");
        } else {
          console.warn(formatMessage("warn", module, message, maskedData));
        }
      }
    },
    error: (message: string, data?: Record<string, unknown>) => {
      if (shouldLog("error")) {
        const maskedData = data ? (maskSensitiveData(data) as Record<string, unknown>) : undefined;
        const isDev = process.env.NODE_ENV !== "production";
        if (isDev) {
          console.error(formatMessage("error", module, message), maskedData ?? "");
        } else {
          console.error(formatMessage("error", module, message, maskedData));
        }
      }
    },
  };
}
