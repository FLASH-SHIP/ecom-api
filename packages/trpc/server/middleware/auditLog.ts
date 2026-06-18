import { getAuditService } from "@ecom/features/di/containers/AuditService";
import { createLogger } from "@ecom/lib/logger";
import { middleware } from "@ecom/trpc/server/init";

const log = createLogger("tRPC:AuditLog");

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
    const result = await next();

    // Only log successful mutations
    if (result.ok && ctx.user) {
      try {
        const auditService = getAuditService();
        const rawInput = await getRawInput();

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

        await auditService.logAction({
          userId: ctx.user.id,
          action: opts.action,
          module: opts.module,
          entityId,
          entityType: opts.entityType,
          newValues: opts.action === "DELETE" ? undefined : rawInput,
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
