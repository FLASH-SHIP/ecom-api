---
title: Interceptor-Based Auditing System
impact: HIGH
impactDescription: Automatically audits user data changes on route methods using interceptors and custom decorators
tags: patterns, audit, logging, interceptor, metadata, security
---

## Use Interceptor-Based Auditing for Automated Logs

**Impact: HIGH**

To track changes and operations on sensitive business resources, do not manually invoke the logging/auditing services in every controller endpoint. Instead, apply the interceptor-auditing pattern using a custom `@Audit(action: string, entityType?: string)` metadata decorator and `AuditInterceptor`.

This ensures:
1. **Decoupled Audit Logic**: Controllers remain focused on request routing; auditing happens asynchronously on method resolution.
2. **Standardized Extraction**: Automatically extracts client parameters (User IP, User Agent, Route URL), binds the database table/entity type (`entityType`), and resolves the target entity ID from the returned REST payload (e.g., `response.data.id`).
3. **Non-blocking Operations**: Audit writes run asynchronously in fire-and-forget blocks to avoid blocking the client response.

---

## Pattern Implementation

### Incorrect (Manual Service Call inside Controller):

```typescript
// Bad: Polluting controller logic with repetitive auditing steps
@Post()
async createSubmission(@Body() body: CreateSubmissionDto) {
  const result = await this.contactService.createSubmission(body);
  await this.auditService.logAction({
    action: "CREATE_CONTACT_SUBMISSION",
    entityType: "ContactSubmission",
    entityId: String(result.id),
    newValues: body,
  });
  return result;
}
```

### Correct (Decorator and Interceptor Auditing):

**1. Annotate Route Handler:**
```typescript
import { Audit } from "../../common/decorators/audit.decorator";
import { AuditInterceptor } from "../../common/interceptors/audit.interceptor";

@Controller("contacts")
export class ContactsController {
  @Post()
  @UseInterceptors(AuditInterceptor)
  @Audit("CREATE_CONTACT_SUBMISSION", "ContactSubmission") // Binds action & entityType metadata
  async createSubmission(@Body() body: CreateSubmissionDto) {
    const submission = await getContactService().createSubmission(body);
    return { data: submission };
  }
}
```

**2. AuditInterceptor Processing:**
- The interceptor reads `@Audit()` metadata from the route handler.
- If present, it executes the route logic.
- Upon handler return, it extracts `id` dynamically from response payload (`res.data.id` or `res.id`).
- It fires an async call to `AuditService.logAction()` populated with metadata (user IP, HTTP method, URL, user agent, request body, and `entityType`).

---

## Common Mistakes to Avoid

*   **Mistake 1: Blocking the response**
    Do not `await` the audit service write within the interceptor `tap` block. Run it as a fire-and-forget call (using `.catch(...)` error handling) to ensure any logging database delay does not degrade API latency for the client.
*   **Mistake 2: Missing Entity ID Extraction**
    Audit logs are useful only if they are traceable to a specific entity. Ensure the interceptor's extraction logic matches the standard REST return structure of the API (e.g., handles payloads wrapped in `{ data: { id: ... } }`).
