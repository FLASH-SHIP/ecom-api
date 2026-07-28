import { createLogger } from "@flash-ship/ecom-lib/logger";
import { Injectable, type LoggerService } from "@nestjs/common";

@Injectable()
export class NestLogger implements LoggerService {
  private loggers = new Map<string, ReturnType<typeof createLogger>>();

  private getLogger(context?: string) {
    const ctx = context || "Nest";
    let logger = this.loggers.get(ctx);
    if (!logger) {
      logger = createLogger(ctx);
      this.loggers.set(ctx, logger);
    }
    return logger;
  }

  log(message: unknown, ...optionalParams: unknown[]) {
    const { context, data } = this.parseParams(optionalParams);
    this.getLogger(context).info(String(message), data);
  }

  error(message: unknown, ...optionalParams: unknown[]) {
    const { context, data, stack } = this.parseErrorParams(optionalParams);
    const finalData = stack ? { ...data, stack } : data;
    this.getLogger(context).error(String(message), finalData);
  }

  warn(message: unknown, ...optionalParams: unknown[]) {
    const { context, data } = this.parseParams(optionalParams);
    this.getLogger(context).warn(String(message), data);
  }

  debug(message: unknown, ...optionalParams: unknown[]) {
    const { context, data } = this.parseParams(optionalParams);
    this.getLogger(context).debug(String(message), data);
  }

  verbose(message: unknown, ...optionalParams: unknown[]) {
    const { context, data } = this.parseParams(optionalParams);
    this.getLogger(context).debug(String(message), data);
  }

  private parseParams(params: unknown[]): {
    context?: string;
    data?: Record<string, unknown>;
  } {
    let context: string | undefined;
    let data: Record<string, unknown> | undefined;

    if (params.length > 0) {
      const lastParam = params[params.length - 1];
      if (typeof lastParam === "string") {
        context = lastParam;
        const remaining = params.slice(0, -1);
        if (remaining.length > 0) {
          data = this.parseData(remaining);
        }
      } else {
        data = this.parseData(params);
      }
    }

    return { context, data };
  }

  private parseErrorParams(params: unknown[]): {
    context?: string;
    stack?: string;
    data?: Record<string, unknown>;
  } {
    let context: string | undefined;
    let stack: string | undefined;
    let data: Record<string, unknown> | undefined;

    if (params.length > 0) {
      if (typeof params[0] === "string" && params[0].includes("\n")) {
        stack = params[0];
        if (typeof params[1] === "string") {
          context = params[1];
        }
        const remaining = params.slice(2);
        if (remaining.length > 0) {
          data = this.parseData(remaining);
        }
      } else {
        const parsed = this.parseParams(params);
        context = parsed.context;
        data = parsed.data;
      }
    }

    return { context, stack, data };
  }

  private parseData(params: unknown[]): Record<string, unknown> | undefined {
    if (params.length === 0) return undefined;
    const data: Record<string, unknown> = {};
    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      if (param && typeof param === "object" && !Array.isArray(param)) {
        Object.assign(data, param);
      } else {
        data[`meta_${i}`] = param;
      }
    }
    return data;
  }
}
