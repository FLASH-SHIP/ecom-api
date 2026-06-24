---
title: Request Tracing & Context Correlation
impact: HIGH
impactDescription: Leverages AsyncLocalStorage to correlate logs and trace requests across modules without parameter passing
tags: patterns, middleware, logging, async-local-storage, trace-id, debugging
---

## Use AsyncLocalStorage Tracing for Log Correlation

**Impact: HIGH**

In asynchronous applications, multiple HTTP requests are handled concurrently. Passing a request context or trace ID parameter down through every service, repository, and helper function is highly coupled and error-prone.

Use the request tracing pattern powered by Node's native `AsyncLocalStorage`. A global middleware wraps the request execution flow, storing a unique `traceId` (and optionally `userId` upon authorization) that is dynamically accessed by the logger.

---

## Pattern Implementation

### 1. Declare Scoped Storage:
The storage container is declared in the logger library package:
```typescript
// packages/lib/src/logger.ts
import { AsyncLocalStorage } from "node:async_hooks";

export const loggerContext = new AsyncLocalStorage<{ traceId: string; userId?: number }>();
```

### 2. Register Middleware:
`TraceLoggerMiddleware` intercepts all incoming requests, extracts (or generates) the trace ID, writes it to the response header (enabling client tracing), and runs the request handlers inside the storage boundary:
```typescript
// apps/api/src/common/middleware/trace-logger.middleware.ts
@Injectable()
export class TraceLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const traceId = (req.headers["x-trace-id"] as string) || randomUUID();
    res.setHeader("x-trace-id", traceId);

    loggerContext.run({ traceId }, () => {
      next();
    });
  }
}
```

### 3. Log Output Mapping:
Whenever `createLogger("ModuleName")` compiles a message, it retrieves the active context from `loggerContext.getStore()`. In production, this data is formatted into structured JSON logs:
```json
{
  "timestamp": "2026-06-24T14:45:00Z",
  "level": "INFO",
  "module": "AuthService",
  "traceId": "c92c3a50-9d2a-4c28-9bc9-8e4a5d852a3f",
  "userId": 42,
  "message": "User login succeeded"
}
```

---

## Common Mistakes to Avoid

*   **Mistake 1: Invoking asynchronous calls outside the context boundary**
    All callback queues, timeouts (`setTimeout`), or promises spawned inside the route request must stay bound to the execution thread to preserve the store. Avoid stripping or escaping the context during asynchronous handoffs.
*   **Mistake 2: Manually logging the traceId in message strings**
    Do not write logging statements like `log.info(`[${traceId}] User saved`)`. The logger resolves the trace ID context implicitly; let it parse the context silently to keep log strings clean.
