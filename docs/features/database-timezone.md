# Database Timezone & Date-Time Standards

This document establishes the official timezone configuration standards and date-time handling practices for the Ecom platform. It targets both **Software Developers** (backend/frontend) and **Infrastructure/DevOps Engineers** to ensure data consistency and prevent timezone-shifting bugs.

---

## 1. The Core Standard: Store in UTC, Display in Local

To support scaling, high availability, and future multi-region user bases:

1. **Storage (Database)**: All date-time values must be saved to the database in **UTC (Coordinated Universal Time)**.
2. **Transfer (API)**: All APIs (REST and tRPC) must transmit date-time values in ISO 8601 UTC string format (e.g., `2026-06-25T08:30:00.000Z`).
3. **Presentation (Frontend)**: The client application (browser or mobile app) is responsible for reading the UTC timestamp and formatting it to the user's local timezone.

---

## 2. Why Database-Level Timezone Matters

If a PostgreSQL database is running on a host machine with a local timezone (e.g., Vietnam `Asia/Ho_Chi_Minh` / GMT+7), default values like `DEFAULT CURRENT_TIMESTAMP` or `now()` will write the current local time (e.g., `14:00:00`) into columns typed as `TIMESTAMP(3)` (which lacks timezone data).

When Prisma reads this value, it assumes the timezone-less timestamp is in UTC and appends `Z` (producing `14:00:00Z`). This effectively **shifts the time 7 hours into the future** relative to the actual UTC time (`07:00:00Z`).

### The Session Eviction Case Study (Vietnam Local Timezone GMT+7)
A recent critical login bug demonstrated this impact:
1. Migration SQL altered the `sessions` table, adding `loginAt` and `lastActiveAt` defaulting to `CURRENT_TIMESTAMP`.
2. Because local PostgreSQL was running on Vietnam timezone, all existing rows were populated with Vietnam local time (e.g., `14:24:57`), which Prisma read as `14:24:57Z` (UTC).
3. A user logs in at `15:35:00` local time (actual UTC: `08:35:00Z`). Prisma inserts a session with `lastActiveAt: new Date()` (`08:35:00Z`).
4. During login, a dọn dẹp (cleanup) function runs to enforce `maxSessions = 5` per user, sorting sessions by `lastActiveAt ASC`.
5. Since the newly inserted session (`08:35:00Z`) is older than the incorrectly stored future timestamps of the old sessions (`14:24:57Z`), the cleanup script identified the **brand new session** as the "oldest" and deleted it immediately.
6. The user was caught in an infinite redirect loop back to `/login`.

---

## 3. Infrastructure & DevOps Setup Guide

To ensure all database instances run in UTC, apply the following setups depending on the environment.

### A. Local / Host-Installed PostgreSQL
If running PostgreSQL natively on macOS/Windows, alter the timezone of the databases explicitly.

1. **Alter Database Timezone**:
   Run the following query on the target database (e.g., `ecom2`):
   ```sql
   ALTER DATABASE ecom2 SET timezone TO 'UTC';
   ```
2. **Verify changes**:
   Close the current connection (or restart the GUI tool like Navicat/DBeaver) to establish a fresh connection session. Run:
   ```sql
   SHOW timezone;
   -- Expected output: UTC
   ```

### B. Docker Compose (Local Development & CI)
In `docker-compose.yml`, configure the environment timezone for the PostgreSQL service.

```yaml
services:
  db:
    image: postgres:18-alpine
    environment:
      - TZ=UTC
      - PGTZ=UTC
    ports:
      - "5432:5432"
```

### C. Cloud Databases (AWS RDS, Cloud SQL)
Always verify Cloud DB Parameter Groups:
- **AWS RDS**: Set the `timezone` parameter in the DB Parameter Group associated with your RDS instance to `UTC` (or leave it default as RDS defaults to UTC).
- Ensure no infrastructure automation scripts override the database timezone to region-specific zones.

---

## 4. Developer Coding Guidelines

Developers must adhere to these practices in TypeScript and SQL:

### 1. Generating Date Objects in Code
Always use `new Date()` or `new Date().toISOString()` which naturally generates UTC-anchored date objects in Node.js.
```typescript
// Correct: writes the current absolute UTC time to CSDL
await prisma.session.create({
  data: {
    lastActiveAt: new Date(),
  }
});
```

### 2. Timezone-Safe Session Cleanup
When implementing algorithms that evict older sessions, always **exclude the current session token** from the deletion targets. This protects the active session from deletion even if there is database timezone drift:
```typescript
const sessionsToDelete = existingSessions
  .filter((s) => s.sessionToken !== currentSessionToken) // Safe-guard
  .slice(0, existingSessions.length - maxSessions);
```

### 3. Date-Fns & Timezones
When performing calculations (e.g., checking if a token is expired), use native `Date` comparisons:
```typescript
// Safe and timezone-agnostic
if (dbSession.expires.getTime() < Date.now()) {
  // Expired
}
```

### 4. Database Schema Defs (`schema.prisma`)
Prisma automatically translates timezone-less `DateTime` columns to UTC in JavaScript. Do not attempt to manually add offsets to Date objects before writing to database.
