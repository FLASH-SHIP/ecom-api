import { createHash, randomBytes } from "node:crypto";
import { getApiKeyRepository } from "@ecom/features/di/containers/AuthService";
import { authedProcedure } from "@flash-ship/ecom-trpc/server/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const list = authedProcedure.query(async ({ ctx }) => {
  const repo = getApiKeyRepository();
  return await repo.findManyByOwner(ctx.user.id, "Customer");
});

export const create = authedProcedure
  .input(
    z.object({
      label: z.string().min(1).max(100).optional().nullable(),
      expiresAt: z.date().optional().nullable(),
      allowedIps: z.array(z.string()).optional().nullable(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const repo = getApiKeyRepository();

    // 1. Enforce Key limit check (default to 10)
    const limit = process.env.API_KEYS_LIMIT_PER_OWNER
      ? Number.parseInt(process.env.API_KEYS_LIMIT_PER_OWNER, 10)
      : 10;

    const count = await repo.countByOwner(ctx.user.id, "Customer");
    if (count >= limit) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: `Tài khoản đã đạt giới hạn tối đa ${limit} API Key. Vui lòng xóa bớt để tạo mới.`,
      });
    }

    // 2. Generate secure key
    const prefix = "ecom_cust_";
    const rawKey = prefix + randomBytes(24).toString("hex");
    const hashedKey = createHash("sha256").update(rawKey).digest("hex");
    const maskedKey = `${prefix}***${rawKey.slice(-4)}`;

    await repo.create({
      ownerId: ctx.user.id,
      ownerType: "Customer",
      hashedKey,
      maskedKey,
      label: input.label,
      expiresAt: input.expiresAt,
      allowedIps: input.allowedIps || [],
    });

    // Return raw key to the client ONLY ONCE on creation
    return {
      rawKey,
      maskedKey,
    };
  });

export const revoke = authedProcedure
  .input(
    z.object({
      id: z.string().uuid(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const repo = getApiKeyRepository();

    // Fetch key to verify ownership
    const _key = await repo.findByHashedKey(""); // we can't find by hashedKey for revoking, so let's find by id.
    // Wait, does ApiKeyRepository have findById?
    // Let's check: ApiKeyRepository has remove(id), but we should verify ownership.
    // Let's implement check: since we only want to revoke keys belonging to ctx.user.id
    // We can query prisma directly or delete via prisma with ownership condition:
    const { prisma } = await import("@ecom/prisma");
    const deleted = await prisma.apiKey.deleteMany({
      where: {
        id: input.id,
        ownerId: ctx.user.id,
        ownerType: "Customer",
      },
    });

    if (deleted.count === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Không tìm thấy API Key hoặc không có quyền sở hữu.",
      });
    }

    return { success: true };
  });
