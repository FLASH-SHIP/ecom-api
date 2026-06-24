---
title: Outbound HTTP Tracing Client
impact: HIGH
impactDescription: Propagates active context trace ID to external APIs and enforces latency logging & data masking
tags: patterns, http, trace-id, async-local-storage, fetching, masking
---

## Use Scoped HTTP Client for Outbound Requests

**Impact: HIGH**

When making HTTP calls to external services (e.g., payment gateways, external inventory checkers, third-party hooks), do not call raw fetch or default external clients directly. Always use the standardized `HttpClientService` to ensure:
1. **Trace ID Propagation**: The active `traceId` from the current request's `AsyncLocalStorage` is automatically injected into outbound headers (e.g., `x-trace-id`) to preserve distributed tracing context.
2. **Standard Logging**: Outgoing requests, response outcomes, HTTP statuses, and latencies (durations) are consistently logged.
3. **Data Masking**: Request bodies and response payloads are recursively filtered using `maskSensitiveData` to prevent leaks of API keys, passwords, and sensitive keys.

---

## Pattern Implementation

We expose this through a global `HttpClientService` built on top of native Node.js `fetch`.

### Incorrect (Raw untraced outbound requests):

```typescript
// Bad: No trace ID propagation, no masking, no latency logging
const response = await fetch("https://api.thirdparty.com/checkout", {
  method: "POST",
  body: JSON.stringify({ cardToken, password, amount }),
});
const data = await response.json();
```

### Correct (Standardized HttpClientService):

```typescript
import { Injectable } from "@nestjs/common";
import { HttpClientService } from "../common/http/http-client.service";

@Injectable()
export class CheckoutService {
  constructor(private readonly http: HttpClientService) {}

  async processPayment(cardToken: string, amount: number) {
    // Correct: Will automatically inject traceId header, measure latency, and mask "cardToken" in logs
    const result = await this.http.post<PaymentResponse>(
      "https://api.thirdparty.com/checkout",
      { cardToken, amount }
    );
    return result;
  }
}
```

---

## How Request Interception and Tracing Work

When `HttpClientService.request()` is invoked:
- It fetches the active trace ID context via `loggerContext.getStore()?.traceId`.
- If present, it attaches the `x-trace-id` header to the outgoing fetch request.
- It intercepts the payload body and applies `maskSensitiveData` before sending request logs.
- It triggers the request, resolves the response (as JSON or Text), measures total request duration, masks response payload data, and outputs matching info/error logs.

---

## Common Mistakes to Avoid

*   **Mistake 1: Adding unused third-party dependencies**
    Modern Node.js versions (18+) support `fetch` natively. Avoid importing large dependencies like Axios or `@nestjs/axios` unless explicit configurations (like advanced proxying) are requested, which keeps the build footprint minimal and avoids dependency creep.
*   **Mistake 2: Logging unmasked raw payloads**
    Never dump raw request or response payloads directly into stdout logs. Always pass outgoing request bodies and incoming response JSON objects through the `maskSensitiveData` helper before writing to logs.
