# Database Read Replica Architecture

This document describes the design, configuration, and developer guidelines for the database read replica architecture implemented in the Ecom platform. We leverage the `@prisma/extension-read-replicas` client extension to route read queries to read replicas while preserving transactional consistency and write path routing.

---

## 1. Architectural Overview

In high-traffic applications, database read operations typically outnumber write operations. By separating read and write traffic:

- **Primary Database**: Dedicated to write operations (`CREATE`, `UPDATE`, `DELETE`) and transaction blocks.
- **Read Replica Database(s)**: Dedicated to read operations (`SELECT`, `COUNT`, `AGGREGATE`).

This segregation reduces the load on the Primary DB and scales reading throughput.

```mermaid
graph TD
    Client[Application Client]
    Proxy[Prisma Client Proxy]
    TxStorage[txStorage AsyncLocalStorage]
    PrimaryDB[(Primary Database - Write/Read)]
    ReplicaDB[(Read Replica Database - Read Only)]

    Client -->|Invokes Query| Proxy
    Proxy -->|Transaction Active?| TxStorage
    TxStorage -->|Yes| PrimaryDB
    Proxy -->|No - Write Operation| PrimaryDB
    Proxy -->|No - Read Operation| ReplicaDB
    
    PrimaryDB -->|Asynchronous Replication| ReplicaDB
```

---

## 2. Configuration & Environment Variables

We support both Single-Database Mode (development/staging) and Multi-Database Mode (production) transparently.

### Environment Variables

Define the database connection strings in your root `.env` or container runtime:

- `DATABASE_URL`: The connection string for the primary database (handles read & write).
- `DATABASE_REPLICA_URL` *(Optional)*: The connection string for a single read replica instance.
- `DATABASE_REPLICA_URLS` *(Optional)*: A comma-separated list of database replica URLs (e.g. `postgresql://replica1,postgresql://replica2`). If both replica configurations are omitted, it defaults to `DATABASE_URL` (single-database fallback).

#### NestJS Schema Validation (`apps/api/src/env.ts`)

```typescript
DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection URL"),
DATABASE_REPLICA_URL: z
  .string()
  .url("DATABASE_REPLICA_URL must be a valid connection URL")
  .optional(),
DATABASE_REPLICA_URLS: z
  .string()
  .optional()
  .describe("Comma-separated list of database replica URLs"),
```

#### Next.js Admin Schema Validation (`apps/admin/src/env.ts`)

```typescript
DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection URL").optional(),
DATABASE_REPLICA_URL: z.string().url("DATABASE_REPLICA_URL must be a valid connection URL").optional(),
DATABASE_REPLICA_URLS: z.string().optional(),
```

### Prisma Client Instantiation (Prisma 7+)

With Prisma 7+, clients must be explicitly initialized with an adapter or acceleration URL. In `packages/prisma/src/index.ts`, we instantiate distinct pg adapter instances for both primary and replicas:

```typescript
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DATABASE_POOL_MAX) || 10,
});

// Parse multiple replica URLs, falling back to DATABASE_REPLICA_URL then DATABASE_URL
const replicaUrls = process.env.DATABASE_REPLICA_URLS
  ? process.env.DATABASE_REPLICA_URLS.split(",").map((url) => url.trim())
  : [process.env.DATABASE_REPLICA_URL || process.env.DATABASE_URL!];

const replicaClients = replicaUrls.map((url) => {
  const replicaAdapter = new PrismaPg({
    connectionString: url,
    max: Number(process.env.DATABASE_POOL_MAX) || 10,
  });
  return new PrismaClient({
    adapter: replicaAdapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
});

const hasReplicas = !!(process.env.DATABASE_REPLICA_URLS || process.env.DATABASE_REPLICA_URL);
const prismaWithReplicas = hasReplicas
  ? basePrisma.$extends(
      readReplicas({
        replicas: replicaClients,
      }),
    )
  : basePrisma.$extends({
      client: {
        $primary<T>(this: T): T {
          return this;
        },
        $replica<T>(this: T): T {
          return this;
        },
      },
    });

const extendedPrisma = prismaWithReplicas.$extends({
  // other extensions (e.g. audit logs, etc.)
});
```

---

## 3. Query Routing Behavior

The `@prisma/extension-read-replicas` extension inspects every Prisma client invocation and automatically routes it.

| Prisma Method | Target Instance | Notes |
| :--- | :--- | :--- |
| `findUnique`, `findFirst`, `findMany` | **Replica** | Routed to replica pool. |
| `count`, `aggregate`, `groupBy` | **Replica** | Routed to replica pool. |
| `create`, `createMany`, `update`, `updateMany` | **Primary** | Always routed to primary database. |
| `delete`, `deleteMany`, `upsert` | **Primary** | Always routed to primary database. |
| `$queryRaw` (Read operations) | **Replica** | Raw SELECT queries route to replica. |
| `$executeRaw` (Write operations) | **Primary** | Raw statements that mutate data route to primary. |
| **All queries inside Transaction** | **Primary** | Bypasses replica entirely to ensure consistency. |

---

## 4. Transaction & Context Integration

Our Ecom platform utilizes a custom Proxy wrapper and `AsyncLocalStorage` (`txStorage` in `packages/prisma/src/index.ts`) to manage database transactions.

### How Transactions Stay Safe

When a transaction is initiated via `runInTransaction(async () => { ... })`:

1. Prisma starts a transaction and creates a dedicated transaction client (`tx`).
2. This transaction client is bound to the current execution context via `txStorage`.
3. The `prisma` export is a Proxy. When it intercepts any query, it checks if `txStorage` has an active store.
4. If a transaction store exists, it delegates the query to that client instead of the replica-extended base client.
5. Consequently, **all** operations (reads and writes) inside `runInTransaction` are executed on the **Primary DB** using the same connection context, satisfying ACID transaction requirements.

---

## 5. Developer Guide: Handling Replication Lag

Because data replication from the Primary database to the Read Replica is asynchronous, there may be a slight lag (typically milliseconds, but can increase under high write load).

### Write-after-Read Consistency

If you write to the database and immediately read that same data, doing so from the replica might yield stale results (an old state or record not found).

#### Avoid writing sequential reads directly from the replica

```typescript
// Ghi dữ liệu vào Primary
const newPost = await this.prisma.post.create({ data: { title: "New Feature" } });

// ĐỌC dữ liệu (Bị điều hướng sang Replica -> Có thể chưa được sync kịp và trả về null!)
const post = await this.prisma.post.findUnique({ where: { id: newPost.id } });
```

#### Recommended bypass replica via `$primary()`

Use `.$primary()` to force Prisma to route a read query to the Primary database instead of the replica:

```typescript
// Ghi dữ liệu vào Primary
const newPost = await this.prisma.post.create({ data: { title: "New Feature" } });

// BẮT BUỘC đọc từ Primary DB để đảm bảo dữ liệu mới nhất
const post = await this.prisma.$primary().post.findUnique({
  where: { id: newPost.id },
  select: { id: true, title: true } // Luôn dùng select thay vì include
});
```

### Time-Sensitive Handlers & Background Workers

Background workers, queue listeners, and event handlers are asynchronous by nature, but they often process data immediately after it has been mutated on the Primary DB.

To ensure consistency in these workflows, apply the following patterns:

#### 1. Outbox Event Processors (Outbox Workers)

Workers that poll the `OutboxEvent` table to publish events to the event bus must always read from the **Primary Database**. If they query a read replica, they may miss newly created events due to replication delay:

```typescript
// Correct - Always queries the primary database to find pending events
const events = await this.prisma.$primary().outboxEvent.findMany({
  where: { status: "PENDING" }
});
```

#### 2. Event Handlers fetching entity state

When an event listener reacts to an event (e.g., `OrderCreatedEvent`) and fetches the entity details from the database:

- **Prefer Event Payloads**: Include the required data directly in the event payload to bypass database reads.
- **Fall back to Primary client**: If you must fetch the state and it is critical (e.g. payment processing or account activation), fetch from the primary database:
  ```typescript
  const order = await this.prisma.$primary().order.findUnique({ where: { id: orderId } });
  ```

#### 3. Cache & Search Index Synchronizers

Processes that sync data to Redis, Elasticsearch, or Algolia upon write events should read from the **Primary Database** to avoid overwriting the caches with stale replica data.

---

## 6. Connection Pool Optimization

By using read replicas, the application instantiates separate connection pools for the primary database and each configured replica database:

1. **Primary Pool**: Configured with `max` connections via the `DATABASE_URL` query parameter or `DATABASE_POOL_MAX`.
2. **Replica Pools**: A separate pool is established per replica URL in `DATABASE_REPLICA_URLS` or `DATABASE_REPLICA_URL`.

### Best Practices for Local Development

To optimize resource usage, if no database replica connection strings (`DATABASE_REPLICA_URL` or `DATABASE_REPLICA_URLS`) are configured in the environment variables:
1. **Dynamic Bypass**: The `@prisma/extension-read-replicas` extension is bypassed completely. No secondary connection pools are established, saving local database connection slots.
2. **API Compatibility**: The client is extended with lightweight, fallback `$primary()` and `$replica()` methods that simply return `this` (the main client instance). This ensures local code invoking these methods continues to compile and execute successfully without throwing type errors.

If you explicitly configure replica URLs in local development pointing to the same database instance, make sure to monitor the database connection limit and append `connection_limit` to your connection strings:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ecom?connection_limit=5"
```

---

## 7. Production Resilience & Failover Strategy

Prisma extension `@prisma/extension-read-replicas` does not natively perform automatic retry or database routing failover when a replica server dies. If a replica is unreachable, the extension will throw a connection exception.

### Future Roadmap Strategy for High Availability (HA)

To ensure the application remains resilient even if replicas go offline:

1. **Infrastructure Load Balancing (Recommended)**:
   Place a load balancer (such as **HAProxy** or an AWS RDS DNS endpoint) between the application and the read replica nodes. The application configures a single replica URL pointing to the load balancer, which performs health checks and removes offline database nodes automatically.
2. **NestJS Terminus Health Checks**:
   Create a database health indicator checking the replica connection status. Example endpoint in NestJS:
   ```typescript
   @Get('health/replica')
   @HealthCheck()
   async checkReplica() {
     return this.health.check([
       async () => this.prisma.$replica().$queryRaw`SELECT 1`,
     ]);
   }
   ```

---

## 8. Advanced Connection Pool Tuning with PgBouncer

As the application scales out (multiple API container instances/pods), the total number of PostgreSQL connections can exceed PostgreSQL’s `max_connections` limit.

### Using PgBouncer in Transaction Mode

- Configure PgBouncer between the application and the PostgreSQL instances.
- **Primary Connection**: Must use PgBouncer in **Transaction Mode** (or Session Mode) to support Prisma transactions.
- **Replica Connection**: Since replicas only handle read-only, non-transactional queries, PgBouncer can run in aggressive **Transaction Mode** to reuse connections instantly.
- Set `pgbouncer=true` and `connection_limit=X` in your database connection strings to restrict individual client pool sizes.
