import { CacheKeys, CacheTTL, responseCache } from "@ecom/features/cache/ResponseCache";
import { getSettingService } from "@ecom/features/di/containers/SettingService";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

export const getAll = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_READ))
  .query(async () => {
    return responseCache.remember(CacheKeys.SETTINGS, CacheTTL.MEDIUM, async () => {
      const service = getSettingService();
      return service.getAll();
    });
  });

export const get = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_READ))
  .input(z.object({ key: z.string().min(1) }))
  .query(async ({ input }) => {
    const service = getSettingService();
    return service.get(input.key);
  });

export const getMany = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_READ))
  .input(z.object({ keys: z.array(z.string().min(1)) }))
  .query(async ({ input }) => {
    const service = getSettingService();
    return service.getMany(input.keys);
  });

export const set = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_UPDATE))
  .use(auditLog({ module: "settings", action: "UPDATE", entityType: "Setting" }))
  .input(
    z.object({
      key: z.string().min(1).max(255),
      value: z.string().nullable(),
    }),
  )
  .mutation(async ({ input }) => {
    const service = getSettingService();
    const result = await service.set(input.key, input.value);
    responseCache.forget(CacheKeys.SETTINGS);
    return result;
  });

export const bulkSet = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_UPDATE))
  .use(auditLog({ module: "settings", action: "BULK_UPDATE", entityType: "Setting" }))
  .input(
    z.object({
      items: z.array(
        z.object({
          key: z.string().min(1).max(255),
          value: z.string().nullable(),
        }),
      ),
    }),
  )
  .mutation(async ({ input }) => {
    const service = getSettingService();
    const items = input.items.map((i) => ({
      key: i.key,
      value: (i.value ?? null) as string | null,
    }));
    const result = await service.bulkSet(items);
    responseCache.forget(CacheKeys.SETTINGS);
    return result;
  });

export const remove = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_UPDATE))
  .use(auditLog({ module: "settings", action: "DELETE", entityType: "Setting" }))
  .input(z.object({ key: z.string().min(1) }))
  .mutation(async ({ input }) => {
    const service = getSettingService();
    const result = await service.delete(input.key);
    responseCache.forget(CacheKeys.SETTINGS);
    return result;
  });
