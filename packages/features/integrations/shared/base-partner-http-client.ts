export interface MaskingOptions {
  sensitiveKeys?: string[];
  maskValue?: string;
}

export function maskSensitiveData<T>(
  data: T,
  options?: MaskingOptions,
  seen = new WeakSet<object>(),
): T {
  if (!data || typeof data !== 'object') {
    return data;
  }

  // Prevent infinite recursion on circular reference structures
  if (seen.has(data as object)) {
    return '[Circular]' as unknown as T;
  }
  seen.add(data as object);

  const sensitiveKeys = options?.sensitiveKeys || [
    'password',
    'newpassword',
    'token',
    'authorization',
    'secret',
    'apikey',
    'access_token',
    'cardnumber',
    'creditcard',
    'cvv',
    'ssn',
    'privatekey',
  ];
  const maskValue = options?.maskValue || '***MASKED***';

  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item, options, seen)) as unknown as T;
  }

  const maskedObj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sKey) => lowerKey.includes(sKey))) {
      maskedObj[key] = maskValue;
    } else if (value && typeof value === 'object') {
      maskedObj[key] = maskSensitiveData(value, options, seen);
    } else {
      maskedObj[key] = value;
    }
  }

  return maskedObj as T;
}

export class PartnerApiError extends Error {
  public readonly statusCode: number;
  public readonly rawResponse?: unknown;
  public readonly rawRequest?: unknown;
  public readonly durationMs?: number;

  constructor(
    message: string,
    statusCode: number,
    rawResponse?: unknown,
    rawRequest?: unknown,
    durationMs?: number,
  ) {
    super(message);
    this.name = 'PartnerApiError';
    this.statusCode = statusCode;
    this.rawResponse = rawResponse;
    this.rawRequest = rawRequest;
    this.durationMs = durationMs;
  }
}

export async function withPartnerRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; delayMs?: number; actionName?: string } = {},
): Promise<T> {
  const maxRetries = options.retries ?? 3;
  const initialDelay = options.delayMs ?? 500;
  const actionName = options.actionName || 'Partner API Operation';

  let attempt = 0;
  while (true) {
    attempt++;
    try {
      return await fn();
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      const isTransientError =
        /429|502|503|504|ECONNRESET|ETIMEDOUT|fetch failed|timeout/i.test(errMsg);

      if (!isTransientError || attempt > maxRetries) {
        throw err;
      }

      const backoffMs = initialDelay * 2 ** (attempt - 1) + Math.random() * 200;
      console.warn(
        `[PartnerRetry] Warning: ${actionName} failed with transient error (${errMsg}). Retrying attempt ${attempt}/${maxRetries} in ${Math.round(backoffMs)}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
}

export abstract class BasePartnerHttpClient {
  protected providerName: string;

  constructor(providerName: string) {
    this.providerName = providerName;
  }

  protected logRequest(url: string, method: string, headers?: Record<string, unknown>, body?: unknown): void {
    const maskedHeaders = headers ? maskSensitiveData(headers) : undefined;
    const maskedBody = body ? maskSensitiveData(body) : undefined;
    console.log(`[${this.providerName} API Outgoing Request]`, {
      method,
      url,
      headers: maskedHeaders,
      body: maskedBody,
    });
  }

  protected logResponse(url: string, status: number, body?: unknown, durationMs?: number): void {
    const maskedBody = body ? maskSensitiveData(body) : undefined;
    console.log(`[${this.providerName} API Incoming Response]`, {
      url,
      status,
      durationMs: durationMs !== undefined ? `${durationMs}ms` : undefined,
      body: maskedBody,
    });
  }
}
