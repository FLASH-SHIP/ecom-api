export interface MaskingOptions {
  sensitiveKeys?: string[];
  maskValue?: string;
}

export function maskSensitiveData<T>(data: T, options?: MaskingOptions): T {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = options?.sensitiveKeys || [
    'password',
    'password',
    'newpassword',
    'token',
    'authorization',
    'secret',
    'apikey',
  ];
  const maskValue = options?.maskValue || '***MASKED***';

  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item, options)) as unknown as T;
  }

  const maskedObj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sKey) => lowerKey.includes(sKey))) {
      maskedObj[key] = maskValue;
    } else if (value && typeof value === 'object') {
      maskedObj[key] = maskSensitiveData(value, options);
    } else {
      maskedObj[key] = value;
    }
  }

  return maskedObj as T;
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

  protected logResponse(url: string, status: number, body?: unknown): void {
    const maskedBody = body ? maskSensitiveData(body) : undefined;
    console.log(`[${this.providerName} API Incoming Response]`, {
      url,
      status,
      body: maskedBody,
    });
  }
}
