type LogLevel = "debug" | "info" | "warn" | "error";

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

function formatMessage(level: LogLevel, module: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `${timestamp} [${level.toUpperCase()}] [${module}] ${message}`;
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
