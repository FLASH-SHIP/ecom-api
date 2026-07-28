import { TaxonomyRepository } from "@ecom/features/taxonomy/repositories/TaxonomyRepository";
import { TaxonomyService } from "@ecom/features/taxonomy/services/TaxonomyService";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

const getTaxonomyService = () => new TaxonomyService({ taxonomyRepo: new TaxonomyRepository() });

export const list = authedProcedure
  .use(requirePermission(Permissions.CATEGORIES_READ))
  .input(
    z
      .object({
        type: z.string().max(50).optional(),
        parentId: z.number().int().positive().nullable().optional(),
        search: z.string().max(200).optional(),
        page: z.number().int().positive().default(1),
        perPage: z.number().int().positive().max(200).default(100),
      })
      .optional(),
  )
  .query(async ({ input }) => {
    return getTaxonomyService().list(input ?? {});
  });

export const get = authedProcedure
  .use(requirePermission(Permissions.CATEGORIES_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    return getTaxonomyService().get(input.id);
  });

export const tree = authedProcedure
  .use(requirePermission(Permissions.CATEGORIES_READ))
  .input(z.object({ type: z.string().min(1).max(50) }))
  .query(async ({ input }) => {
    return getTaxonomyService().getTree(input.type);
  });

export const types = authedProcedure
  .use(requirePermission(Permissions.CATEGORIES_READ))
  .query(async () => {
    return getTaxonomyService().getTypes();
  });

export const create = authedProcedure
  .use(requirePermission(Permissions.CATEGORIES_CREATE))
  .use(auditLog({ module: "taxonomies", action: "CREATE", entityType: "Taxonomy" }))
  .input(
    z.object({
      name: z.string().min(1).max(200),
      slug: z.string().min(1).max(200),
      type: z.string().min(1).max(50),
      description: z.string().max(1000).optional(),
      parentId: z.number().int().positive().optional(),
      order: z.number().int().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    return getTaxonomyService().create(input);
  });

export const update = authedProcedure
  .use(requirePermission(Permissions.CATEGORIES_UPDATE))
  .use(auditLog({ module: "taxonomies", action: "UPDATE", entityType: "Taxonomy" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      name: z.string().min(1).max(200).optional(),
      slug: z.string().min(1).max(200).optional(),
      description: z.string().max(1000).optional(),
      parentId: z.number().int().positive().nullable().optional(),
      order: z.number().int().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { id, ...data } = input;
    return getTaxonomyService().update(id, data);
  });

export const remove = authedProcedure
  .use(requirePermission(Permissions.CATEGORIES_DELETE))
  .use(auditLog({ module: "taxonomies", action: "DELETE", entityType: "Taxonomy" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    return getTaxonomyService().delete(input.id);
  });
