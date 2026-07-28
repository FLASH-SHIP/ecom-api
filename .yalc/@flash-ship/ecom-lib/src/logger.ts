import { AsyncLocalStorage } from "node:async_hooks";
import * as fs from "node:fs";
import * as path from "node:path";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerStore {
  traceId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

const globalForLogger = globalThis as unknown as {
  loggerContext: AsyncLocalStorage<LoggerStore> | undefined;
};

export const loggerContext = globalForLogger.loggerContext ?? new AsyncLocalStorage<LoggerStore>();

if (process.env.NODE_ENV !== "production") {
  globalForLogger.loggerContext = loggerContext;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel | undefined) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

export function setLogLevel(level: LogLevel): void {
  if (LOG_LEVELS[level] !== undefined) {
    currentLevel = level;
  }
}

export function getLogLevel(): LogLevel {
  return currentLevel;
}

// PERF-08: Cache NODE_ENV at module init (doesn't change at runtime)
const IS_PRODUCTION = process.env.NODE_ENV === "production";

function findMonorepoRoot(): string {
  let dir = "";
  try {
    dir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
  } catch {
    dir = process.cwd();
  }
  if (!dir || dir === "/") {
    dir = process.cwd();
  }
  dir = path.resolve(dir);
  while (true) {
    const packageJsonPath = path.join(dir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const content = fs.readFileSync(packageJsonPath, "utf-8");
        if (content.includes('"workspaces"')) {
          return dir;
        }
      } catch {
        // Silently ignore
      }
    }
    const parentDir = path.dirname(dir);
    if (parentDir === dir) {
      break;
    }
    dir = parentDir;
  }
  return process.cwd();
}

const MONOREPO_ROOT = findMonorepoRoot();
const LOGS_DIR = process.env.LOGS_PATH || path.join(MONOREPO_ROOT, "logs");

if (!IS_PRODUCTION) {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    const files = fs.readdirSync(LOGS_DIR);
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    for (const file of files) {
      if (file.startsWith("app-") && file.endsWith(".log")) {
        const filePath = path.join(LOGS_DIR, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > SEVEN_DAYS_MS) {
          try {
            fs.unlinkSync(filePath);
          } catch {
            // Silently ignore if already deleted by another process
          }
        }
      }
    }
  } catch (err) {
    console.warn("Failed to initialize logs folder or prune old logs:", err);
  }
}

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

function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  for (const sensitive of SENSITIVE_KEYS) {
    if (lowerKey.includes(sensitive)) {
      return true;
    }
  }
  return false;
}

function serializeError(err: Error): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };
  for (const [key, value] of Object.entries(err)) {
    serialized[key] = maskSensitiveData(value);
  }
  return serialized;
}

/**
 * Mask sensitive data keys recursively.
 */
export function maskSensitiveData(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map(maskSensitiveData);
  }

  if (data instanceof Date) {
    return data;
  }

  if (data instanceof Error) {
    return serializeError(data);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
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
  const isDev = !IS_PRODUCTION;

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

function writeLogToFile(
  level: LogLevel,
  module: string,
  message: string,
  data?: Record<string, unknown>,
) {
  if (IS_PRODUCTION) return;
  try {
    const dateStr = new Date().toISOString().split("T")[0];
    const filePath = path.join(LOGS_DIR, `app-${dateStr}.log`);
    const store = loggerContext.getStore();
    const traceId = store?.traceId;
    const userId = store?.userId;

    const logLine = JSON.stringify({
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      module,
      traceId,
      userId,
      message,
      ...data,
    });

    fs.appendFile(filePath, `${logLine}\n`, () => {});
  } catch {
    // Fail silently
  }
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
        if (!IS_PRODUCTION) {
          console.debug(formatMessage("debug", module, message), maskedData ?? "");
          writeLogToFile("debug", module, message, maskedData);
        } else {
          console.debug(formatMessage("debug", module, message, maskedData));
        }
      }
    },
    info: (message: string, data?: Record<string, unknown>) => {
      if (shouldLog("info")) {
        const maskedData = data ? (maskSensitiveData(data) as Record<string, unknown>) : undefined;
        if (!IS_PRODUCTION) {
          console.info(formatMessage("info", module, message), maskedData ?? "");
          writeLogToFile("info", module, message, maskedData);
        } else {
          console.info(formatMessage("info", module, message, maskedData));
        }
      }
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      if (shouldLog("warn")) {
        const maskedData = data ? (maskSensitiveData(data) as Record<string, unknown>) : undefined;
        if (!IS_PRODUCTION) {
          console.warn(formatMessage("warn", module, message), maskedData ?? "");
          writeLogToFile("warn", module, message, maskedData);
        } else {
          console.warn(formatMessage("warn", module, message, maskedData));
        }
      }
    },
    error: (message: string, data?: Record<string, unknown>) => {
      if (shouldLog("error")) {
        const maskedData = data ? (maskSensitiveData(data) as Record<string, unknown>) : undefined;
        if (!IS_PRODUCTION) {
          console.error(formatMessage("error", module, message), maskedData ?? "");
          writeLogToFile("error", module, message, maskedData);
        } else {
          console.error(formatMessage("error", module, message, maskedData));
        }
      }
    },
  };
}
