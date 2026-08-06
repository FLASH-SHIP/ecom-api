import { BasePartnerHttpClient, maskSensitiveData, PartnerApiError } from '../../shared/base-partner-http-client';
import type { EpicHubEnvelope } from './dtos/epichub.dto';
import type { EpicHubAuthService } from './epichub-auth.service';

export class EpicHubHttpClient extends BasePartnerHttpClient {
  private baseUrl: string;
  private authService: EpicHubAuthService;

  constructor(baseUrl: string, authService: EpicHubAuthService) {
    super('EpicHub');
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.authService = authService;
  }

  private buildFullUrl(
    endpoint: string,
    queryParams?: Record<string, string | boolean | number | undefined>,
  ): string {
    const fullUrl = `${this.baseUrl}/${endpoint.replace(/^\/+/, '')}`;
    if (!queryParams) return fullUrl;

    const searchParams = new URLSearchParams();
    for (const [k, v] of Object.entries(queryParams)) {
      if (v !== undefined) {
        searchParams.append(k, String(v));
      }
    }
    const queryString = searchParams.toString();
    return queryString ? `${fullUrl}?${queryString}` : fullUrl;
  }

  public async request<T>(
    endpoint: string,
    options: {
      method: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: unknown;
      queryParams?: Record<string, string | boolean | number | undefined>;
      headers?: Record<string, string>;
      isBinaryResponse?: boolean;
    },
    isRetry = false,
  ): Promise<{ envelope?: EpicHubEnvelope<T>; binaryData?: Buffer; rawRequest?: unknown; durationMs?: number }> {
    const token = await this.authService.getSessionToken(isRetry);
    const fullUrl = this.buildFullUrl(endpoint, options.queryParams);

    const headers: Record<string, string> = {
      Token: token,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const fullRawRequest = {
      url: fullUrl,
      method: options.method,
      headers: maskSensitiveData(headers),
      body: options.body ? maskSensitiveData(options.body) : undefined,
    };

    this.logRequest(fullUrl, options.method, headers, options.body);

    const startTime = Date.now();
    const fetchOptions: RequestInit = {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    };

    const res = await fetch(fullUrl, fetchOptions);
    const durationMs = Date.now() - startTime;

    // If 401 Unauthorized and not yet retried, invalidate token and retry once
    if (res.status === 401 && !isRetry) {
      console.warn('[EpicHubHttpClient] Received 401 Unauthorized, invalidating token and retrying request...');
      await this.authService.invalidateToken();
      return this.request<T>(endpoint, options, true);
    }

    if (options.isBinaryResponse) {
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      this.logResponse(fullUrl, res.status, `<Binary Data ${buffer.length} bytes>`, durationMs);
      return { binaryData: buffer, rawRequest: fullRawRequest, durationMs };
    }

    const json = (await res.json()) as EpicHubEnvelope<T>;
    this.logResponse(fullUrl, res.status, json, durationMs);

    // Status 200 or 202 (Accepted - Address Ambiguous Candidates) are valid business responses
    if (json.ResponseStatus?.Code === 200 || json.ResponseStatus?.Code === 202) {
      return { envelope: json, rawRequest: fullRawRequest, durationMs };
    }

    // Handle 4xx / 5xx error responses
    const statusCode = json.ResponseStatus?.Code || res.status;
    const rawMsg = json.ResponseStatus?.Message || json.ResponseStatus?.Error || `EpicHub API Error (Status ${statusCode})`;

    throw new PartnerApiError(
      `[EpicHubHttpClient] EpicHub từ chối yêu cầu (HTTP ${statusCode}): ${rawMsg}`,
      statusCode,
      json,
      fullRawRequest,
      durationMs,
    );
  }
}
