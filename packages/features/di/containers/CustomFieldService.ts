import { registerBlogCustomFieldRules } from "@ecom/features/blog/customFieldRules";
import { CustomFieldValueRepository } from "@ecom/features/custom-field/repositories/CustomFieldValueRepository";
import { FieldGroupRepository } from "@ecom/features/custom-field/repositories/FieldGroupRepository";
import { FieldItemRepository } from "@ecom/features/custom-field/repositories/FieldItemRepository";
import { CustomFieldService } from "@ecom/features/custom-field/services/CustomFieldService";
import { registerPageCustomFieldRules } from "@ecom/features/page/customFieldRules";
import { prisma } from "@ecom/prisma";

let _groupRepo: FieldGroupRepository | null = null;
let _itemRepo: FieldItemRepository | null = null;
let _valueRepo: CustomFieldValueRepository | null = null;
let _service: CustomFieldService | null = null;
let _rulesBootstrapped = false;

function bootstrapRules(): void {
  if (_rulesBootstrapped) return;
  _rulesBootstrapped = true;

  // Register rule types for each supported content model.
  // These populate the singleton CustomFieldRuleRegistry which is used
  // by getRuleGroups (UI builder) and getFieldsForContext (rule evaluation).
  registerBlogCustomFieldRules(prisma);
  registerPageCustomFieldRules(prisma);
}

export function getCustomFieldService(): CustomFieldService {
  if (!_service) {
    _groupRepo = new FieldGroupRepository(prisma);
    _itemRepo = new FieldItemRepository(prisma);
    _valueRepo = new CustomFieldValueRepository(prisma);
    _service = new CustomFieldService({
      prisma,
      groupRepo: _groupRepo,
      itemRepo: _itemRepo,
      valueRepo: _valueRepo,
    });
    bootstrapRules();
  }
  return _service;
}

export function resetCustomFieldContainers(): void {
  _groupRepo = null;
  _itemRepo = null;
  _valueRepo = null;
  _service = null;
  _rulesBootstrapped = false;
}
