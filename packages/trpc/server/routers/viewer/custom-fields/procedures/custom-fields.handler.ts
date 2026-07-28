import { getCustomFieldService } from "@ecom/features/di/containers/CustomFieldService";
import type { FilterFieldConfigMap } from "@ecom/features/shared/utils/buildPrismaWhere";
import { buildPrismaWhere } from "@ecom/features/shared/utils/buildPrismaWhere";
import { Permissions } from "@flash-ship/ecom-lib/permissions";
import { auditLog } from "@flash-ship/ecom-trpc/server/middleware/auditLog";
import { filtersInputSchema } from "@flash-ship/ecom-trpc/server/shared/filterSchema";
import { authedProcedure, requirePermission } from "@flash-ship/ecom-trpc/server/trpc";
import { z } from "zod";

/**
 * Whitelisted model names — prevents arbitrary model injection.
 * Extend this tuple when adding new CF-enabled models.
 */
const MODEL_NAMES = ["posts", "pages"] as const;
const modelNameSchema = z.enum(MODEL_NAMES);

// Botble-compatible rule format: [[{name, type, value}], ...]
// Outer array: groups ORed together
// Inner array: conditions ANDed together within a group
const ruleConditionSchema = z.object({
  name: z.string(),
  type: z.enum(["==", "!="]),
  value: z.string(),
});
const rulesSchema = z.array(z.array(ruleConditionSchema));

const FIELD_TYPES = [
  "text",
  "number",
  "email",
  "textarea",
  "select",
  "checkbox",
  "radio",
  "image",
  "file",
  "wysiwyg",
  "repeater",
  "color",
  "date",
  "url",
] as const;

// ── Groups ──

const sortableFields = ["id", "title", "createdAt", "status"] as const;

const GROUP_FILTER_FIELDS: FilterFieldConfigMap = {
  id: { prismaField: "id", type: "number" },
  title: { prismaField: "title", type: "string" },
  status: { prismaField: "status", type: "enum" },
  createdAt: { prismaField: "createdAt", type: "date" },
};

export const listGroups = authedProcedure
  .use(requirePermission(Permissions.CUSTOM_FIELDS_READ))
  .input(
    z.object({
      filters: filtersInputSchema,
      search: z.string().optional(),
      sortBy: z.enum(sortableFields).optional(),
      sortDir: z.enum(["asc", "desc"]).optional(),
      page: z.number().int().positive().optional().default(1),
      pageSize: z.number().int().min(1).max(500).optional().default(25),
    }),
  )
  .query(async ({ input }) => {
    const svc = getCustomFieldService();
    const prismaWhere = buildPrismaWhere(input.filters, GROUP_FILTER_FIELDS);
    return svc.listGroups({
      where: prismaWhere,
      search: input.search,
      sortBy: input.sortBy,
      sortDir: input.sortDir,
      page: input.page,
      pageSize: input.pageSize,
    });
  });

export const getGroup = authedProcedure
  .use(requirePermission(Permissions.CUSTOM_FIELDS_READ))
  .input(z.object({ id: z.number().int().positive() }))
  .query(async ({ input }) => {
    const svc = getCustomFieldService();
    return svc.getGroup(input.id);
  });

export const createGroup = authedProcedure
  .use(requirePermission(Permissions.CUSTOM_FIELDS_CREATE))
  .use(auditLog({ module: "custom-fields", action: "CREATE", entityType: "FieldGroup" }))
  .input(
    z.object({
      title: z.string().min(1).max(200),
      order: z.number().int().optional(),
      rules: rulesSchema.optional(),
      status: z.enum(["published", "pending", "draft"]).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const svc = getCustomFieldService();
    return svc.createGroup(input);
  });

export const updateGroup = authedProcedure
  .use(requirePermission(Permissions.CUSTOM_FIELDS_UPDATE))
  .use(auditLog({ module: "custom-fields", action: "UPDATE", entityType: "FieldGroup" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      title: z.string().min(1).max(200).optional(),
      order: z.number().int().optional(),
      rules: rulesSchema.nullable().optional(),
      status: z.enum(["published", "pending", "draft"]).optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { id, ...data } = input;
    const svc = getCustomFieldService();
    return svc.updateGroup(id, data);
  });

export const deleteGroup = authedProcedure
  .use(requirePermission(Permissions.CUSTOM_FIELDS_DELETE))
  .use(auditLog({ module: "custom-fields", action: "DELETE", entityType: "FieldGroup" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const svc = getCustomFieldService();
    return svc.deleteGroup(input.id);
  });

export const duplicateGroup = authedProcedure
  .use(requirePermission(Permissions.CUSTOM_FIELDS_CREATE))
  .use(auditLog({ module: "custom-fields", action: "DUPLICATE", entityType: "FieldGroup" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const svc = getCustomFieldService();
    return svc.duplicateGroup(input.id);
  });

export const getFieldsForContext = authedProcedure
  .use(requirePermission(Permissions.CUSTOM_FIELDS_READ))
  .input(
    z.object({
      modelName: z.string().optional(),
      categoryId: z.number().int().positive().optional(),
      pageTemplate: z.string().optional(),
      postFormat: z.string().optional(),
    }),
  )
  .query(async ({ input }) => {
    const svc = getCustomFieldService();
    return svc.getFieldsForContext(input);
  });

// ── Items ──

export const addItem = authedProcedure
  .use(requirePermission(Permissions.CUSTOM_FIELDS_CREATE))
  .use(auditLog({ module: "custom-fields", action: "ADD_ITEM", entityType: "FieldItem" }))
  .input(
    z.object({
      groupId: z.number().int().positive(),
      slug: z.string().min(1).max(200),
      title: z.string().min(1).max(200),
      type: z.enum(FIELD_TYPES),
      placeholder: z.string().max(500).optional(),
      instructions: z.string().optional(),
      options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
      defaultValue: z.string().optional(),
      order: z.number().int().optional(),
      parentId: z.number().int().positive().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const svc = getCustomFieldService();
    return svc.addItem(input);
  });

export const updateItem = authedProcedure
  .use(requirePermission(Permissions.CUSTOM_FIELDS_UPDATE))
  .use(auditLog({ module: "custom-fields", action: "UPDATE_ITEM", entityType: "FieldItem" }))
  .input(
    z.object({
      id: z.number().int().positive(),
      slug: z.string().min(1).max(200).optional(),
      title: z.string().min(1).max(200).optional(),
      type: z.enum(FIELD_TYPES).optional(),
      placeholder: z.string().max(500).optional(),
      instructions: z.string().optional(),
      options: z
        .array(z.object({ label: z.string(), value: z.string() }))
        .nullable()
        .optional(),
      defaultValue: z.string().nullable().optional(),
      order: z.number().int().optional(),
      parentId: z.number().int().positive().nullable().optional(),
    }),
  )
  .mutation(async ({ input }) => {
    const { id, defaultValue, options, ...rest } = input;
    const svc = getCustomFieldService();
    return svc.updateItem(id, {
      ...rest,
      defaultValue: defaultValue ?? undefined,
      options: options ?? undefined,
    });
  });

export const removeItem = authedProcedure
  .use(requirePermission(Permissions.CUSTOM_FIELDS_DELETE))
  .use(auditLog({ module: "custom-fields", action: "REMOVE_ITEM", entityType: "FieldItem" }))
  .input(z.object({ id: z.number().int().positive() }))
  .mutation(async ({ input }) => {
    const svc = getCustomFieldService();
    return svc.removeItem(input.id);
  });

// ── New Botble-parity procedures ─────────────────────────────────────────────

/**
 * Returns available rule definitions for the visual Rules Builder UI.
 * Resolves all registered dataProviders (DB calls for category list, etc.).
 */
export const getRuleGroups = authedProcedure
  .use(requirePermission(Permissions.CUSTOM_FIELDS_READ))
  .query(async () => {
    const svc = getCustomFieldService();
    return svc.getRuleGroups();
  });

/**
 * Returns field groups + current values for a specific content model instance.
 * Used by CustomFieldsPanel in the Post/Page editor.
 */
export const getFieldBoxes = authedProcedure
  .use(requirePermission(Permissions.CUSTOM_FIELDS_READ))
  .input(
    z.object({
      modelName: modelNameSchema,
      modelId: z.number().int().positive(),
      categoryId: z.number().int().positive().optional(),
      pageTemplate: z.string().max(100).optional(),
      postFormat: z.string().max(50).optional(),
    }),
  )
  .query(async ({ input }) => {
    const svc = getCustomFieldService();
    const { modelName, modelId, ...context } = input;
    return svc.getFieldBoxes(modelName, modelId, context);
  });

/**
 * Bulk-save custom field values from the editor panel.
 * Limited to 200 values per call to prevent oversized transactions.
 */
export const saveModelFields = authedProcedure
  .use(requirePermission(Permissions.CUSTOM_FIELDS_UPDATE))
  .use(
    auditLog({
      module: "custom-fields",
      action: "SAVE_MODEL_FIELDS",
      entityType: "CustomFieldValue",
    }),
  )
  .input(
    z.object({
      modelName: modelNameSchema,
      modelId: z.number().int().positive(),
      // max(200): a reasonable upper bound — real groups never exceed ~50 fields
      values: z
        .array(
          z.object({
            fieldItemId: z.number().int().positive(),
            value: z.string().max(65535).or(z.null()),
          }),
        )
        .max(200),
    }),
  )
  .mutation(async ({ input }) => {
    const svc = getCustomFieldService();
    const values = input.values.map((v) => ({
      fieldItemId: v.fieldItemId,
      value: (v.value ?? null) as string | null,
    }));
    return svc.saveModelFields(input.modelName, input.modelId, values);
  });

/**
 * Export field groups in Botble-compatible JSON format.
 */
export const exportGroups = authedProcedure
  .use(requirePermission(Permissions.CUSTOM_FIELDS_READ))
  .input(
    z.object({
      ids: z.array(z.number().int().positive()).optional(),
    }),
  )
  .query(async ({ input }) => {
    const svc = getCustomFieldService();
    return svc.exportGroups(input.ids);
  });

/**
 * Import field groups from Botble-compatible JSON.
 * Limited to 50 groups per call.
 */
export const importGroups = authedProcedure
  .use(requirePermission(Permissions.CUSTOM_FIELDS_CREATE))
  .use(auditLog({ module: "custom-fields", action: "IMPORT", entityType: "FieldGroup" }))
  .input(z.array(z.record(z.string(), z.unknown())).max(50))
  .mutation(async ({ input }) => {
    const svc = getCustomFieldService();
    return svc.importGroups(input);
  });
