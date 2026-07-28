import { getLanguageService } from "@ecom/features/di/containers/LanguageService";
import { WORLD_LANGUAGES } from "@ecom/features/language/constants/worldLanguages";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { authedProcedure, publicProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

const languageCreateSchema = z.object({
  name: z.string().min(1).max(100),
  locale: z.string().min(2).max(10),
  code: z.string().min(2).max(10),
  flag: z.string().max(10).optional(),
  isRtl: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});

const languageUpdateSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100).optional(),
  locale: z.string().min(2).max(10).optional(),
  code: z.string().min(2).max(10).optional(),
  flag: z.string().max(10).optional(),
  isRtl: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const list = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_READ))
  .query(async () => {
    const service = getLanguageService();
    return service.getLanguages();
  });

export const getActive = publicProcedure.query(async () => {
  const service = getLanguageService();
  return service.getActiveLanguages();
});

export const getById = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    const service = getLanguageService();
    return service.getLanguageById(input.id);
  });

export const getDefault = publicProcedure.query(async () => {
  const service = getLanguageService();
  return service.getDefaultLanguage();
});

export const create = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_UPDATE))
  .use(auditLog({ module: "languages", action: "CREATE", entityType: "Language" }))
  .input(languageCreateSchema)
  .mutation(async ({ input }) => {
    const service = getLanguageService();
    return service.createLanguage(input);
  });

export const update = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_UPDATE))
  .use(auditLog({ module: "languages", action: "UPDATE", entityType: "Language" }))
  .input(languageUpdateSchema)
  .mutation(async ({ input }) => {
    const { id, ...data } = input;
    const service = getLanguageService();
    return service.updateLanguage(id, data);
  });

export const remove = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_UPDATE))
  .use(auditLog({ module: "languages", action: "DELETE", entityType: "Language" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const service = getLanguageService();
    return service.deleteLanguage(input.id);
  });

export const setDefault = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_UPDATE))
  .use(auditLog({ module: "languages", action: "SET_DEFAULT", entityType: "Language" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const service = getLanguageService();
    return service.setDefaultLanguage(input.id);
  });

export const getRelatedItems = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_READ))
  .input(
    z.object({
      referenceId: z.number().int().positive(),
      referenceType: z.string().min(1),
    }),
  )
  .query(async ({ input }) => {
    const service = getLanguageService();
    return service.getRelatedLanguageItems(input.referenceId, input.referenceType);
  });

export const saveContentLanguage = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_UPDATE))
  .input(
    z.object({
      referenceId: z.number().int().positive(),
      referenceType: z.string().min(1),
      langCode: z.string().min(2),
      refFrom: z.number().int().positive().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const service = getLanguageService();
    return service.saveContentLanguage(
      input.referenceId,
      input.referenceType,
      input.langCode,
      input.refFrom,
    );
  });

export const worldLanguages = publicProcedure.query(() => {
  return WORLD_LANGUAGES;
});
