/**
 * Singleton registry for custom field display rules.
 *
 * Mirrors Botble's CustomFieldSupport::ruleGroups pattern:
 * - registerRule(group, title, slug, dataProvider) — add a new rule type
 * - expandRule(group, title, slug, data)           — merge data into an existing rule
 * - getRuleGroups()                                — resolve all providers → UI structure
 *
 * Consumers (blog, page) call register/expand at app bootstrap via their
 * customFieldRules.ts files so the registry is populated before any request.
 */

export type DataProvider = () => Record<string, string> | Promise<Record<string, string>>;

export interface RuleDefinition {
  title: string;
  slug: string;
  /** Resolved lazily on getRuleGroups() call */
  dataProvider: DataProvider;
}

export interface ResolvedRuleDefinition {
  title: string;
  slug: string;
  data: Record<string, string>;
}

export interface ResolvedRuleGroup {
  name: string;
  rules: ResolvedRuleDefinition[];
}

class CustomFieldRuleRegistryImpl {
  private readonly groups: Record<
    string,
    { label: string; rules: Record<string, RuleDefinition> }
  > = {
    basic: { label: "Basic", rules: {} },
    blog: { label: "Blog", rules: {} },
    other: { label: "Other", rules: {} },
  };

  /**
   * Register a new rule type within a group.
   * If the slug already exists the dataProvider is replaced.
   */
  registerRule(group: string, title: string, slug: string, dataProvider: DataProvider): this {
    if (!this.groups[group]) {
      this.groups[group] = { label: group, rules: {} };
    }
    this.groups[group].rules[slug] = { title, slug, dataProvider };
    return this;
  }

  /**
   * Expand (merge) additional data into an existing rule without replacing its provider.
   * If the slug doesn't exist yet, it is created with the given data as a static provider.
   * This mirrors Botble's expandRule() which merges option maps.
   */
  expandRule(group: string, title: string, slug: string, data: DataProvider): this {
    if (!this.groups[group]) {
      this.groups[group] = { label: group, rules: {} };
    }

    const existing = this.groups[group].rules[slug];
    if (existing) {
      // Wrap both providers: merge their results at resolve time
      const prev = existing.dataProvider;
      existing.dataProvider = async () => ({
        ...(await prev()),
        ...(await data()),
      });
    } else {
      this.groups[group].rules[slug] = { title, slug, dataProvider: data };
    }
    return this;
  }

  /**
   * Resolve all data providers and return the full UI-ready structure.
   * Called by the tRPC getRuleGroups procedure.
   */
  async getRuleGroups(): Promise<ResolvedRuleGroup[]> {
    const result: ResolvedRuleGroup[] = [];

    for (const [groupKey, groupDef] of Object.entries(this.groups)) {
      const rules: ResolvedRuleDefinition[] = [];

      for (const ruleDef of Object.values(groupDef.rules)) {
        const data = await ruleDef.dataProvider();
        rules.push({ title: ruleDef.title, slug: ruleDef.slug, data });
      }

      if (rules.length > 0) {
        result.push({ name: groupKey, rules });
      }
    }

    return result;
  }

  /** For testing — reset all registrations */
  _reset(): void {
    for (const group of Object.values(this.groups)) {
      group.rules = {};
    }
  }
}

// Export singleton instance
export const CustomFieldRuleRegistry = new CustomFieldRuleRegistryImpl();
