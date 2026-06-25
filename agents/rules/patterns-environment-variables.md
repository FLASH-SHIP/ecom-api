# Environment Variables Best Practices

To maintain type-safety, robust error-handling during bootstrap, and uniform configuration access, Ecom enforces centralized schema-validated environment configurations.

## Rules

### 1. Centralized Schema Validation
- All environment variables used in any application (NestJS `@ecom/api`, Next.js `@ecom/admin`, etc.) **MUST** be defined and validated in the application's central `env.ts` schema (typically utilizing Zod).
- Avoid scattered type-casting or fallback definitions at the call site.

### 2. Never Access `process.env` Directly
- Do not reference `process.env.VARIABLE_NAME` directly in controllers, services, repositories, interceptors, or helpers.
- **In NestJS (API)**: Inject and query `ConfigService` from `@nestjs/config`.
- **In Next.js (Web)**: Use the validated environment variables export module.

### 3. Coerce Values at the Boundary
- Use Zod schemas to parse and coerce types (e.g., `z.coerce.number()`, preprocess booleans) so that variables are correctly typed (like `number` or `boolean`) at the boundary.

---

## Code Examples

### Bad Practice

```typescript
// timeout.interceptor.ts
const defaultTimeout = process.env.API_TIMEOUT_MS ? Number(process.env.API_TIMEOUT_MS) : 10000;
```

### Good Practice

1. **Register in `env.ts`**:
```typescript
// env.ts
export const apiEnvSchema = z.object({
  // ...
  API_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
});
```

2. **Access via Dependency Injection**:
```typescript
// timeout.interceptor.ts
@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const defaultTimeout = this.configService.get<number>("API_TIMEOUT_MS") ?? 10000;
    // ...
  }
}
```
