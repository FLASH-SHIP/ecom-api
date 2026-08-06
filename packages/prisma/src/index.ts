import { AsyncLocalStorage } from "node:async_hooks";
import { createLogger, loggerContext } from "@flash-ship/ecom-lib/logger";
import { PrismaPg } from "@prisma/adapter-pg";
import { readReplicas } from "@prisma/extension-read-replicas";
import { DeviceTokenFactory } from "./factories/DeviceTokenFactory";
import { NotificationFactory } from "./factories/NotificationFactory";
import { NotificationSettingFactory } from "./factories/NotificationSettingFactory";
import { PostFactory } from "./factories/PostFactory";
import { UserFactory } from "./factories/UserFactory";
import {
  ActorType,
  ContentStatus,
  type Customer,
  CustomerStatus,
  CustomsStatus,
  LabelStatus,
  type NotificationTemplate,
  type Order,
  type OrderActivityLog,
  type OrderFeeItem,
  type OrderImport,
  type OrderProduct,
  OrderStatus,
  type OrderTrackingCheckpoint,
  PartnerStatus,
  PaymentStatus,
  Prisma,
  PrismaClient,
  RateCardType,
  RateItemType,
  ServiceType,
  ShippingMethod,
  ShippingOrigin,
  TopupContentStatus,
  type TopupExchangeRateManagement,
  type TopupPaymentMethod,
  type TopupPaymentMethodPartnerRelation,
  type TopupTransaction,
  type TopupTransactionHistory,
  type TopupTransactionWireImage,
  UserStatus,
  VerificationCodeStatus,
} from "./generated/prisma/client";

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
  "PartnerAuditLog",
  "OrderActivityLog",
  "RequestLog",
  "OutboxEvent",
  "Session",
  "CustomerSession",
  "WebhookLog",
  "CustomFieldValue",
  "UserPassword",
  "ApiKey",
  "AccessToken",
  "OrderImport",
];

const SOFT_DELETE_MODELS = [
  "Customer",
  "MediaFolder",
  "MediaFile",
  "Partner",
  "PartnerService",
  "Province",
  "Ward",
  "Post",
  "Category",
  "Tag",
  "Page",
  "PackingType",
];

const SENSITIVE_FIELDS = [
  "hashedPassword",
  "password",
  "token",
  "secret",
  "hashedKey",
  "refreshTokenHash",
  "tokenHash",
];

function sanitizeAuditValues(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  try {
    const jsonString = JSON.stringify(value, (key, val) => {
      if (SENSITIVE_FIELDS.includes(key)) {
        return "[REDACTED]";
      }
      return val;
    });
    return JSON.parse(jsonString);
  } catch {
    return null;
  }
}

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

async function safeWriteAuditLog(data: {
  userId: string | null;
  action: string;
  module: string;
  entityId: string | null;
  entityType: string | null;
  oldValues?: Prisma.InputJsonValue | null;
  newValues?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}) {
  try {
    await basePrisma.auditLog.create({
      data: data as unknown as Prisma.AuditLogCreateInput,
    });
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr?.code === "P2003" && data.userId) {
      try {
        const metaObj =
          data.metadata && typeof data.metadata === "object"
            ? (data.metadata as Record<string, unknown>)
            : {};
        await basePrisma.auditLog.create({
          data: {
            ...data,
            userId: null,
            metadata: {
              ...metaObj,
              actorId: data.userId,
            } as unknown as Prisma.InputJsonValue,
          } as unknown as Prisma.AuditLogCreateInput,
        });
        return;
      } catch {
        // ignore fallback error
      }
    }
    log.error(`Failed to write ${data.action.toLowerCase()} audit log in prisma extension`, {
      error: err,
    });
  }
}

// biome-ignore lint/suspicious/noExplicitAny: prisma extension type safety bypass
const extendedPrisma = (prismaWithReplicas as any).$extends({
  query: {
    $allModels: {
      // biome-ignore lint/suspicious/noExplicitAny: dynamic hook arguments
      async findFirst({ model, args, query }: any) {
        if (SOFT_DELETE_MODELS.includes(model)) {
          args.where = args.where || {};
          if (args.where.deletedAt === undefined) {
            args.where.deletedAt = null;
          }
        }
        return query(args);
      },
      // biome-ignore lint/suspicious/noExplicitAny: dynamic hook arguments
      async findFirstOrThrow({ model, args, query }: any) {
        if (SOFT_DELETE_MODELS.includes(model)) {
          args.where = args.where || {};
          if (args.where.deletedAt === undefined) {
            args.where.deletedAt = null;
          }
        }
        return query(args);
      },
      // biome-ignore lint/suspicious/noExplicitAny: dynamic hook arguments
      async findMany({ model, args, query }: any) {
        if (SOFT_DELETE_MODELS.includes(model)) {
          args.where = args.where || {};
          if (args.where.deletedAt === undefined) {
            args.where.deletedAt = null;
          }
        }
        return query(args);
      },
      // biome-ignore lint/suspicious/noExplicitAny: dynamic hook arguments
      async count({ model, args, query }: any) {
        if (SOFT_DELETE_MODELS.includes(model)) {
          args.where = args.where || {};
          if (args.where.deletedAt === undefined) {
            args.where.deletedAt = null;
          }
        }
        return query(args);
      },
      // biome-ignore lint/suspicious/noExplicitAny: dynamic hook arguments
      async create({ model, args, query }: any) {
        if (AUDIT_EXEMPT_MODELS.includes(model)) {
          return query(args);
        }

        const result = await query(args);

        const store = loggerContext.getStore();
        const userId = store?.userId ? String(store.userId) : null;
        const entityId = getEntityId(result);

        await safeWriteAuditLog({
          userId,
          action: "CREATE",
          module: `${model.toLowerCase()}s`,
          entityId,
          entityType: model,
          newValues: (result
            ? sanitizeAuditValues(result)
            : null) as unknown as Prisma.InputJsonValue,
          ipAddress: store?.ipAddress || null,
          userAgent: store?.userAgent || null,
          metadata: { source: "prisma-extension" },
        });

        return result;
      },
      // biome-ignore lint/suspicious/noExplicitAny: dynamic hook arguments
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: auditing hooks have dynamic logic
      async update({ model, args, query }: any) {
        if (AUDIT_EXEMPT_MODELS.includes(model)) {
          return query(args);
        }

        let oldRecord: unknown = null;
        try {
          const delegateName = getPrismaDelegateName(model);
          if (args.where) {
            const tx = txStorage.getStore();
            const client = (tx || basePrisma) as Record<
              string,
              { findUnique?: (args: unknown) => Promise<unknown> }
            >;
            const delegate = client[delegateName];
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

        let newRecord: unknown = null;
        try {
          const delegateName = getPrismaDelegateName(model);
          if (args.where) {
            const tx = txStorage.getStore();
            const client = (tx || basePrisma) as Record<
              string,
              { findUnique?: (args: unknown) => Promise<unknown> }
            >;
            const delegate = client[delegateName];
            if (delegate && typeof delegate.findUnique === "function") {
              newRecord = await delegate.findUnique({
                where: args.where,
              });
            }
          }
        } catch {
          // ignore
        }

        const store = loggerContext.getStore();
        const userId = store?.userId ? String(store.userId) : null;
        const entityId = getEntityId(result);

        await safeWriteAuditLog({
          userId,
          action: "UPDATE",
          module: `${model.toLowerCase()}s`,
          entityId,
          entityType: model,
          oldValues: (oldRecord
            ? sanitizeAuditValues(oldRecord)
            : null) as unknown as Prisma.InputJsonValue,
          newValues: (newRecord
            ? sanitizeAuditValues(newRecord)
            : result
              ? sanitizeAuditValues(result)
              : null) as unknown as Prisma.InputJsonValue,
          ipAddress: store?.ipAddress || null,
          userAgent: store?.userAgent || null,
          metadata: { source: "prisma-extension" },
        });

        return result;
      },
      // biome-ignore lint/suspicious/noExplicitAny: dynamic hook arguments
      async delete({ model, args, query }: any) {
        if (AUDIT_EXEMPT_MODELS.includes(model)) {
          return query(args);
        }

        let oldRecord: unknown = null;
        try {
          const delegateName = getPrismaDelegateName(model);
          if (args.where) {
            const tx = txStorage.getStore();
            const client = (tx || basePrisma) as Record<
              string,
              { findUnique?: (args: unknown) => Promise<unknown> }
            >;
            const delegate = client[delegateName];
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

        const store = loggerContext.getStore();
        const userId = store?.userId ? String(store.userId) : null;
        const entityId = getEntityId(result);

        await safeWriteAuditLog({
          userId,
          action: "DELETE",
          module: `${model.toLowerCase()}s`,
          entityId,
          entityType: model,
          oldValues: (oldRecord
            ? sanitizeAuditValues(oldRecord)
            : null) as unknown as Prisma.InputJsonValue,
          ipAddress: store?.ipAddress || null,
          userAgent: store?.userAgent || null,
          metadata: { source: "prisma-extension" },
        });

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
      if (prop === "$transaction") {
        const originalTransaction = Reflect.get(target, prop, target) as (
          ...args: unknown[]
        ) => unknown;
        return (
          // biome-ignore lint/suspicious/noExplicitAny: proxy args
          ...args: any[]
        ) => {
          if (typeof args[0] === "function") {
            const callback = args[0];
            args[0] = async (
              // biome-ignore lint/suspicious/noExplicitAny: prisma transaction client
              tx: any,
            ) => {
              return txStorage.run(tx, () => callback(tx));
            };
          }
          return originalTransaction.apply(target, args);
        };
      }
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

export type {
  Customer,
  NotificationTemplate,
  Order,
  OrderActivityLog,
  OrderFeeItem,
  OrderImport,
  OrderProduct,
  OrderTrackingCheckpoint,
  TopupExchangeRateManagement,
  TopupPaymentMethod,
  TopupPaymentMethodPartnerRelation,
  TopupTransaction,
  TopupTransactionHistory,
  TopupTransactionWireImage,
};
export enum TopupType {
  ADDED_FUNDS = "ADDED_FUNDS",
  PAID = "PAID",
  CANCELED = "CANCELED",
  REFUNDED = "REFUNDED",
  ADJUST_BALANCE_INCREASE = "ADJUST_BALANCE_INCREASE",
  ADJUST_BALANCE_DECREASE = "ADJUST_BALANCE_DECREASE",
}

export {
  ActorType,
  ContentStatus,
  CustomerStatus,
  CustomsStatus,
  DeviceTokenFactory,
  LabelStatus,
  NotificationFactory,
  NotificationSettingFactory,
  OrderStatus,
  PartnerStatus,
  PaymentStatus,
  PostFactory,
  Prisma,
  PrismaClient,
  RateCardType,
  RateItemType,
  ServiceType,
  ShippingMethod,
  ShippingOrigin,
  TopupContentStatus,
  UserFactory,
  UserStatus,
  VerificationCodeStatus,
};
