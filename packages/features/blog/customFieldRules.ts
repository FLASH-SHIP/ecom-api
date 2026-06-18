import { CustomFieldRuleRegistry } from "@ecom/features/custom-field/CustomFieldRuleRegistry";
import type { PrismaClient } from "@ecom/prisma";

/**
 * Register custom field display rules for Blog content (Posts + Categories).
 *
 * Called once at app bootstrap (DI container init) to populate the singleton
 * CustomFieldRuleRegistry with blog-specific rule types — mirrors Botble's
 * registerBlogFields() in CustomFieldServiceProvider.php.
 */
export function registerBlogCustomFieldRules(prisma: PrismaClient): void {
  CustomFieldRuleRegistry
    // "model_name" is a shared rule in the "other" group — expand with blog values
    .expandRule("other", "Model Name", "model_name", () => ({
      post: "Post (Blog)",
      category: "Category (Blog)",
    }))
    // Category rule: select which categories trigger this field group
    .registerRule("blog", "Category", "category", async () => {
      const categories = await prisma.category.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
      return Object.fromEntries(categories.map((c) => [String(c.id), c.name]));
    })
    // Post format rule
    .registerRule("blog", "Post Format", "post_format", () => ({
      standard: "Standard",
      video: "Video",
      audio: "Audio",
      gallery: "Gallery",
      quote: "Quote",
      link: "Link",
    }));
}
