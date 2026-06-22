import { getAuditService } from "@ecom/features/di/containers/AuditService";
import { createLogger } from "@ecom/lib/logger";
import { prisma } from "@ecom/prisma";
import { middleware } from "@ecom/trpc/server/init";

const log = createLogger("tRPC:AuditLog");

const CUSTOMER_SELECT = {
  id: true,
  email: true,
  username: true,
  name: true,
  phone: true,
  avatarUrl: true,
  status: true,
  emailVerified: true,
  dob: true,
  gender: true,
  description: true,
  metadata: true,
};

function sanitizeValues(val: unknown): unknown {
  if (!val || typeof val !== "object") return val;
  const copy = { ...(val as Record<string, unknown>) };
  const sensitiveKeys = [
    "password",
    "hashedPassword",
    "token",
    "tokenHash",
    "refreshTokenHash",
    "re_password",
    "new_password",
    "current_password",
    "password_confirmation",
    "confirmPassword",
  ];
  for (const key of sensitiveKeys) {
    if (key in copy) {
      delete copy[key];
    }
  }
  return copy;
}

/**
 * Middleware factory that logs mutations to the audit trail.
 *
 * Usage:
 *   authedProcedure
 *     .use(auditLog({ module: "posts", action: "CREATE", entityType: "Post" }))
 *     .mutation(async ({ input }) => { ... })
 *
 * After the handler runs successfully, an audit log entry is created.
 * On error, no audit log is created (the mutation did not succeed).
 *
 * The entity ID is extracted from the result if it has an `id` field,
 * or from `input.id` for update/delete operations.
 */
export function auditLog(opts: { module: string; action: string; entityType: string }) {
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: entity ID extraction with type narrowing across result and input
  return middleware(async ({ ctx, getRawInput, next }) => {
    let oldValues: unknown;
    const rawInput = await getRawInput();

    // Fetch old values before mutation is executed for UPDATE and DELETE
    if (ctx.user && (opts.action === "UPDATE" || opts.action === "DELETE")) {
      try {
        let entityId: number | undefined;
        if (rawInput && typeof rawInput === "object" && rawInput !== null && "id" in rawInput) {
          const val = (rawInput as Record<string, unknown>).id;
          if (typeof val === "number") {
            entityId = val;
          } else if (typeof val === "string") {
            entityId = parseInt(val, 10);
          }
        }

        if (entityId && opts.entityType === "Customer") {
          oldValues = await prisma.customer.findUnique({
            where: { id: entityId },
            select: CUSTOMER_SELECT,
          });
        }
      } catch (err) {
        log.warn("Failed to fetch old values for audit", {
          module: opts.module,
          action: opts.action,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const result = await next();

    // Only log successful mutations
    if (result.ok && ctx.user) {
      try {
        const auditService = getAuditService();

        let entityId: string | undefined;
        const resultData = "data" in result ? result.data : undefined;

        // Try to extract entity ID from result or input
        if (
          resultData &&
          typeof resultData === "object" &&
          resultData !== null &&
          "id" in resultData
        ) {
          entityId = String(resultData.id);
        } else if (
          rawInput &&
          typeof rawInput === "object" &&
          rawInput !== null &&
          "id" in rawInput
        ) {
          entityId = String((rawInput as Record<string, unknown>).id);
        }

        // Clean values before writing to DB
        const sanitizedOld = sanitizeValues(oldValues);
        const sanitizedNew = opts.action === "DELETE" ? undefined : sanitizeValues(rawInput);

        await auditService.logAction({
          userId: ctx.user.id,
          action: opts.action,
          module: opts.module,
          entityId,
          entityType: opts.entityType,
          oldValues: sanitizedOld || undefined,
          newValues: sanitizedNew || undefined,
          ipAddress: ctx.ip ?? undefined,
          userAgent: ctx.userAgent ?? undefined,
        });
      } catch (err) {
        log.warn("Failed to log audit action", {
          module: opts.module,
          action: opts.action,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return result;
  });
}
