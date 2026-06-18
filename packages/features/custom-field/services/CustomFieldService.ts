import { CustomFieldRuleRegistry } from "@ecom/features/custom-field/CustomFieldRuleRegistry";
import type { CustomFieldValueRepository } from "@ecom/features/custom-field/repositories/CustomFieldValueRepository";
import type {
  FieldGroupRepository,
  FindGroupsOpts,
} from "@ecom/features/custom-field/repositories/FieldGroupRepository";
import type { FieldItemRepository } from "@ecom/features/custom-field/repositories/FieldItemRepository";
import { ErrorWithCode } from "@ecom/lib/errors";
import { createLogger } from "@ecom/lib/logger";
import type { PrismaClient } from "@ecom/prisma";
import { Prisma } from "@ecom/prisma";

const log = createLogger("CustomFieldService");

// ── Botble-compatible rules types ────────────────────────────────────────────

/** A single condition within a rule group */
export interface RuleCondition {
  name: string; // e.g. "model_name", "category", "page_template"
  type: "==" | "!=";
  value: string;
}

/** One rule group: conditions are ANDed together */
export type RuleGroup = RuleCondition[];

/**
 * Stored in FieldGroup.rules as JSON.
 * Groups are ORed together — a content item matches if ANY group passes.
 * Empty array → group always shows (no restriction).
 */
export type FieldGroupRules = RuleGroup[];

/** Context passed when evaluating rules for a specific content item */
export interface RuleContext {
  modelName?: string; // "post" | "page" | "category"
  categoryId?: number;
  pageTemplate?: string;
  postFormat?: string;
  userRoles?: string[];
}

// ── Service types ────────────────────────────────────────────────────────────

export interface FieldBoxValue {
  fieldItemId: number;
  value: string | null;
}

export interface FieldBox {
  groupId: number;
  groupTitle: string;
  items: Array<{
    id: number;
    slug: string;
    title: string;
    type: string;
    placeholder: string | null;
    instructions: string | null;
    options: unknown;
    defaultValue: string | null;
    order: number;
    parentId: number | null;
    value: string | null;
  }>;
}

/** Botble-compatible export shape for a single field group */
export interface ExportedFieldGroup {
  id: number;
  title: string;
  order: number;
  status: { value: string };
  rules: string; // JSON-stringified FieldGroupRules
  items: ExportedFieldItem[];
}

export interface ExportedFieldItem {
  id: number;
  title: string;
  slug: string;
  type: string;
  order: number;
  instructions: string | null;
  options: unknown;
  defaultValue: string | null;
  children: ExportedFieldItem[];
}

export interface ICustomFieldServiceDeps {
  prisma: PrismaClient;
  groupRepo: FieldGroupRepository;
  itemRepo: FieldItemRepository;
  valueRepo: CustomFieldValueRepository;
}

export class CustomFieldService {
  private deps: ICustomFieldServiceDeps;
  constructor(deps: ICustomFieldServiceDeps) {
    this.deps = deps;
  }

  // ── Groups ──────────────────────────────────────────────────────────────────

  async listGroups(opts?: FindGroupsOpts) {
    return this.deps.groupRepo.findMany(opts ?? {});
  }

  async getGroup(id: number) {
    const group = await this.deps.groupRepo.findById(id);
    if (!group) throw ErrorWithCode.Factory.NotFound("Field group not found");
    return group;
  }

  async createGroup(data: { title: string; order?: number; rules?: unknown; status?: string }) {
    return this.deps.groupRepo.create(data);
  }

  async updateGroup(
    id: number,
    data: { title?: string; order?: number; rules?: unknown; status?: string },
  ) {
    try {
      return await this.deps.groupRepo.update(id, data);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        throw ErrorWithCode.Factory.NotFound("Field group not found");
      }
      throw e;
    }
  }

  async deleteGroup(id: number) {
    try {
      return await this.deps.groupRepo.remove(id);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        throw ErrorWithCode.Factory.NotFound("Field group not found");
      }
      throw e;
    }
  }

  // ── Items ───────────────────────────────────────────────────────────────────

  async addItem(data: {
    groupId: number;
    slug: string;
    title: string;
    type: string;
    placeholder?: string;
    instructions?: string;
    options?: unknown;
    defaultValue?: string;
    order?: number;
    parentId?: number;
  }) {
    return this.deps.itemRepo.create(data);
  }

  async updateItem(
    id: number,
    data: {
      slug?: string;
      title?: string;
      type?: string;
      placeholder?: string;
      instructions?: string;
      options?: unknown;
      defaultValue?: string;
      order?: number;
      parentId?: number | null;
    },
  ) {
    return this.deps.itemRepo.update(id, data);
  }

  async removeItem(id: number) {
    return this.deps.itemRepo.remove(id);
  }

  // ── Rules Engine (Botble-compatible) ────────────────────────────────────────

  /**
   * Get field groups filtered by context rules.
   * Only published groups are returned — drafts are never shown in the editor.
   * Empty rules array → group always shows.
   */
  async getFieldsForContext(context: RuleContext) {
    // Only published groups should be evaluated for content items
    const { rows: allGroups } = await this.deps.groupRepo.findMany({ status: "published" });
    return allGroups.filter((group) => {
      if (!group.rules) return true;
      const rules = group.rules as unknown as FieldGroupRules;
      if (!Array.isArray(rules) || rules.length === 0) return true;
      return this.checkRules(rules, context);
    });
  }

  /**
   * Get field groups + their current values for a specific content item.
   * Used by the editor CustomFieldsPanel component.
   * Uses batch loading to avoid N+1 queries.
   */
  async getFieldBoxes(
    modelName: string,
    modelId: number,
    context?: Omit<RuleContext, "modelName">,
  ): Promise<FieldBox[]> {
    const matchingGroups = await this.getFieldsForContext({ modelName, ...context });
    if (matchingGroups.length === 0) return [];

    // Batch load all groups with items in a single query (avoids N+1)
    const ids = matchingGroups.map((g) => g.id);
    const [fullGroups, existingValues] = await Promise.all([
      this.deps.groupRepo.findManyByIds(ids),
      this.deps.valueRepo.findByReference(modelName, modelId),
    ]);

    const valueMap = new Map<number, string | null>();
    for (const v of existingValues) {
      valueMap.set(v.fieldItemId, v.value);
    }

    return fullGroups.map((fullGroup) => ({
      groupId: fullGroup.id,
      groupTitle: fullGroup.title,
      items: fullGroup.items.map((item) => ({
        ...item,
        value: valueMap.get(item.id) ?? null,
      })),
    }));
  }

  /**
   * Bulk save all custom field values for a model (called from editor).
   * Wrapped in a transaction — either all values save or none do.
   */
  async saveModelFields(
    modelName: string,
    modelId: number,
    values: { fieldItemId: number; value: string | null }[],
  ) {
    if (values.length === 0) return [];
    return this.deps.prisma.$transaction(
      values.map((v) =>
        this.deps.prisma.customFieldValue.upsert({
          where: {
            fieldItemId_useFor_useForId: {
              fieldItemId: v.fieldItemId,
              useFor: modelName,
              useForId: modelId,
            },
          },
          create: {
            fieldItemId: v.fieldItemId,
            useFor: modelName,
            useForId: modelId,
            value: v.value,
          },
          update: { value: v.value },
          select: { id: true, fieldItemId: true, value: true },
        }),
      ),
    );
  }

  /**
   * Remove all custom field values associated with a model instance.
   * Call this when a Post/Page is deleted to prevent orphan data.
   */
  async deleteModelFields(modelName: string, modelId: number) {
    return this.deps.valueRepo.removeByReference(modelName, modelId);
  }

  // ── Rule Registry delegation ────────────────────────────────────────────────

  async getRuleGroups() {
    return CustomFieldRuleRegistry.getRuleGroups();
  }

  // ── Duplication ─────────────────────────────────────────────────────────────

  /**
   * Deep clone a field group and all its items.
   * Maintains parent-child relationships via a remapping pass.
   */
  async duplicateGroup(id: number) {
    const group = await this.deps.groupRepo.findById(id);
    if (!group) throw ErrorWithCode.Factory.NotFound("Field group not found");

    log.info("Duplicating field group", { groupId: id, title: group.title });

    const newGroup = await this.deps.groupRepo.create({
      title: `${group.title} (Copy)`,
      order: group.order,
      rules: group.rules ?? undefined,
      status: group.status,
    });

    const parentMap = new Map<number, number>();

    // First pass: clone root items
    const rootItems = group.items.filter((item) => !item.parentId);
    for (const item of rootItems) {
      const newItem = await this.deps.itemRepo.create({
        groupId: newGroup.id,
        slug: item.slug,
        title: item.title,
        type: item.type,
        placeholder: item.placeholder ?? undefined,
        instructions: item.instructions ?? undefined,
        options: item.options as Array<{ label: string; value: string }> | undefined,
        defaultValue: item.defaultValue ?? undefined,
        order: item.order,
      });
      parentMap.set(item.id, newItem.id);
    }

    // Second pass: clone child items with remapped parentId
    const childItems = group.items.filter((item) => item.parentId);
    for (const item of childItems) {
      const newParentId = item.parentId ? parentMap.get(item.parentId) : undefined;
      await this.deps.itemRepo.create({
        groupId: newGroup.id,
        slug: item.slug,
        title: item.title,
        type: item.type,
        placeholder: item.placeholder ?? undefined,
        instructions: item.instructions ?? undefined,
        options: item.options as Array<{ label: string; value: string }> | undefined,
        defaultValue: item.defaultValue ?? undefined,
        order: item.order,
        parentId: newParentId,
      });
    }

    return this.deps.groupRepo.findById(newGroup.id);
  }

  // ── Export / Import ─────────────────────────────────────────────────────────

  /**
   * Export field groups in Botble-compatible JSON format.
   * Uses batch loading to avoid N+1 queries.
   * @param ids - If omitted, exports all groups.
   */
  async exportGroups(ids?: number[]): Promise<ExportedFieldGroup[]> {
    // Load all groups without pagination for export
    const { rows: groups } = await this.deps.groupRepo.findMany({});
    const filtered = ids?.length ? groups.filter((g) => ids.includes(g.id)) : groups;
    if (filtered.length === 0) return [];

    // Batch load all groups with items (avoids N+1)
    const filteredIds = filtered.map((g) => g.id);
    const fullGroups = await this.deps.groupRepo.findManyByIds(filteredIds);

    return fullGroups.map((full) => {
      const rootItems = full.items.filter((i) => !i.parentId);
      return {
        id: full.id,
        title: full.title,
        order: full.order,
        status: { value: full.status },
        rules: JSON.stringify(full.rules ?? []),
        items: rootItems.map((item) => this.serializeItem(item, full.items)),
      };
    });
  }

  /**
   * Import field groups from Botble-compatible JSON.
   * Validates each group's structure before any DB writes (fail-fast).
   * Groups are created sequentially so each group's ID is available for child items.
   * Throws on any validation or DB error.
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: import validation with type checking, JSON parsing, and nested data
  async importGroups(data: unknown[]): Promise<{ created: number }> {
    let created = 0;

    for (const raw of data) {
      if (!raw || typeof raw !== "object") {
        throw ErrorWithCode.Factory.BadRequest("Invalid import data: each entry must be an object");
      }
      const entry = raw as Record<string, unknown>;

      if (!entry.title || typeof entry.title !== "string") {
        throw ErrorWithCode.Factory.BadRequest("Invalid import data: 'title' is required");
      }

      let parsedRules: FieldGroupRules = [];
      if (entry.rules) {
        try {
          parsedRules = JSON.parse(entry.rules as string) as FieldGroupRules;
        } catch {
          throw ErrorWithCode.Factory.BadRequest(
            `Invalid import data: 'rules' is not valid JSON for group "${entry.title}"`,
          );
        }
      }

      const status =
        typeof entry.status === "object" && entry.status !== null
          ? (((entry.status as Record<string, unknown>).value as string) ?? "published")
          : typeof entry.status === "string"
            ? entry.status
            : "published";

      const newGroup = await this.deps.groupRepo.create({
        title: entry.title as string,
        order: typeof entry.order === "number" ? entry.order : 0,
        rules: parsedRules,
        status,
      });

      const items = Array.isArray(entry.items) ? entry.items : [];
      await this.importItems(items, newGroup.id, null);
      created++;
    }

    return { created };
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Botble-compatible rule evaluation.
   * Groups are ORed — returns true if ANY group fully matches.
   * Conditions within a group are ANDed.
   */
  private checkRules(rules: FieldGroupRules, context: RuleContext): boolean {
    if (!rules.length) return true;
    return rules.some((group) => this.checkRuleGroup(group, context));
  }

  private checkRuleGroup(group: RuleGroup, context: RuleContext): boolean {
    return group.every((condition) => this.evaluateCondition(condition, context));
  }

  private evaluateCondition(condition: RuleCondition, context: RuleContext): boolean {
    // Role check is special: match if role value exists in the userRoles array
    if (condition.name === "logged_in_user_has_role") {
      const hasRole = context.userRoles?.includes(condition.value) ?? false;
      return condition.type === "==" ? hasRole : !hasRole;
    }

    const contextValue = this.resolveContextValue(condition.name, context);
    const matches = contextValue !== null && contextValue === condition.value;

    if (condition.type === "==") return matches;
    if (condition.type === "!=") return !matches;
    return true;
  }

  private resolveContextValue(name: string, context: RuleContext): string | null {
    switch (name) {
      case "model_name":
        return context.modelName ?? null;
      case "category":
        return context.categoryId !== undefined ? String(context.categoryId) : null;
      case "page_template":
        return context.pageTemplate ?? null;
      case "post_format":
        return context.postFormat ?? null;
      default:
        return null;
    }
  }

  private serializeItem(
    item: {
      id: number;
      title: string;
      slug: string;
      type: string;
      order: number;
      instructions: string | null;
      options: unknown;
      defaultValue: string | null;
      parentId: number | null;
    },
    allItems: Array<{
      id: number;
      title: string;
      slug: string;
      type: string;
      order: number;
      instructions: string | null;
      options: unknown;
      defaultValue: string | null;
      parentId: number | null;
    }>,
  ): ExportedFieldItem {
    const children = allItems.filter((i) => i.parentId === item.id);
    return {
      id: item.id,
      title: item.title,
      slug: item.slug,
      type: item.type,
      order: item.order,
      instructions: item.instructions,
      options: item.options,
      defaultValue: item.defaultValue,
      children: children.map((child) => this.serializeItem(child, allItems)),
    };
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: recursive import with type guards and nested children
  private async importItems(
    items: unknown[],
    groupId: number,
    parentId: number | null,
  ): Promise<void> {
    for (const raw of items) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Record<string, unknown>;

      if (!item.title || !item.slug || !item.type) {
        throw ErrorWithCode.Factory.BadRequest(
          "Invalid import data: field items require 'title', 'slug', and 'type'",
        );
      }

      const created = await this.deps.itemRepo.create({
        groupId,
        slug: item.slug as string,
        title: item.title as string,
        type: item.type as string,
        order: typeof item.order === "number" ? item.order : 0,
        instructions: typeof item.instructions === "string" ? item.instructions : undefined,
        options: item.options as Array<{ label: string; value: string }> | undefined,
        defaultValue: typeof item.default_value === "string" ? item.default_value : undefined,
        parentId: parentId ?? undefined,
      });

      const children = Array.isArray(item.children) ? item.children : [];
      if (children.length > 0) {
        await this.importItems(children, groupId, created.id);
      }
    }
  }
}
