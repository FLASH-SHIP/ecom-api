import { BasePartnerHttpClient } from '../../shared/base-partner-http-client';
import { EpicHubAuthService } from './epichub-auth.service';
import type { EpicHubEnvelope } from './dtos/epichub.dto';

export class EpicHubHttpClient extends BasePartnerHttpClient {
  private baseUrl: string;
  private authService: EpicHubAuthService;

  constructor(baseUrl: string, authService: EpicHubAuthService) {
    super('EpicHub');
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.authService = authService;
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
  ): Promise<{ envelope?: EpicHubEnvelope<T>; binaryData?: Buffer }> {
    const token = await this.authService.getSessionToken(isRetry);

    let fullUrl = `${this.baseUrl}/${endpoint.replace(/^\/+/, '')}`;
    if (options.queryParams) {
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(options.queryParams)) {
        if (v !== undefined) {
          searchParams.append(k, String(v));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        fullUrl += `?${queryString}`;
      }
    }

    const headers: Record<string, string> = {
      Token: token,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    this.logRequest(fullUrl, options.method, headers, options.body);

    const fetchOptions: RequestInit = {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    };

    const res = await fetch(fullUrl, fetchOptions);

    // If 401 Unauthorized and not yet retried, invalidate token and retry once
    if (res.status === 401 && !isRetry) {
      console.warn('[EpicHubHttpClient] Received 401 Unauthorized, invalidating token and retrying request...');
      await this.authService.invalidateToken();
      return this.request<T>(endpoint, options, true);
    }

    if (options.isBinaryResponse) {
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      this.logResponse(fullUrl, res.status, `<Binary Data ${buffer.length} bytes>`);
      return { binaryData: buffer };
    }

    const json = (await res.json()) as EpicHubEnvelope<T>;
    this.logResponse(fullUrl, res.status, json);

    // Status 200 or 202 (Accepted - Address Ambiguous Candidates) are valid business responses
    if (json.ResponseStatus?.Code === 200 || json.ResponseStatus?.Code === 202) {
      return { envelope: json };
    }

    // Handle 4xx / 5xx error responses
    const statusCode = json.ResponseStatus?.Code || res.status;
    const rawMsg = json.ResponseStatus?.Message || json.ResponseStatus?.Error || `EpicHub API Error (Status ${statusCode})`;
    
    let errMsg = rawMsg;
    if (statusCode === 400) {
      errMsg = `EpicHub từ chối yêu cầu (HTTP 400): ${rawMsg}. Vui lòng kiểm tra lại số dư tài khoản EpicHub hoặc thông tin địa chỉ người nhận.`;
    }
    
    throw new Error(`[EpicHubHttpClient] ${errMsg}`);
  }
}
