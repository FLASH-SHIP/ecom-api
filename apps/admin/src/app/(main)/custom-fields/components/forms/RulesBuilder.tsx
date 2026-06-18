"use client";

import { trpc } from "@admin/lib/trpc";
import { Button } from "@ecom/ui/components/button";
import { Card } from "@ecom/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ecom/ui/components/select";
import { Separator } from "@ecom/ui/components/separator";
import { Loader2, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

export interface RuleCondition {
  name: string;
  type: "==" | "!=";
  value: string;
}

export type RuleGroup = RuleCondition[];
export type FieldGroupRules = RuleGroup[];

interface RulesBuilderProps {
  value: FieldGroupRules;
  onChange: (rules: FieldGroupRules) => void;
}

export function RulesBuilder({ value, onChange }: RulesBuilderProps) {
  const t = useTranslations("customFields.rulesBuilder");

  const OPERATOR_OPTIONS = [
    { value: "==", label: t("equals") },
    { value: "!=", label: t("notEquals") },
  ];

  // Cache for 5 minutes — category list changes infrequently, no need to refetch on every window focus
  const { data: ruleGroupsData, isLoading } = trpc.viewer.customFields.getRuleGroups.useQuery(
    undefined,
    { staleTime: 5 * 60 * 1000 },
  );

  // Flatten all rules from all groups into a lookup map: slug → { title, data }
  const ruleDefinitions = ruleGroupsData?.flatMap((g) => g.rules) ?? [];

  const ruleBySlug = Object.fromEntries(ruleDefinitions.map((r) => [r.slug, r]));

  // Flatten rule options for shadcn Select (grouped by name)
  const ruleSelectOptions =
    ruleGroupsData?.flatMap((group) =>
      group.rules.map((rule) => ({
        value: rule.slug,
        label: rule.title,
        group: group.name,
      })),
    ) ?? [];

  function addGroup() {
    onChange([...value, [{ name: "", type: "==", value: "" }]]);
  }

  function removeGroup(groupIdx: number) {
    onChange(value.filter((_, i) => i !== groupIdx));
  }

  function addCondition(groupIdx: number) {
    const updated = value.map((group, i) =>
      i === groupIdx ? [...group, { name: "", type: "==" as const, value: "" }] : group,
    );
    onChange(updated);
  }

  function removeCondition(groupIdx: number, condIdx: number) {
    const updated = value.map((group, i) =>
      i === groupIdx ? group.filter((_, j) => j !== condIdx) : group,
    );
    // Remove empty groups
    onChange(updated.filter((g) => g.length > 0));
  }

  function updateCondition(
    groupIdx: number,
    condIdx: number,
    field: keyof RuleCondition,
    val: string,
  ) {
    const updated = value.map((group, i) =>
      i === groupIdx
        ? group.map((cond, j) =>
            j === condIdx
              ? {
                  ...cond,
                  [field]: val,
                  // Reset value when rule name changes
                  ...(field === "name" ? { value: "" } : {}),
                }
              : cond,
          )
        : group,
    );
    onChange(updated);
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <Loader2 className="size-4 animate-spin" />
        <p className="text-sm text-muted-foreground">{t("selectRule")}...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm italic text-muted-foreground">{t("ifLabel")}</p>

      {value.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground/60">{t("noRules")}</p>
      ) : (
        value.map((group, groupIdx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: rule groups have no stable IDs — user-managed list
          <div key={groupIdx}>
            {groupIdx > 0 && (
              <div className="my-2 flex items-center gap-2">
                <Separator className="flex-1" />
                <span className="text-xs font-semibold text-muted-foreground">
                  {t("orLabel").toUpperCase()}
                </span>
                <Separator className="flex-1" />
              </div>
            )}

            <Card className="bg-muted/50 p-3">
              <div className="flex flex-col gap-2">
                {group.map((condition, condIdx) => {
                  const selectedRule = ruleBySlug[condition.name];
                  const valueOptions = selectedRule?.data ?? {};

                  return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: conditions within a group have no stable IDs
                    <div key={condIdx}>
                      {condIdx > 0 && (
                        <p className="mb-1 pl-1 text-xs text-muted-foreground">
                          {t("addCondition").toUpperCase()}
                        </p>
                      )}

                      <div className="flex items-center gap-2">
                        {/* Rule type select */}
                        <Select
                          value={condition.name || undefined}
                          onValueChange={(v) => updateCondition(groupIdx, condIdx, "name", v)}
                        >
                          <SelectTrigger className="min-w-[160px]">
                            <SelectValue placeholder={t("selectRule")} />
                          </SelectTrigger>
                          <SelectContent>
                            {ruleSelectOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Operator select */}
                        <Select
                          value={condition.type}
                          onValueChange={(v) => updateCondition(groupIdx, condIdx, "type", v)}
                        >
                          <SelectTrigger className="min-w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATOR_OPTIONS.map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Value select */}
                        <Select
                          value={condition.value || undefined}
                          onValueChange={(v) => updateCondition(groupIdx, condIdx, "value", v)}
                          disabled={!condition.name}
                        >
                          <SelectTrigger className="min-w-[160px]">
                            <SelectValue placeholder={t("selectValue")} />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(valueOptions).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Remove condition button */}
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label={t("selectRule")}
                          onClick={() => removeCondition(groupIdx, condIdx)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Add AND condition */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => addCondition(groupIdx)}
                  className="mt-1 self-start"
                >
                  <Plus className="mr-2 size-4" />
                  {t("addCondition")}
                </Button>
              </div>

              {/* Remove group button */}
              <div className="mt-2 flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => removeGroup(groupIdx)}
                >
                  {t("removeGroup")}
                </Button>
              </div>
            </Card>
          </div>
        ))
      )}

      {/* Add OR group */}
      <Button size="sm" variant="outline" onClick={addGroup} className="self-start">
        <Plus className="mr-2 size-4" />
        {t("addGroup")}
      </Button>
    </div>
  );
}
