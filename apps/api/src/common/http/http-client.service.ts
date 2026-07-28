import { createLogger, loggerContext, maskSensitiveData } from "@flash-ship/ecom-lib/logger";
import { Injectable } from "@nestjs/common";

const log = createLogger("HttpClient");

export interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

@Injectable()
export class HttpClientService {
  /**
   * Performs an HTTP request and returns the parsed JSON response.
   * Handles request/response interception for trace propagation, latency tracking, and data masking.
   */
  async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const startTime = Date.now();
    const traceId = loggerContext.getStore()?.traceId;
    const method = options.method ?? "GET";

    // 1. Intercept Request: Propagate trace ID
    const headers = new Headers(options.headers);
    if (traceId) {
      headers.set("x-trace-id", traceId);
    }

    if (options.body && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    // 2. Build URL with query params
    let requestUrl = url;
    if (options.params) {
      const searchParams = new URLSearchParams(options.params);
      const separator = url.includes("?") ? "&" : "?";
      requestUrl = `${url}${separator}${searchParams.toString()}`;
    }

    // Log outgoing request (sensitive payload masked)
    const requestLogPayload: Record<string, unknown> = {
      method,
      url: requestUrl,
    };
    if (options.body && typeof options.body === "string") {
      try {
        requestLogPayload.body = JSON.parse(options.body);
      } catch {
        requestLogPayload.body = options.body;
      }
    }
    log.info(`Sending HTTP Request: ${method} ${requestUrl}`, requestLogPayload);

    try {
      const response = await fetch(requestUrl, {
        ...options,
        headers,
      });

      const duration = Date.now() - startTime;
      const status = response.status;

      let responseData: unknown = null;
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      const maskedResponse = maskSensitiveData(responseData);

      // 3. Intercept Response: Log outcome and status
      if (response.ok) {
        log.info(`HTTP Request Success: ${method} ${requestUrl}`, {
          status,
          durationMs: duration,
          response: maskedResponse,
        });
        return responseData as T;
      }

      log.error(`HTTP Request Failed: ${method} ${requestUrl}`, {
        status,
        durationMs: duration,
        error: responseData,
      });
      throw new Error(`HTTP request failed with status ${status}: ${JSON.stringify(responseData)}`);
    } catch (err) {
      const duration = Date.now() - startTime;
      log.error(`HTTP Request Exception: ${method} ${requestUrl}`, {
        durationMs: duration,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async get<T>(
    url: string,
    params?: Record<string, string>,
    options: Omit<RequestOptions, "method" | "params"> = {},
  ): Promise<T> {
    return this.request<T>(url, { ...options, method: "GET", params });
  }

  async post<T>(
    url: string,
    body: unknown,
    options: Omit<RequestOptions, "method" | "body"> = {},
  ): Promise<T> {
    const stringifiedBody = typeof body === "object" ? JSON.stringify(body) : (body as string);
    return this.request<T>(url, { ...options, method: "POST", body: stringifiedBody });
  }

  async put<T>(
    url: string,
    body: unknown,
    options: Omit<RequestOptions, "method" | "body"> = {},
  ): Promise<T> {
    const stringifiedBody = typeof body === "object" ? JSON.stringify(body) : (body as string);
    return this.request<T>(url, { ...options, method: "PUT", body: stringifiedBody });
  }

  async delete<T>(url: string, options: Omit<RequestOptions, "method"> = {}): Promise<T> {
    return this.request<T>(url, { ...options, method: "DELETE" });
  }
}
