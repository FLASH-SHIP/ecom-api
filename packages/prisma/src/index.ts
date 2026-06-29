import { AsyncLocalStorage } from "node:async_hooks";
import { createLogger, loggerContext } from "@ecom/lib/logger";
import { PrismaPg } from "@prisma/adapter-pg";
import { readReplicas } from "@prisma/extension-read-replicas";
import { PostFactory } from "./factories/PostFactory";
import { UserFactory } from "./factories/UserFactory";
import {
  ContentStatus,
  CustomerStatus,
  Prisma,
  PrismaClient,
  UserStatus,
  VerificationCodeStatus,
} from "./generated/prisma/client";

console.log("DATABASE_URL in prisma package index.ts:", process.env.DATABASE_URL);
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DATABASE_POOL_MAX) || 10,
});

// Parse multiple replica URLs, falling back to DATABASE_REPLICA_URL then DATABASE_URL
const replicaUrls = process.env.DATABASE_REPLICA_URLS
  ? process.env.DATABASE_REPLICA_URLS.split(",").map((url) => url.trim())
  : [process.env.DATABASE_REPLICA_URL || (process.env.DATABASE_URL ?? "")];

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

// Storage for active transaction client
export const txStorage = new AsyncLocalStorage<unknown>();

const log = createLogger("PrismaExtension");

const globalForPrisma = globalThis as unknown as {
  basePrisma: PrismaClient | undefined;
  prisma: unknown;
};

const basePrisma =
  globalForPrisma.basePrisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

const AUDIT_EXEMPT_MODELS = [
  "AuditLog",
  "RequestLog",
  "OutboxEvent",
  "Session",
  "CustomerSession",
  "WebhookLog",
  "CustomFieldValue",
  "UserPassword",
  "ApiKey",
  "AccessToken",
];

const getPrismaDelegateName = (modelName: string) => {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
};

const getEntityId = (result: unknown): string | null => {
  if (result && typeof result === "object" && "id" in result) {
    const obj = result as { id: unknown };
    return obj.id !== null && obj.id !== undefined ? String(obj.id) : null;
  }
  return null;
};

// Create base extended prisma client
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
  query: {
    $allModels: {
      async create({ model, args, query }) {
        if (AUDIT_EXEMPT_MODELS.includes(model)) {
          return query(args);
        }

        const result = await query(args);

        try {
          const store = loggerContext.getStore();
          const userId = store?.userId || null;
          const entityId = getEntityId(result);

          await basePrisma.auditLog.create({
            data: {
              userId,
              action: "CREATE",
              module: `${model.toLowerCase()}s`,
              entityId,
              entityType: model,
              newValues: result ? JSON.parse(JSON.stringify(result)) : null,
              metadata: { source: "prisma-extension" },
            },
          });
        } catch (err) {
          log.error("Failed to write create audit log in prisma extension", { error: err });
        }

        return result;
      },
      async update({ model, args, query }) {
        if (AUDIT_EXEMPT_MODELS.includes(model)) {
          return query(args);
        }

        let oldRecord: unknown = null;
        try {
          const delegateName = getPrismaDelegateName(model);
          if (args.where) {
            const delegate = (
              basePrisma as unknown as Record<
                string,
                { findUnique?: (args: unknown) => Promise<unknown> }
              >
            )[delegateName];
            if (delegate && typeof delegate.findUnique === "function") {
              oldRecord = await delegate.findUnique({
                where: args.where,
              });
            }
          }
        } catch {
          // ignore
        }

        const result = await query(args);

        try {
          const store = loggerContext.getStore();
          const userId = store?.userId || null;
          const entityId = getEntityId(result);

          await basePrisma.auditLog.create({
            data: {
              userId,
              action: "UPDATE",
              module: `${model.toLowerCase()}s`,
              entityId,
              entityType: model,
              oldValues: oldRecord ? JSON.parse(JSON.stringify(oldRecord)) : null,
              newValues: result ? JSON.parse(JSON.stringify(result)) : null,
              metadata: { source: "prisma-extension" },
            },
          });
        } catch (err) {
          log.error("Failed to write update audit log in prisma extension", { error: err });
        }

        return result;
      },
      async delete({ model, args, query }) {
        if (AUDIT_EXEMPT_MODELS.includes(model)) {
          return query(args);
        }

        let oldRecord: unknown = null;
        try {
          const delegateName = getPrismaDelegateName(model);
          if (args.where) {
            const delegate = (
              basePrisma as unknown as Record<
                string,
                { findUnique?: (args: unknown) => Promise<unknown> }
              >
            )[delegateName];
            if (delegate && typeof delegate.findUnique === "function") {
              oldRecord = await delegate.findUnique({
                where: args.where,
              });
            }
          }
        } catch {
          // ignore
        }

        const result = await query(args);

        try {
          const store = loggerContext.getStore();
          const userId = store?.userId || null;
          const entityId = getEntityId(result);

          await basePrisma.auditLog.create({
            data: {
              userId,
              action: "DELETE",
              module: `${model.toLowerCase()}s`,
              entityId,
              entityType: model,
              oldValues: oldRecord ? JSON.parse(JSON.stringify(oldRecord)) : null,
              metadata: { source: "prisma-extension" },
            },
          });
        } catch (err) {
          log.error("Failed to write delete audit log in prisma extension", { error: err });
        }

        return result;
      },
    },
  },
});

export type ExtendedPrismaClient = typeof extendedPrisma;

// Proxy to intercept model queries and delegate to transaction client if active
export const prisma: PrismaClient =
  (globalForPrisma.prisma as PrismaClient | undefined) ??
  (new Proxy(extendedPrisma as unknown as Record<string, unknown>, {
    get(target, prop) {
      const tx = txStorage.getStore();
      const activeTarget = (tx ?? target) as Record<string | symbol, unknown>;
      const value = Reflect.get(activeTarget, prop, activeTarget);
      if (typeof value === "function") {
        return value.bind(activeTarget);
      }
      return value;
    },
  }) as unknown as PrismaClient);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.basePrisma = basePrisma;
  globalForPrisma.prisma = prisma;
}

// Transaction manager helper
export async function runInTransaction<T>(work: () => Promise<T>): Promise<T> {
  const currentTx = txStorage.getStore();
  if (currentTx) {
    // Join existing transaction
    return work();
  }

  // Fallback for mock unit tests when postgres is not configured
  const hasDbUrl = process.env.DATABASE_URL && process.env.DATABASE_URL !== "";
  if (!hasDbUrl || process.env.NODE_ENV === "test") {
    return work();
  }

  return basePrisma.$transaction(async (tx) => {
    return txStorage.run(tx, work);
  });
}

export {
  ContentStatus,
  CustomerStatus,
  PostFactory,
  Prisma,
  PrismaClient,
  UserFactory,
  UserStatus,
  VerificationCodeStatus,
};
