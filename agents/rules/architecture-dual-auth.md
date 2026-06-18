---
title: Dual Auth Architecture - NextAuth (Web) + JWT Tokens (Mobile/Extension)
impact: CRITICAL
impactDescription: Core security architecture supporting multiple client types
tags: architecture, auth, nextauth, jwt, mobile, security
---

## Dual Auth Architecture

**Impact: CRITICAL**

Ecom supports multiple client types (Web, Mobile, Chrome Extension) that require different authentication mechanisms:

### Auth Methods

| # | Method | Client | Transport | TTL |
|---|--------|--------|-----------|-----|
| 1 | **NextAuth Session** | Admin Web | httpOnly Cookie | Session-based |
| 2 | **API Key** (`ecom_xxx`) | Scripts, CI | Bearer header | Long-lived |
| 3 | **JWT Access Token** | Mobile, Extension | Bearer header | 15 minutes |
| 4 | **JWT Refresh Token** | Mobile, Extension | Request body | 30 days |

### NestJS ApiAuthStrategy Flow

The NestJS API uses a **multi-strategy Passport guard** that tries auth methods in order:

```typescript
async authenticate(request) {
  const bearerToken = request.get("Authorization")?.replace("Bearer ", "");

  // 1. API Key (prefix "ecom_")
  if (bearerToken && isApiKey(bearerToken, "ecom_")) {
    return this.authenticateApiKey(bearerToken, request);
  }

  // 2. JWT Access Token
  if (bearerToken) {
    return this.authenticateAccessToken(bearerToken, request);
  }

  // 3. NextAuth session cookie (fallback)
  const nextAuthToken = await getToken({ req: request, secret });
  if (nextAuthToken) {
    return this.authenticateNextAuth(nextAuthToken, request);
  }

  throw new UnauthorizedException();
}
```

### Security Rules

| Rule | Detail |
|------|--------|
| Access Token TTL | 15 minutes (short-lived) |
| Refresh Token TTL | 30 days |
| Refresh Token Rotation | Every refresh invalidates old token, issues new pair |
| Token Storage (DB) | SHA256 hashed — never store raw tokens |
| API Key format | `ecom_` prefix + 32 random characters |
| Rate Limiting | Login: 6/min, Refresh: 20/min |
| Sensitive fields | NEVER expose `password`, `hashedKey`, `tokenHash`, `refreshTokenHash` |

### Correct (Web — NextAuth):

```typescript
// apps/web/app/api/auth/[...nextauth]/route.ts
export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const user = await authService.validateCredentials(
          credentials.email, credentials.password
        );
        return user;
      },
    }),
  ],
  session: { strategy: "database" },
};
```

### Correct (Mobile — JWT):

```typescript
// apps/api/v2/src/modules/auth/controllers/auth.controller.ts
@Post("login")
async login(@Body() body: LoginDto) {
  const user = await this.authService.validateCredentials(body.email, body.password);
  const tokens = await this.tokenService.createTokenPair(user.id, "mobile");
  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user };
}

@Post("refresh")
async refresh(@Body() body: RefreshDto) {
  // Rotate: invalidate old, issue new pair
  return this.tokenService.refreshTokenPair(body.refreshToken);
}
```

### Incorrect (exposing sensitive data):

```typescript
// BAD — leaks password hash and tokens
const user = await prisma.user.findFirst({
  include: { password: true, apiKeys: true, accessTokens: true }
});
return user; // Sensitive fields in response!
```
