import { getExportService, getImportService } from "@ecom/features/di/containers/ToolsService";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

const moduleEnum = z.enum(["posts", "categories", "tags", "pages", "customers", "settings", "all"]);
const importModuleEnum = z.enum(["posts", "categories", "tags", "pages", "settings"]);

export const exportData = authedProcedure
  .use(requirePermission(Permissions.TOOLS_EXPORT))
  .input(z.object({ module: moduleEnum }))
  .query(async ({ input }) => {
    const service = getExportService();
    switch (input.module) {
      case "posts":
        return { module: "posts", data: await service.exportPosts() };
      case "categories":
        return { module: "categories", data: await service.exportCategories() };
      case "tags":
        return { module: "tags", data: await service.exportTags() };
      case "pages":
        return { module: "pages", data: await service.exportPages() };
      case "customers":
        return { module: "customers", data: await service.exportCustomers() };
      case "settings":
        return { module: "settings", data: await service.exportSettings() };
      case "all":
        return service.exportAll();
      default:
        return { module: input.module, data: [] };
    }
  });

export const importData = authedProcedure
  .use(requirePermission(Permissions.TOOLS_IMPORT))
  .use(auditLog({ module: "tools", action: "IMPORT", entityType: "Data" }))
  .input(
    z.object({
      module: importModuleEnum,
      data: z.array(z.record(z.string(), z.unknown())),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const service = getImportService();
    const authorId = ctx.user?.id ?? "";

    switch (input.module) {
      case "posts":
        return service.importPosts(
          input.data.map((d) => ({
            title: String(d.title ?? ""),
            slug: d.slug ? String(d.slug) : undefined,
            content: d.content ? String(d.content) : undefined,
            excerpt: d.excerpt ? String(d.excerpt) : undefined,
            status: d.status ? String(d.status) : undefined,
            isFeatured: d.isFeatured === true,
            authorId,
          })),
        );
      case "categories":
        return service.importCategories(
          input.data.map((d) => ({
            name: String(d.name ?? ""),
            slug: d.slug ? String(d.slug) : undefined,
            description: d.description ? String(d.description) : undefined,
            parentId: typeof d.parentId === "number" ? d.parentId : undefined,
            order: typeof d.order === "number" ? d.order : undefined,
          })),
        );
      case "tags":
        return service.importTags(
          input.data.map((d) => ({
            name: String(d.name ?? ""),
            slug: d.slug ? String(d.slug) : undefined,
          })),
        );
      case "pages":
        return service.importPages(
          input.data.map((d) => ({
            title: String(d.title ?? ""),
            slug: d.slug ? String(d.slug) : undefined,
            content: d.content ? String(d.content) : undefined,
            template: d.template ? String(d.template) : undefined,
            authorId,
          })),
        );
      case "settings":
        return service.importSettings(
          input.data.map((d) => ({
            key: String(d.key ?? ""),
            value: String(d.value ?? ""),
          })),
        );
    }
  });

// ─── Full Backup/Restore ───────────────────────

export const fullBackup = authedProcedure
  .use(requirePermission(Permissions.TOOLS_EXPORT))
  .use(auditLog({ module: "tools", action: "FULL_BACKUP", entityType: "System" }))
  .query(async () => {
    const { exportContent } = await import("@ecom/features/tools/services/ImportExportService");
    return exportContent();
  });

export const fullRestore = authedProcedure
  .use(requirePermission(Permissions.TOOLS_IMPORT))
  .use(auditLog({ module: "tools", action: "FULL_RESTORE", entityType: "System" }))
  .input(
    z.object({
      version: z.string(),
      exportedAt: z.string(),
      posts: z.array(z.record(z.string(), z.unknown())),
      pages: z.array(z.record(z.string(), z.unknown())),
      categories: z.array(z.record(z.string(), z.unknown())),
      tags: z.array(z.record(z.string(), z.unknown())),
      redirects: z.array(z.record(z.string(), z.unknown())),
    }),
  )
  .mutation(async ({ input }) => {
    const { importContent } = await import("@ecom/features/tools/services/ImportExportService");
    return importContent(input as never);
  });

// ─── Duplicate Detection ───────────────────────

export const checkDuplicates = authedProcedure
  .use(requirePermission(Permissions.POSTS_READ))
  .input(
    z.object({
      title: z.string().min(1).max(500),
      slug: z.string().max(500).optional(),
      type: z.enum(["post", "page"]),
      excludeId: z.number().int().positive().optional(),
    }),
  )
  .query(async ({ input }) => {
    const { checkDuplicates: detect } = await import(
      "@ecom/features/shared/services/DuplicateDetector"
    );
    return detect(input);
  });

// ─── Full-text Search ───────────────────────

export const fullTextSearch = authedProcedure
  .use(requirePermission(Permissions.POSTS_READ))
  .input(
    z.object({
      query: z.string().min(1).max(200),
      types: z.array(z.enum(["post", "page"])).optional(),
      page: z.number().int().positive().default(1),
      perPage: z.number().int().positive().max(50).default(20),
    }),
  )
  .query(async ({ input }) => {
    const { fullTextSearch: search } = await import(
      "@ecom/features/search/services/FullTextSearchService"
    );
    return search(input);
  });
