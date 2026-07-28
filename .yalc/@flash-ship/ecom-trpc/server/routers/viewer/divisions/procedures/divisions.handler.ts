import { getAdministrativeService } from "@ecom/features/di/containers/AdministrativeService";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

// --- PROVINCES HANDLERS ---

export const listProvinces = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_READ))
  .input(
    z.object({
      search: z.string().optional(),
      divisionType: z.string().optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(10),
      orderBy: z.enum(["asc", "desc"]).default("asc"),
    }),
  )
  .query(async ({ input }) => {
    return getAdministrativeService().listProvinces(input);
  });

export const getProvince = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    return getAdministrativeService().getProvince(input.id);
  });

export const createProvince = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_UPDATE))
  .use(auditLog({ module: "settings", action: "CREATE", entityType: "Province" }))
  .input(
    z.object({
      name: z.string().min(1).max(100),
      code: z.number().int().positive(),
      divisionType: z.string().min(1).max(100),
      codeName: z.string().max(100).default(""),
      phoneCode: z.number().int().positive(),
    }),
  )
  .mutation(async ({ input }) => {
    return getAdministrativeService().createProvince(input);
  });

export const updateProvince = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_UPDATE))
  .use(auditLog({ module: "settings", action: "UPDATE", entityType: "Province" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      name: z.string().min(1).max(100).optional(),
      code: z.number().int().positive().optional(),
      divisionType: z.string().min(1).max(100).optional(),
      codeName: z.string().max(100).optional(),
      phoneCode: z.number().int().positive().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { id, ...data } = input;
    return getAdministrativeService().updateProvince(id, data);
  });

export const deleteProvince = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_UPDATE))
  .use(auditLog({ module: "settings", action: "DELETE", entityType: "Province" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    return getAdministrativeService().deleteProvince(input.id);
  });

// --- WARDS HANDLERS ---

export const listWards = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_READ))
  .input(
    z.object({
      provinceCode: z.number().int().positive().optional(),
      search: z.string().optional(),
      divisionType: z.string().optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(10),
      orderBy: z.enum(["asc", "desc"]).default("asc"),
    }),
  )
  .query(async ({ input }) => {
    return getAdministrativeService().listWards(input);
  });

export const getWard = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    return getAdministrativeService().getWard(input.id);
  });

export const createWard = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_UPDATE))
  .use(auditLog({ module: "settings", action: "CREATE", entityType: "Ward" }))
  .input(
    z.object({
      name: z.string().min(1).max(100),
      code: z.number().int().positive(),
      divisionType: z.string().min(1).max(100),
      codeName: z.string().max(100).default(""),
      provinceCode: z.number().int().positive(),
    }),
  )
  .mutation(async ({ input }) => {
    return getAdministrativeService().createWard(input);
  });

export const updateWard = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_UPDATE))
  .use(auditLog({ module: "settings", action: "UPDATE", entityType: "Ward" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      name: z.string().min(1).max(100).optional(),
      code: z.number().int().positive().optional(),
      divisionType: z.string().min(1).max(100).optional(),
      codeName: z.string().max(100).optional(),
      provinceCode: z.number().int().positive().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { id, ...data } = input;
    return getAdministrativeService().updateWard(id, data);
  });

export const deleteWard = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_UPDATE))
  .use(auditLog({ module: "settings", action: "DELETE", entityType: "Ward" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    return getAdministrativeService().deleteWard(input.id);
  });

// --- ADMINISTRATIVE DIVISIONS (Multi-country) ---

export const listDivisions = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_READ))
  .input(
    z.object({
      countryCode: z.string().length(2),
      level: z.number().int().min(1).optional(),
      parentId: z.number().int().positive().optional(),
      search: z.string().optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(10),
      orderBy: z.enum(["asc", "desc"]).default("asc"),
    }),
  )
  .query(async ({ input }) => {
    return getAdministrativeService().listDivisions(input);
  });

export const getDivision = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    return getAdministrativeService().getDivision(input.id);
  });

export const createDivision = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_UPDATE))
  .use(auditLog({ module: "settings", action: "CREATE", entityType: "Division" }))
  .input(
    z.object({
      countryCode: z.string().length(2),
      code: z.string().min(1).max(100),
      name: z.string().min(1).max(200),
      nameEn: z.string().max(200).optional(),
      divisionType: z.string().min(1).max(100),
      level: z.number().int().min(1),
      parentId: z.number().int().positive().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    return getAdministrativeService().createDivision(input);
  });

export const updateDivision = authedProcedure
  .use(requirePermission(Permissions.SETTINGS_UPDATE))
  .use(auditLog({ module: "settings", action: "UPDATE", entityType: "Division" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      name: z.string().min(1).max(200).optional(),
      nameEn: z.string().max(200).optional(),
      divisionType: z.string().min(1).max(100).optional(),
      isActive: z.boolean().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { id, ...data } = input;
    return getAdministrativeService().updateDivision(id, data);
  });
