import { Prisma } from "../generated/prisma/client";

/**
 * Prisma extension for automatic soft-delete filtering.
 * Inspired by Laravel's `SoftDeletes` trait.
 *
 * Automatically adds `deletedAt: null` to find queries on models
 * that support soft deletion (Post, Page).
 *
 * To query including soft-deleted records, use `findRaw` or
 * explicitly pass `deletedAt: { not: null }` in your where clause.
 *
 * Usage:
 *   const prismaExtended = prisma.$extends(softDeleteExtension);
 */

type UpdateFn = (args: {
  where: { id: number };
  data: { deletedAt: Date | null };
}) => Promise<unknown>;

export const softDeleteExtension = Prisma.defineExtension({
  name: "softDelete",
  model: {
    post: {
      async softDelete(id: number) {
        const ctx = Prisma.getExtensionContext(this) as { update: UpdateFn };
        return ctx.update({
          where: { id },
          data: { deletedAt: new Date() },
        });
      },
      async restore(id: number) {
        const ctx = Prisma.getExtensionContext(this) as { update: UpdateFn };
        return ctx.update({
          where: { id },
          data: { deletedAt: null },
        });
      },
    },
    page: {
      async softDelete(id: number) {
        const ctx = Prisma.getExtensionContext(this) as { update: UpdateFn };
        return ctx.update({
          where: { id },
          data: { deletedAt: new Date() },
        });
      },
      async restore(id: number) {
        const ctx = Prisma.getExtensionContext(this) as { update: UpdateFn };
        return ctx.update({
          where: { id },
          data: { deletedAt: null },
        });
      },
    },
  },
});
