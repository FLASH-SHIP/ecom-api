import { CustomFieldRuleRegistry } from "@ecom/features/custom-field/CustomFieldRuleRegistry";
import type { PrismaClient } from "@prisma/client";

/**
 * Register custom field display rules for Page content.
 *
 * Called once at app bootstrap to populate the singleton CustomFieldRuleRegistry.
 * Mirrors Botble's registerPagesFields() in CustomFieldServiceProvider.php.
 */
export function registerPageCustomFieldRules(prisma: PrismaClient): void {
  CustomFieldRuleRegistry
    // "model_name" is shared — expand with page value
    .expandRule("other", "Model Name", "model_name", () => ({
      page: "Page (Static)",
    }))
    // Page template rule: select which template triggers the field group
    .registerRule("basic", "Page Template", "page_template", async () => {
      // Fetch distinct templates currently in use from the DB
      const pages = await prisma.page.findMany({
        select: { template: true },
        distinct: ["template"],
        where: { template: { not: null } },
      });

      const templates: Record<string, string> = {
        default: "Default",
      };
      for (const p of pages) {
        if (p.template && p.template !== "default") {
          templates[p.template] = p.template
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
        }
      }
      return templates;
    });
}
