import { AsyncLocalStorage } from "node:async_hooks";

type LogLevel = "debug" | "info" | "warn" | "error";

export const loggerContext = new AsyncLocalStorage<{ traceId: string }>();

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

function formatMessage(level: LogLevel, module: string, message: string): string {
  const timestamp = new Date().toISOString();
  const store = loggerContext.getStore();
  const traceId = store?.traceId;
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    const color = COLORS[level];
    const levelStr = level.toUpperCase();
    const moduleColor = "\x1b[35m"; // Magenta
    const traceColor = "\x1b[90m"; // Dark grey
    const traceSegment = traceId ? ` ${traceColor}[${traceId}]${COLOR_RESET}` : "";
    return `${timestamp} ${color}[${levelStr}]${COLOR_RESET} ${moduleColor}[${module}]${COLOR_RESET}${traceSegment} ${message}`;
  }

  const traceSegment = traceId ? ` [${traceId}]` : "";
  return `${timestamp} [${level.toUpperCase()}] [${module}]${traceSegment} ${message}`;
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
        console.debug(formatMessage("debug", module, message), data ?? "");
      }
    },
    info: (message: string, data?: Record<string, unknown>) => {
      if (shouldLog("info")) {
        console.info(formatMessage("info", module, message), data ?? "");
      }
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      if (shouldLog("warn")) {
        console.warn(formatMessage("warn", module, message), data ?? "");
      }
    },
    error: (message: string, data?: Record<string, unknown>) => {
      if (shouldLog("error")) {
        console.error(formatMessage("error", module, message), data ?? "");
      }
    },
  };
}
