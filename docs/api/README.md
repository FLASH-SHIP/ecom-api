# Ecom — API Technical Documentation

> **Version**: 2.0 · **Base URL**: `http://localhost:4000/api/v2`
> **Swagger**: `http://localhost:4000/api/v2/docs`

## Mục lục

- [Tổng quan kiến trúc](#tổng-quan-kiến-trúc)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [REST API v2 (NestJS)](#rest-api-v2-nestjs)
- [tRPC API (Web CMS)](#trpc-api-web-cms)
- [Database Schema](#database-schema)
- [Bruno Collection](#bruno-collection)

---

## Tổng quan kiến trúc

Ecom sử dụng **2 API layers** phục vụ các client khác nhau:

| Layer | Framework | Transport | Client | Auth |
|-------|-----------|-----------|--------|------|
| **REST API v2** | NestJS | HTTP JSON | Mobile, Extension, Public | JWT / API Key |
| **tRPC** | tRPC v11 | HTTP (superjson) | Web CMS (Next.js) | NextAuth Session (cookie) |

```
┌─────────────────────────────────────────────────────┐
│                     Clients                         │
├──────────┬──────────────┬───────────┬───────────────┤
│  Web CMS │  Mobile App  │ Extension │  Scripts/CI   │
│ (Next.js)│  (React      │ (Chrome)  │               │
│          │   Native)    │           │               │
├──────────┼──────────────┴───────────┴───────────────┤
│  tRPC    │           REST API v2                    │
│  (cookie)│     (JWT Access Token / API Key)         │
├──────────┴──────────────────────────────────────────┤
│            packages/features (Business Logic)       │
│            packages/prisma (Database)               │
└─────────────────────────────────────────────────────┘
```

---

## Authentication

### 1. JWT Access Token (Mobile / Extension)

Dùng cho: Mobile app (React Native), Chrome Extension.

**Luồng:**

```
1. POST /api/v2/auth/login → { accessToken, refreshToken }
2. Gọi API với header: Authorization: Bearer <accessToken>
3. Khi accessToken hết hạn → POST /api/v2/auth/refresh → { accessToken }
```

**Token Details:**

| Token | TTL | Cách dùng |
|-------|-----|-----------|
| Access Token | 15 phút (mặc định) | `Authorization: Bearer <token>` |
| Refresh Token | 30 ngày (mặc định) | Body param khi gọi refresh endpoint |

**JWT Payload:**

```json
{
  "userId": 1,
  "email": "admin@ecom.com",
  "type": "access",     // "access" | "refresh"
  "iat": 1716900000,
  "exp": 1716900900
}
```

### 2. API Key (Scripts / CI / Integrations)

Dùng cho: Automation scripts, CI/CD pipelines, third-party integrations.

**Format:** Prefix `ecom_` + random string (32 chars)

```
Authorization: Bearer ecom_abc123def456...
```

**Đặc điểm:**
- Không hết hạn (trừ khi set `expiresAt`)
- Hash SHA-256 lưu trong DB, raw key chỉ hiển thị khi tạo
- Track `lastUsedAt` mỗi lần sử dụng

### 3. NextAuth Session (Web CMS only)

Dùng cho: Web CMS (Next.js admin panel).

- Cookie-based (httpOnly, secure)
- Tự động quản lý bởi NextAuth v5
- **Không dùng cho external clients** — chỉ dành cho web app

### Auth Flow Diagram

```
Request → Has "Authorization: Bearer xxx" header?
├── YES → Token starts with "ecom_"?
│   ├── YES → API Key Strategy
│   │   ├── SHA-256 hash → lookup trong DB
│   │   ├── Check expiration
│   │   └── Check user.status === "ACTIVE"
│   └── NO → JWT Strategy
│       ├── Verify JWT signature + expiration
│       ├── Check payload.type === "access"
│       └── Check user.status === "ACTIVE"
└── NO → 401 Unauthorized
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Khi nào? |
|------|---------|----------|
| `200` | Success | Request thành công |
| `201` | Created | Tạo resource mới |
| `400` | Bad Request | Input không hợp lệ |
| `401` | Unauthorized | Chưa đăng nhập / token sai |
| `403` | Forbidden | Không có quyền |
| `404` | Not Found | Resource không tồn tại |
| `422` | Validation Error | Zod/class-validator fail |
| `500` | Internal Error | Server lỗi |

### Error Response Format (REST API v2)

```json
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "error": "Unauthorized"
}
```

### Error Response Format (tRPC)

```json
{
  "error": {
    "message": "Not authenticated",
    "code": -32001,
    "data": {
      "code": "UNAUTHORIZED",
      "httpStatus": 401,
      "path": "auth.me"
    }
  }
}
```

### Error Codes

| Code | HTTP | Mô tả |
|------|------|--------|
| `INVALID_CREDENTIALS` | 401 | Email hoặc password sai |
| `TOKEN_EXPIRED` | 401 | JWT hết hạn |
| `TOKEN_INVALID` | 401 | JWT không hợp lệ |
| `API_KEY_INVALID` | 401 | API Key không tồn tại |
| `API_KEY_EXPIRED` | 401 | API Key hết hạn |
| `FORBIDDEN` | 403 | Không có quyền |
| `INSUFFICIENT_PERMISSIONS` | 403 | Thiếu permission cụ thể |
| `NOT_FOUND` | 404 | Resource không tìm thấy |
| `VALIDATION_ERROR` | 422 | Input validation fail |
| `INTERNAL_ERROR` | 500 | Server error |

---

## REST API v2 (NestJS)

> **Base URL**: `http://localhost:4000/api/v2`

### Health Check

```
GET /api/v2/health
```

**Response** `200`:

```json
{
  "status": "ok",
  "timestamp": "2026-05-29T01:00:00.000Z",
  "service": "ecom-cms-api",
  "version": "2.0.0"
}
```

---

### Auth — Login (JWT)

> ⚠️ **Endpoint chưa implement** — đã có service layer, chỉ cần thêm NestJS controller.

```
POST /api/v2/auth/login
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "admin@ecom.com",
  "password": "password123"
}
```

**Response** `200`:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900,
  "user": {
    "id": 1,
    "email": "admin@ecom.com",
    "name": "Admin"
  }
}
```

---

### Auth — Refresh Token

> ⚠️ **Endpoint chưa implement**

```
POST /api/v2/auth/refresh
Content-Type: application/json
```

**Request Body:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response** `200`:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

---

### Users — Get Current User

```
GET /api/v2/users/me
Authorization: Bearer <accessToken | ecom_apikey>
```

**Response** `200`:

```json
{
  "id": 1,
  "email": "admin@ecom.com",
  "name": "Admin",
  "authMethod": "jwt"
}
```

**Errors:**

| Code | Nguyên nhân |
|------|-------------|
| `401` | Missing/invalid token |
| `403` | User bị suspended/banned |

---

## tRPC API (Web CMS)

> **URL**: `http://localhost:3000/api/trpc`
> **Transport**: HTTP POST, body encoded với superjson
> **Auth**: NextAuth session cookie (tự động)

### Gọi tRPC từ React

```tsx
import { trpc } from "~/lib/trpc";

// Query — lấy profile
const { data } = trpc.auth.me.useQuery();

// Mutation — cập nhật profile
const mutation = trpc.auth.updateProfile.useMutation();
await mutation.mutateAsync({
  name: "New Name",
  locale: "en",
});
```

### Available Procedures

#### `auth.me` (Query, Protected)

Lấy profile user hiện tại kèm roles và permissions.

**Input:** _None_

**Output:**

```json
{
  "id": 1,
  "email": "admin@ecom.com",
  "name": "Admin",
  "username": "admin",
  "locale": "vi",
  "avatarUrl": null,
  "emailVerified": null,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "roles": [
    { "id": "clu...", "name": "admin", "displayName": "Administrator" }
  ],
  "permissions": [
    "blog.posts.create",
    "blog.posts.edit",
    "blog.posts.delete",
    "users.manage"
  ]
}
```

---

#### `auth.updateProfile` (Mutation, Protected)

Cập nhật profile user hiện tại.

**Input:**

```typescript
{
  name?: string;     // min 1, max 100 chars
  username?: string; // min 3, max 50 chars
  locale?: "en" | "vi";
}
```

**Output:** Updated user object

---

## Database Schema

### Core Models

```
┌──────────┐     ┌─────────────┐     ┌────────────┐
│   User   │────▶│ UserPassword│     │  Session   │
│          │────▶│             │     │ (NextAuth) │
│ id       │     └─────────────┘     └────────────┘
│ email    │
│ username │     ┌─────────────┐     ┌────────────┐
│ name     │────▶│   ApiKey    │     │ AccessToken│
│ status   │────▶│ (ecom_xxx)  │     │ (JWT pair) │
│ locale   │     └─────────────┘     └────────────┘
└──────────┘
     │
     ▼
┌──────────────────┐     ┌──────────┐     ┌────────────┐
│UserRoleAssignment│────▶│   Role   │────▶│ Permission │
└──────────────────┘     └──────────┘     └────────────┘
```

### User Status

| Status | Mô tả |
|--------|--------|
| `ACTIVE` | Tài khoản hoạt động bình thường |
| `SUSPENDED` | Tạm ngưng — không thể đăng nhập |
| `BANNED` | Bị cấm vĩnh viễn |

### Blog Models

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│   Post   │────▶│ PostCategory │◀────│ Category │
│          │     └──────────────┘     │ (tree)   │
│ id       │     ┌──────────────┐     └──────────┘
│ title    │────▶│   PostTag    │◀────┌──────────┐
│ slug     │     └──────────────┘     │   Tag    │
│ content  │     ┌──────────────┐     └──────────┘
│ status   │────▶│  PostView    │
│ authorId │     └──────────────┘
└──────────┘
```

### Post Status Flow

```
DRAFT → PENDING → PUBLISHED → ARCHIVED
  ↑        ↑          │
  └────────┘←─────────┘ (revert)
```

---

## Bruno Collection

Bruno collection nằm tại: `docs/api/bruno/`

### Cài đặt Bruno

```bash
# macOS
brew install --cask bruno

# Hoặc download: https://www.usebruno.com/downloads
```

### Sử dụng

1. Mở Bruno
2. **Open Collection** → chọn thư mục `docs/api/bruno/`
3. Chọn environment **Local** (đã cấu hình sẵn `http://localhost:4000`)
4. Gọi API!

### File Structure

```
docs/api/bruno/
├── bruno.json                         # Collection manifest
├── collection.bru                     # Collection root
├── environments/
│   └── local.bru                      # Local env (localhost:4000)
├── auth/
│   ├── login.bru                      # POST /auth/login
│   └── refresh-token.bru              # POST /auth/refresh
├── health/
│   └── health-check.bru               # GET /health
└── users/
    ├── get-current-user.bru           # GET /users/me (JWT)
    └── get-current-user-api-key.bru   # GET /users/me (API Key)
```

### Environment Variables

| Variable | Default | Mô tả |
|----------|---------|--------|
| `baseUrl` | `http://localhost:4000/api/v2` | API base URL |
| `accessToken` | _(empty)_ | JWT access token sau khi login |
| `apiKey` | _(empty)_ | API Key (`ecom_xxx`) |

---

## Conventions cho FE

### Headers

```
Content-Type: application/json
Authorization: Bearer <token>
```

### Pagination (khi implement)

```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

### Date Format

Tất cả dates trả về dạng **ISO 8601**: `2026-05-29T01:00:00.000Z`
